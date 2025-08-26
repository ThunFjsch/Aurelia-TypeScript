import { Objective, roleContants } from "objectives/objectiveInterfaces";
import { priority, Priority } from "utils/sharedTypes";
import { MemoryService } from "./memory.service";
import { RCL } from "roomManager/constructionManager";
import { PathingService } from "./pathing.service";

export type ResRole = 'pickup' | 'transfer' | 'withdrawl';
const eStorageLimit = [0, 0, 0, 0, 25000, 50000, 100000, 150000, 200000];

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
    distance: number
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
        this.storageRequests(storage, rcl, avgHauler);
        const structures = room.find(FIND_STRUCTURES);

        const spawn = room.find(FIND_MY_SPAWNS)[0];
        if (spawn === undefined) return;

        let prio: Priority = priority.medium;
        if (rcl === 4 && storage != undefined) {
            this.generateERequests(creeps, avgHauler, haulCapacity, prio, room, structures as AnyStoreStructure[], spawn)
        } else {
            this.generateERequests(creeps, avgHauler, haulCapacity, prio, room, structures as AnyStoreStructure[], spawn)
        }

        if (objectives.length != 0) {
            for (let objective of objectives) {
                const remoteRoom = Game.rooms[objective.target];
                if (remoteRoom === undefined) continue;

                this.generateERequests(creeps, avgHauler, haulCapacity, prio, remoteRoom, [], spawn)
            }
        }

        this.taskList.sort((a, b) => (b.amount / (b.distance * (b.priority * 10))) - (a.amount / (a.distance * (a.priority * 10))))
    }

    generateERequests(creeps: Creep[], avgHauler: number, haulCapacity: number, prio: Priority, room: Room, structures: AnyStoreStructure[], spawn: StructureSpawn) {
        room.find(FIND_DROPPED_RESOURCES)
            .filter(res => res.resourceType === RESOURCE_ENERGY)
            .sort((a, b) => (a.amount * (spawn.pos.getRangeTo(a.pos.x, a.pos.y) ?? 1))
                - (b.amount * (spawn.pos.getRangeTo(a.pos.x, a.pos.y) ?? 1)))
            .forEach(res => {
                this.updateCreatePickups(res, avgHauler, haulCapacity, priority.low, spawn);
            });

        this.generateEWithdrawlRequets(room.find(FIND_TOMBSTONES), avgHauler, priority.severe, spawn);
        this.generateEWithdrawlRequets(room.find(FIND_RUINS), avgHauler, priority.severe, spawn);
        this.generateETransferRequests(creeps, avgHauler, structures, room, spawn);

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
                        this.updateCreateWithdrawlRequest(container as StructureContainer, avgHauler, priority.severe, spawn)
                    } else if (memory != undefined && memory.type === roleContants.UPGRADING) {
                        this.updateCreateTransfer(container as StructureContainer, avgHauler, spawn, priority.veryLow)
                    } else if (memory != undefined && memory?.type === roleContants.FASTFILLER) {
                        this.updateCreateTransfer(container as StructureContainer, avgHauler, spawn, priority.severe)
                    }
                }
            })
        }
    }

    generateEWithdrawlRequets(elements: withdrawlToTakeFrom[], avgHauler: number, prio: Priority, spawn: StructureSpawn) {
        elements.filter(item => item.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
            .sort((a, b) => (a.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0 * (a.room?.find(FIND_MY_SPAWNS)[0].pos.getRangeTo(a.pos.x, a.pos.y) ?? 1))
                - (b.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0 * (a.room?.find(FIND_MY_SPAWNS)[0].pos.getRangeTo(a.pos.x, a.pos.y) ?? 1)))
            .forEach(item => {
                this.updateCreateWithdrawlRequest(item, avgHauler, prio, spawn)
            });

    }

    generateETransferRequests(creeps: Creep[], avgHauler: number, structures: AnyStoreStructure[], room: Room, spawn: StructureSpawn) {
        creeps.filter(creep => creep.memory.role === roleContants.UPGRADING && creep.memory.home === room.name)
            .forEach(creep => {
                let prio: Priority = priority.medium
                if (creep.memory.role === roleContants.UPGRADING) prio = priority.veryLow
                this.updateCreateTransfer(creep, avgHauler, spawn, prio)
            })
        creeps.filter(creep => creep.memory.role === roleContants.BUILDING && creep.memory.home === room.name)
            .forEach(creep => {
                let prio: Priority = priority.low
                this.updateCreateTransfer(creep, avgHauler, spawn, prio)
            })
        // Container and Storage is here not included. These are processes seperatly
        structures.filter(structure => structure.structureType === STRUCTURE_EXTENSION || structure.structureType === STRUCTURE_SPAWN || structure.structureType === STRUCTURE_TOWER || structure.structureType === STRUCTURE_LAB)
            .forEach((structure) => {
                let prio: Priority = priority.high;
                if (structure.structureType === STRUCTURE_SPAWN && room.find(FIND_STRUCTURES).filter(s => s.structureType === STRUCTURE_CONTAINER).length === 0) prio = priority.severe;
                if (structure.structureType === STRUCTURE_TOWER) prio = priority.severe;
                this.updateCreateTransfer(structure as StructuresToRefill, avgHauler, spawn, prio)
            })
    }

    storageRequests(storage: StructureStorage, rcl: RCL, avgHauler: number) {
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
                    distance: 15
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
                    distance: 1
                };

                this.taskList.push(newTask);
            }
        }
    }

    updateCreateWithdrawlRequest(target: withdrawlToTakeFrom, avgHauler: number, prio: Priority, spawn: StructureSpawn) {
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
                distance: route?.cost ?? 1
            };

            this.taskList.push(newTask);
        }
    }

    private updateCreateTransfer(struc: StructuresToRefill | Creep, avgHauler: number, spawn: StructureSpawn, prio: Priority = priority.low) {
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
                console.log((struc as Creep).name)
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
                distance: route.cost
            };

            this.taskList.push(newTask);
        }
    }

    private updateCreatePickups(res: Resource, avgHauler: number, haulCapacity: number, prio: Priority, spawn: StructureSpawn) {
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
                distance: route.cost
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

    assignToTask(creep: Creep, type: ResRole): string | undefined {
        const rcl = creep.room.controller?.level ?? 0;

        this.cleanTasks(creep)
const hasFastFiller = Object.entries(Game.creeps).filter(item => item[1].memory.role === roleContants.FASTFILLER && item[1].memory.home === creep.memory.home);
        for (const task of this.taskList) {
            if(creep.store.getFreeCapacity(RESOURCE_ENERGY)/2 > task.amount) continue;
            if (task.assigned.length < task.maxAssigned && task.transferType === type) {
                if (creep.memory.role === roleContants.PORTING) {
                    if (task.transferType === "pickup") continue;
                    if (task.transferType === "withdrawl" && task.StructureType != STRUCTURE_STORAGE) continue;
                    if (task.StructureType != undefined && task.StructureType === STRUCTURE_EXTENSION && hasFastFiller != undefined) continue;
                    if (task.transferType === "transfer" && task.StructureType != undefined && task.StructureType === STRUCTURE_STORAGE) continue;
                }
                else if (creep.memory.role === roleContants.HAULING) {

                    const hasPorter = Object.entries(Game.creeps).filter(item => item[1].memory.role === roleContants.PORTING && item[1].memory.home === creep.memory.home);
                    if (task.StructureType != undefined && task.StructureType === STRUCTURE_STORAGE && task.transferType === "withdrawl") continue;
                    if (rcl > 2 && hasFastFiller != undefined && hasPorter != undefined && hasFastFiller.length < 2 && hasPorter.length < 3) {
                        if (task.StructureType != undefined && (task.StructureType === STRUCTURE_EXTENSION || task.StructureType === STRUCTURE_SPAWN)) continue;
                        if (rcl > 3 && creep.room.storage) {
                            if (task.StructureType != undefined && task.StructureType === STRUCTURE_CONTAINER && task.transferType === "transfer") continue;
                            if (task.StructureType != undefined && task.StructureType === STRUCTURE_LAB) continue;
                        };
                    }
                }
                else if (creep.memory.role === roleContants.MAINTAINING) {
                    if (rcl > 4) {
                        if (task.StructureType != undefined && task.StructureType != STRUCTURE_STORAGE && task.transferType === "withdrawl") continue;
                        if (task.transferType === "pickup") continue;
                    }

                }
                task.assigned.push(creep.name);
                return task.targetId;
            }
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
