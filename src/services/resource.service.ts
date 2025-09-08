import { Objective, roleContants } from "objectives/objectiveInterfaces";
import { priority, Priority } from "utils/sharedTypes";
import { MemoryService } from "./memory.service";
import { RCL } from "roomManager/constructionManager";
import { PathingService } from "./pathing.service";
import { getRoomCreepCounts } from "utils/global-helper";

export type ResRole = 'pickup' | 'transfer' | 'withdrawl';
const eStorageLimit = [0, 0, 0, 0, 15000, 50000, 100000, 150000, 200000];

export interface Task {
    id: string;              // Resource ID
    targetId: string;        // Resource ID (same as above for now)
    priority: Priority;
    assigned: string[];      // Array of creep names
    maxAssigned: number;
    transferType: ResRole;
    amount: number;
    StructureType: StructureConstant | undefined
    ResourceType: ResourceConstant;
    distance: number;
    home: string;
}

export declare type ContiainerType = roleContants.FASTFILLER | roleContants.MINING | roleContants.UPGRADING

declare type StructuresToRefill = StructureSpawn | StructureExtension | StructureTower | StructureContainer | StructureStorage;
declare type withdrawlToTakeFrom = Ruin | AnyStoreStructure | Tombstone;

export class ResourceService {
    taskList: Task[] = [];
    memoryService: MemoryService;
    private pathingService = new PathingService()

    constructor(MemoryService: MemoryService) {
        this.memoryService = MemoryService
    }

    run(room: Room, haulCapacity: number, avgHauler: number, creeps: Creep[], objectives: Objective[]) {
        this.cleanUp();

        const rcl: RCL = (room.controller?.level ?? 0) as RCL;

        const storage = room.find(FIND_MY_STRUCTURES).find(structure => structure.structureType === STRUCTURE_STORAGE) as StructureStorage
        this.storageRequests(storage, rcl, avgHauler, room.name);
        const structures = room.find(FIND_STRUCTURES);

        const spawn = room.find(FIND_MY_SPAWNS)[0];
        if (spawn === undefined) return;

        let prio: Priority = priority.medium;
        if (rcl === 4 && storage != undefined) {
            this.generateERequests(creeps, avgHauler, haulCapacity, prio, room, structures as AnyStoreStructure[], spawn, room.name)
        } else {
            this.generateERequests(creeps, avgHauler, haulCapacity, prio, room, structures as AnyStoreStructure[], spawn, room.name)
        }

        if (objectives.length != 0) {
            for (let objective of objectives) {
                const remoteRoom = Game.rooms[objective.target];
                if (remoteRoom === undefined) continue;

                this.generateERequests(creeps, avgHauler, haulCapacity, prio, remoteRoom, [], spawn, room.name)
            }
        }

        this.taskList.sort((a, b) => (b.amount / (b.distance * (b.priority * 10))) - (a.amount / (a.distance * (a.priority * 10))))
    }

    generateERequests(creeps: Creep[], avgHauler: number, haulCapacity: number, prio: Priority, room: Room, structures: AnyStoreStructure[], spawn: StructureSpawn, home: string) {
        room.find(FIND_DROPPED_RESOURCES)
            .filter(res => res.resourceType === RESOURCE_ENERGY)
            .sort((a, b) => (a.amount * (spawn.pos.getRangeTo(a.pos.x, a.pos.y) ?? 1))
                - (b.amount * (spawn.pos.getRangeTo(a.pos.x, a.pos.y) ?? 1)))
            .forEach(res => {
                this.updateCreatePickups(res, avgHauler, haulCapacity, priority.low, spawn, home);
            });

        this.generateEWithdrawlRequets(room.find(FIND_TOMBSTONES), avgHauler, priority.severe, spawn, home);
        this.generateEWithdrawlRequets(room.find(FIND_RUINS), avgHauler, priority.severe, spawn, home);
        this.generateETransferRequests(creeps, avgHauler, structures, room, spawn, home);

        const containers = structures.filter(stucture => stucture.structureType === STRUCTURE_CONTAINER);
        if (containers.length > 0 && room.memory.containers != undefined) {
            containers.forEach(container => {
                let hasMemory = false;
                let memory: ContainerMemory | undefined;
                room.memory.containers.forEach(mem => {
                    if (mem.id === container.id) {
                        hasMemory = true;
                        memory = mem
                    }
                });
                if (hasMemory === false) {
                    this.memoryService.initContainerMemory(container as StructureContainer, room)
                } else {
                    if (memory != undefined && memory.type === roleContants.MINING) {
                        container.store.getCapacity(RESOURCE_ENERGY)
                        this.updateCreateWithdrawlRequest(container as StructureContainer, avgHauler, priority.severe, spawn, home)
                    } else if (memory != undefined && memory.type === roleContants.UPGRADING) {
                        this.updateCreateTransfer(container as StructureContainer, avgHauler, spawn, home, priority.veryLow)
                    } else if (memory != undefined && memory?.type === roleContants.FASTFILLER) {
                        this.updateCreateTransfer(container as StructureContainer, avgHauler, spawn, home, priority.severe)
                    }
                }
            })
        }
    }

