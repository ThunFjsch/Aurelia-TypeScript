import { Objective, roleContants } from "objectives/objectiveInterfaces";
import { priority, Priority } from "utils/sharedTypes";
import { MemoryService } from "./memory.service";
import { RCL } from "roomManager/constructionManager";

export type ResRole = 'pickup' | 'transfer' | 'withdrawl';
const eStorageLimit = [0, 0, 0, 0, 10000, 15000, 30000, 60000, 100000];

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
}

export declare type ContiainerType = roleContants.FASTFILLER | roleContants.MINING | roleContants.UPGRADING

declare type StructuresToRefill = StructureSpawn | StructureExtension | StructureTower | StructureContainer | StructureStorage;
declare type withdrawlToTakeFrom = Ruin | AnyStoreStructure | Tombstone;

export class ResourceService {
    taskList: Task[] = [];
    memoryService: MemoryService;
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
        if(spawn === undefined) return;

        let prio: Priority = priority.medium;
        if (rcl === 4 && storage != undefined) {
            this.generateERequests(creeps, avgHauler, haulCapacity, prio, room, structures as AnyStoreStructure[], spawn)
        } else {
            this.generateERequests(creeps, avgHauler, haulCapacity, prio, room, structures as AnyStoreStructure[], spawn)
        }

        if(objectives.length != 0){
            for(let objective of objectives){
                const remoteRoom = Game.rooms[objective.target];
                if(remoteRoom === undefined) continue;

                this.generateERequests(creeps, avgHauler, haulCapacity, prio, remoteRoom, [], spawn)
            }
        }
    }

    generateERequests(creeps: Creep[], avgHauler: number, haulCapacity: number, prio: Priority, room: Room, structures: AnyStoreStructure[], spawn: StructureSpawn) {
        room.find(FIND_DROPPED_RESOURCES)
            .filter(res => res.resourceType === RESOURCE_ENERGY)
            .sort((a, b) => (a.amount * (spawn.pos.getRangeTo(a.pos.x, a.pos.y) ?? 1))
                - (b.amount * (spawn.pos.getRangeTo(a.pos.x, a.pos.y) ?? 1)))
            .forEach(res => {
                this.updateCreatePickups(res, avgHauler, haulCapacity, priority.low);
            });

        this.generateEWithdrawlRequets(room.find(FIND_TOMBSTONES), avgHauler, priority.severe);
        this.generateEWithdrawlRequets(room.find(FIND_RUINS), avgHauler, priority.severe);
        this.generateETransferRequests(creeps, avgHauler, structures, room);

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
                        this.updateCreateWithdrawlRequest(container as StructureContainer, avgHauler, priority.severe)
                    } else if (memory != undefined && memory.type === roleContants.UPGRADING) {
                        this.updateCreateTransfer(container as StructureContainer, avgHauler, priority.low)
                    } else if (memory != undefined && memory?.type === roleContants.FASTFILLER) {
                        this.updateCreateTransfer(container as StructureContainer, avgHauler, priority.high)
                    }
                }
            })
        }
        this.taskList.sort((a, b) => a.priority - b.priority)
    }

    generateEWithdrawlRequets(elements: withdrawlToTakeFrom[], avgHauler: number, prio: Priority) {
        elements.filter(item => item.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
            .sort((a, b) => (a.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0 * (a.room?.find(FIND_MY_SPAWNS)[0].pos.getRangeTo(a.pos.x, a.pos.y) ?? 1))
                - (b.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0 * (a.room?.find(FIND_MY_SPAWNS)[0].pos.getRangeTo(a.pos.x, a.pos.y) ?? 1)))
            .forEach(item => {
                this.updateCreateWithdrawlRequest(item, avgHauler, prio)
            });

    }

    generateETransferRequests(creeps: Creep[], avgHauler: number, structures: AnyStoreStructure[], room: Room) {
        creeps.filter(creep => (creep.memory.role === roleContants.UPGRADING || creep.memory.role === roleContants.BUILDING) && creep.memory.home === room.name)
            .forEach(creep => {
                let prio: Priority = priority.medium
                if (creep.memory.role === roleContants.UPGRADING) prio = priority.veryLow
                this.updateCreateTransfer(creep, avgHauler, prio)
            })
        // Container and Storage is here not included. These are processes seperatly
        structures.filter(structure => structure.structureType === STRUCTURE_EXTENSION || structure.structureType === STRUCTURE_SPAWN || structure.structureType === STRUCTURE_TOWER)
            .forEach((structure) => {
                let prio: Priority = priority.high;
                if (structure.structureType === STRUCTURE_SPAWN) prio = priority.severe;
                this.updateCreateTransfer(structure as StructuresToRefill, avgHauler, prio)
            })


    }

    storageRequests(storage: StructureStorage, rcl: RCL, avgHauler: number) {
        if (storage != undefined) {
            let amount = storage.store.getUsedCapacity(RESOURCE_ENERGY);
            if (amount > eStorageLimit[rcl]) {
                amount = eStorageLimit[rcl]
            }

            if (storage.store.getUsedCapacity(RESOURCE_ENERGY) < eStorageLimit[rcl]) {
                let trips: number = this.getTrips(amount, avgHauler)
                const existingTask = this.taskList.find(task => task.targetId === storage.id);
                if (existingTask != undefined) {
                    existingTask.maxAssigned = trips;
                    existingTask.amount = amount
                } else {
                    const newTask: Task = {
                        id: storage.id,
                        targetId: storage.id,
                        assigned: [],
                        maxAssigned: trips,
                        priority: priority.medium,
                        transferType: 'transfer',
                        amount: amount,
                        ResourceType: RESOURCE_ENERGY,
                        StructureType: storage.structureType
                    };

                    this.taskList.push(newTask);
                }
            } else if (storage.store.getUsedCapacity(RESOURCE_ENERGY) > (eStorageLimit[rcl] / 2)) {

                let trips: number = this.getTrips(amount, avgHauler)
                const existingTask = this.taskList.find(task => task.targetId === storage.id);
                if (existingTask != undefined) {
                    existingTask.maxAssigned = trips;
                    existingTask.amount = amount
                } else {
                    const newTask: Task = {
                        id: storage.id,
                        targetId: storage.id,
                        assigned: [],
                        maxAssigned: trips,
                        priority: priority.high,
                        transferType: 'withdrawl',
                        amount: amount,
                        ResourceType: RESOURCE_ENERGY,
                        StructureType: storage.structureType
                    };

                    this.taskList.push(newTask);
                }
            }
        }
    }

    updateCreateWithdrawlRequest(target: withdrawlToTakeFrom, avgHauler: number, prio: Priority) {
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
                StructureType: strucType
            };

            this.taskList.push(newTask);
        }
    }

    private updateCreateTransfer(struc: StructuresToRefill | Creep, avgHauler: number, prio: Priority = priority.medium) {
        let trips: number = this.getTrips(struc.store.getFreeCapacity(RESOURCE_ENERGY), avgHauler)
        const amount = struc.store.getFreeCapacity(RESOURCE_ENERGY);
        const existingTask = this.taskList.find(task => task.targetId === struc.id);
        if (existingTask != undefined) {
            existingTask.maxAssigned = trips;
            existingTask.amount = amount
        } else {
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
                StructureType: (struc as AnyStoreStructure).structureType
            };

            this.taskList.push(newTask);
        }
    }

    private updateCreatePickups(res: Resource, avgHauler: number, haulCapacity: number, prio: Priority) {
        let trips: number = this.getTrips(res.amount, avgHauler)
        if (trips > 10) {
            trips = Math.round(trips) / 2;
        }

        if (res.amount > ((haulCapacity * CARRY_CAPACITY) / 2)) {
            prio = priority.high;
        }

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
                StructureType: undefined
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
        const rcl = creep.room.controller?.level?? 0;
        // const list = this.taskList.sort((a,b) => a)

        for (const task of this.taskList) {
            if (task.assigned.length < task.maxAssigned && task.transferType === type) {
                const hasFastFiller = Object.entries(Game.creeps).find(item => item[1].memory.role === roleContants.FASTFILLER && item[1].memory.home === creep.memory.home);
                if(rcl >= 3 && hasFastFiller != undefined){
                    if(creep.memory.role === roleContants.HAULING && task.StructureType != undefined && task.StructureType === STRUCTURE_EXTENSION) continue;
                }
                task.assigned.push(creep.name);
                return task.targetId;
            }
        }
        return undefined;
    }

    removeFromTask(creep: Creep, target: Resource | Creep | Structure | Tombstone | Ruin) {
        let i = 0;
        this.taskList.forEach(task => {
            if (task.id === target.id && task.assigned.find(ass => ass === creep.name)) {
                let currAssignee: string[] = []
                this.taskList[i].assigned.forEach(ass => {
                    if (ass != creep.name) {
                        currAssignee.push(ass)
                    }
                })
                this.taskList[i].assigned = currAssignee
            }
            i++
        })
    }
}