    generateEWithdrawlRequets(elements: withdrawlToTakeFrom[], avgHauler: number, prio: Priority, spawn: StructureSpawn, home: string) {
        elements.filter(item => item.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
            .sort((a, b) => (a.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0 * (a.room?.find(FIND_MY_SPAWNS)[0].pos.getRangeTo(a.pos.x, a.pos.y) ?? 1))
                - (b.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0 * (a.room?.find(FIND_MY_SPAWNS)[0].pos.getRangeTo(a.pos.x, a.pos.y) ?? 1)))
            .forEach(item => {
                this.updateCreateWithdrawlRequest(item, avgHauler, prio, spawn, home)
            });

    }

    generateETransferRequests(creeps: Creep[], avgHauler: number, structures: AnyStoreStructure[], room: Room, spawn: StructureSpawn, home: string) {
        creeps.filter(creep => creep.memory.role === roleContants.UPGRADING && creep.memory.home === room.name)
            .forEach(creep => {
                let prio: Priority = priority.medium
                if (creep.memory.role === roleContants.UPGRADING) prio = priority.veryLow
                this.updateCreateTransfer(creep, avgHauler, spawn, home, prio)
            })
        creeps.filter(creep => creep.memory.role === roleContants.BUILDING && creep.memory.home === room.name)
            .forEach(creep => {
                let prio: Priority = priority.high
                this.updateCreateTransfer(creep, avgHauler, spawn, home, prio)
            })
        // Container and Storage is here not included. These are processes seperatly
        structures.filter(structure => structure.structureType === STRUCTURE_EXTENSION || structure.structureType === STRUCTURE_SPAWN || structure.structureType === STRUCTURE_TOWER || structure.structureType === STRUCTURE_LAB)
            .forEach((structure) => {
                let prio: Priority = priority.high;
                if (structure.structureType === STRUCTURE_SPAWN && room.find(FIND_STRUCTURES).filter(s => s.structureType === STRUCTURE_CONTAINER).length === 0) prio = priority.severe;
                if (structure.structureType === STRUCTURE_TOWER) prio = priority.severe;
                this.updateCreateTransfer(structure as StructuresToRefill, avgHauler, spawn, home, prio)
            })
    }

    storageRequests(storage: StructureStorage, rcl: RCL, avgHauler: number, home: string) {
        if (storage === undefined) return;
        let amount = storage.store.getFreeCapacity(RESOURCE_ENERGY);
        if (amount > eStorageLimit[rcl]) {
            amount = eStorageLimit[rcl]
        }

        if (storage.store.getUsedCapacity(RESOURCE_ENERGY) < eStorageLimit[rcl]) {
            amount = (amount - storage.store.getUsedCapacity(RESOURCE_ENERGY));
            let trips: number = this.getTrips(amount, avgHauler)
            const existingTask = this.taskList.find(task => task.id === storage.id + "transfer");
            if (existingTask != undefined) {
                existingTask.maxAssigned = trips;
                existingTask.amount = amount;
            } else {
                const newTask: Task = {
                    id: storage.id + "transfer",
                    targetId: storage.id,
                    assigned: [],
                    maxAssigned: trips,
                    priority: priority.veryLow,
                    transferType: 'transfer',
                    amount: amount,
                    ResourceType: RESOURCE_ENERGY,
                    StructureType: storage.structureType,
                    distance: 30,
                    home
                };

                this.taskList.push(newTask);
            }
        }
        if (storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            amount = storage.store.getUsedCapacity(RESOURCE_ENERGY);
            let trips: number = this.getTrips(amount, avgHauler)
            const existingTask = this.taskList.find(task => task.id === storage.id + "withdrawl");
            if (existingTask != undefined) {
                existingTask.maxAssigned = trips;
                existingTask.amount = amount
            } else {
                const newTask: Task = {
                    id: storage.id + "withdrawl",
                    targetId: storage.id,
                    assigned: [],
                    maxAssigned: trips,
                    priority: priority.high,
                    transferType: 'withdrawl',
                    amount: amount,
                    ResourceType: RESOURCE_ENERGY,
                    StructureType: storage.structureType,
                    distance: 1,
                    home
                };

                this.taskList.push(newTask);
            }
        }
    }

    updateCreateWithdrawlRequest(target: withdrawlToTakeFrom, avgHauler: number, prio: Priority, spawn: StructureSpawn, home: string) {
        const route = this.pathingService.findPath(spawn.pos, target.pos);
        if (route === undefined) return;
        let trips: number = this.getTrips(target.store.getUsedCapacity(RESOURCE_ENERGY), avgHauler)
        const amount = target.store.getUsedCapacity(RESOURCE_ENERGY);
        const existingTask = this.taskList.find(task => task.targetId === target.id);
        if (existingTask != undefined) {
            existingTask.maxAssigned = trips;
            existingTask.amount = amount
        } else {
            let strucType = undefined;
            if ((target as AnyStoreStructure).structureType != undefined) {
                strucType = (target as AnyStoreStructure).structureType;
            }
            // Create new task
            const newTask: Task = {
                id: target.id,
                targetId: target.id,
                assigned: [],
                maxAssigned: trips,
                priority: prio,
                transferType: 'withdrawl',
                amount: amount,
                ResourceType: RESOURCE_ENERGY,
                StructureType: strucType,
                distance: route?.cost ?? 1,
                home
            };

            this.taskList.push(newTask);
        }
    }

    private updateCreateTransfer(struc: StructuresToRefill | Creep, avgHauler: number, spawn: StructureSpawn, home: string, prio: Priority = priority.low) {
        const route = this.pathingService.findPath(spawn.pos, struc.pos);
        if (route === undefined) return;
        let trips: number = this.getTrips(struc.store.getFreeCapacity(RESOURCE_ENERGY), avgHauler)
        const amount = struc.store.getFreeCapacity(RESOURCE_ENERGY);
        const existingTask = this.taskList.find(task => task.targetId === struc.id);
        if (existingTask != undefined) {
            existingTask.maxAssigned = trips;
            existingTask.amount = amount
        } else {
            if ((struc as Creep).name != undefined) {
                route.cost += 50
            }
            // Create new task
            const newTask: Task = {
                id: struc.id,
                targetId: struc.id,
                assigned: [],
                maxAssigned: trips,
                priority: prio,
                transferType: 'transfer',
                amount: amount,
                ResourceType: RESOURCE_ENERGY,
                StructureType: (struc as AnyStoreStructure).structureType,
                distance: route.cost,
                home
            };

            this.taskList.push(newTask);
        }
    }

    private updateCreatePickups(res: Resource, avgHauler: number, haulCapacity: number, prio: Priority, spawn: StructureSpawn, home: string) {
        const route = this.pathingService.findPath(spawn.pos, res.pos);
        if (route === undefined) return;
        let trips: number = this.getTrips(res.amount, avgHauler)
        if (trips > 10) {
            trips = Math.round(trips) / 2;
        }

        // if (res.amount > ((haulCapacity * CARRY_CAPACITY) / 2)) {
        //     prio = priority.high;
        // }

        const existingTask = this.taskList.find(task => task.targetId === res.id);

        if (existingTask) {
            // Update existing task
            existingTask.maxAssigned = trips;
            existingTask.priority = prio;
            existingTask.amount = res.amount
        } else {
            // Create new task
            const newTask: Task = {
                id: res.id,
                targetId: res.id,
                assigned: [],
                maxAssigned: trips,
                priority: prio,
                transferType: 'pickup',
                amount: res.amount,
                ResourceType: RESOURCE_ENERGY,
                StructureType: undefined,
                distance: route.cost,
                home
            };

            this.taskList.push(newTask);
        }
    }

    getTrips(capacity: number, avgHauler: number) {
        return capacity / (avgHauler * CARRY_CAPACITY);

    }

    cleanUp() {
        this.taskList = this.taskList.filter(task => Game.getObjectById(task.targetId) != null);
    }

    private getValidTasksForCreep(creep: Creep, type: ResRole, hasFastFiller: boolean, hasPorter: boolean): Task[] {
        const rcl = creep.room.controller?.level ?? 0;
        const role = creep.memory.role;

        return this.taskList.filter(task => {
            if (creep.memory.home !== task.home) return false;
            if (creep.store.getFreeCapacity(RESOURCE_ENERGY) / 4 > task.amount && task.transferType === "withdrawl") return false;
            if (task.assigned.length >= task.maxAssigned) return false;
            if (task.transferType !== type) return false;

            // Role-specific filters
            switch (role) {
                case roleContants.PORTING:
                    return this.isValidPortingTask(task, hasFastFiller);
                case roleContants.HAULING:
                    return this.isValidHaulingTask(task, rcl, hasFastFiller, hasPorter);
                case roleContants.MAINTAINING:
                    return this.isValidMaintenanceTask(task, rcl);
                default:
                    return true;
            }
        });
    }

    private isValidHaulingTask(task: Task, rcl: number, hasFastFiller: boolean, hasPorter: boolean): boolean {
        if (rcl > 2 && hasFastFiller && hasPorter) {
            if (task.StructureType === STRUCTURE_STORAGE && task.transferType === "withdrawl") return false;
            if (rcl > 3 && Game.rooms[task.home].storage) {
                if (task.StructureType === STRUCTURE_CONTAINER && task.transferType === "transfer") return false;
                if (task.StructureType === STRUCTURE_LAB) return false;
            }
            if (task.StructureType === STRUCTURE_EXTENSION || task.StructureType === STRUCTURE_SPAWN) return false;
        } else if(!hasFastFiller && !hasPorter){
            if (task.StructureType === STRUCTURE_STORAGE && task.transferType === "transfer") return false;
            if (task.StructureType === STRUCTURE_CONTAINER && task.transferType === "transfer") return false;
        } else{
            if (task.StructureType === STRUCTURE_STORAGE && task.transferType === "transfer") return false;
        }

        return true;
    }

    private isValidPortingTask(task: Task, hasFastFiller: boolean): boolean {
        if (task.transferType === "pickup") return false;
        if (task.transferType === "withdrawl" && task.StructureType != STRUCTURE_STORAGE) return false;
        if (task.StructureType != undefined && task.StructureType === STRUCTURE_EXTENSION && hasFastFiller != undefined) return false;
        if (task.transferType === "transfer" && task.StructureType != undefined && task.StructureType === STRUCTURE_STORAGE) return false;

        return true;
    }

    private isValidMaintenanceTask(task: Task, rcl: number): boolean {
        if (rcl > 4) {
            if (task.StructureType != undefined && task.StructureType != STRUCTURE_STORAGE && task.transferType === "withdrawl") return false;
            if (task.transferType === "pickup") return false;
        }

        return true;
    }

    // Simplified assignToTask
    assignToTask(creep: Creep, type: ResRole): string | undefined {
        this.cleanTasks(creep);

        const counts = getRoomCreepCounts(creep.memory.home);
        const hasFastFiller = (counts[roleContants.FASTFILLER] || 0) > 2;
        const hasPorter = (counts[roleContants.PORTING] || 0) > 3;
            // console.log(hasFastFiller, hasPorter)
        const validTasks = this.getValidTasksForCreep(creep, type, hasFastFiller, hasPorter);

        for (const task of validTasks) {
            task.assigned.push(creep.name);
            return task.targetId;
        }

        return undefined;
    }

    cleanTasks(creep: Creep) {
        this.taskList.forEach(task => {
            let newAssigned: string[] = []
            task.assigned.forEach(name => {
                if (name != null && name != creep.name && name != undefined && Game.creeps[name] != undefined) {
                    newAssigned.push(name)
                }
            });
            task.assigned = newAssigned;
        })
    }
}
