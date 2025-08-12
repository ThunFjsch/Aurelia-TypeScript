import { roleContants } from "objectives/objectiveInterfaces";
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
    ResourceType: ResourceConstant;
}

export declare type ContiainerType = roleContants.FASTFILLER | roleContants.MINING | roleContants.UPGRADING

declare type StructuresToRefill = StructureSpawn | StructureExtension | StructureTower | StructureContainer | StructureStorage;

export class ResourceService {
    taskList: Task[] = [];
    memoryService: MemoryService;
    constructor(MemoryService: MemoryService) {
        this.memoryService = MemoryService
    }

    run(room: Room, haulCapacity: number, avgHauler: number, creeps: Creep[]) {
        this.cleanUp();

        const rcl: RCL = (room.controller?.level ?? 0) as RCL;

        let prio: Priority = priority.medium;
        const droppedRes = room.find(FIND_DROPPED_RESOURCES);
        droppedRes
            .filter(res => res.resourceType === RESOURCE_ENERGY)
            .sort((a, b) => (a.amount * (a.room?.find(FIND_MY_SPAWNS)[0].pos.getRangeTo(a.pos.x, a.pos.y) ?? 1)) - (b.amount * (a.room?.find(FIND_MY_SPAWNS)[0].pos.getRangeTo(a.pos.x, a.pos.y) ?? 1)))
            .forEach(res => {
                this.updateCreatePickups(res, avgHauler, haulCapacity, prio);
            });

        room.find(FIND_TOMBSTONES).filter(tomb => tomb.store.getUsedCapacity(RESOURCE_ENERGY) > 0)
            .sort((a, b) => (a.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0 * (a.room?.find(FIND_MY_SPAWNS)[0].pos.getRangeTo(a.pos.x, a.pos.y) ?? 1)) - (b.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0 * (a.room?.find(FIND_MY_SPAWNS)[0].pos.getRangeTo(a.pos.x, a.pos.y) ?? 1)))
            .forEach(tomb => {
                this.updateCreateWithdrawlRequest(tomb, avgHauler, priority.severe)
            });

        room.find(FIND_RUINS).filter(ruin => ruin.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0 > 0)
            .sort((a, b) => (a.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0 * (a.room?.find(FIND_MY_SPAWNS)[0].pos.getRangeTo(a.pos.x, a.pos.y) ?? 1)) - (b.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0 * (a.room?.find(FIND_MY_SPAWNS)[0].pos.getRangeTo(a.pos.x, a.pos.y) ?? 1)))
            .forEach(ruin => {
                this.updateCreateWithdrawlRequest(ruin, avgHauler, priority.severe)
            });

        this.taskList.sort((a, b) => a.priority - b.priority)

        creeps.filter(creep => (creep.memory.role === roleContants.UPGRADING || creep.memory.role === roleContants.BUILDING) && creep.memory.home === room.name)
            .forEach(creep => {
                let prio: Priority = priority.high
                if (creep.memory.role === roleContants.UPGRADING) prio = priority.veryLow
                this.updateCreateCreepTransfer(creep, avgHauler, prio)
            })

        const myStructures = room.find(FIND_MY_STRUCTURES);
        myStructures.filter(structure => structure.structureType === STRUCTURE_EXTENSION || structure.structureType === STRUCTURE_SPAWN || structure.structureType === STRUCTURE_TOWER)
            .forEach((structure) => {
                let prio: Priority = priority.high;
                if (structure.structureType === STRUCTURE_SPAWN) prio = priority.high;
                this.updateCreateStructureTransfer(structure as StructuresToRefill, avgHauler, prio)
            })

        const storage = room.find(FIND_MY_STRUCTURES).find(structure => structure.structureType === STRUCTURE_STORAGE) as StructureStorage
        this.storageRequests(storage, rcl, avgHauler);

        const structures = room.find(FIND_STRUCTURES);
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
                        this.updateCreateWithdrawlRequest(container as StructureContainer, avgHauler, priority.medium)
                    } else if (memory != undefined && memory.type === roleContants.UPGRADING || memory?.type === roleContants.FASTFILLER) {
                        this.updateCreateStructureTransfer(container as StructureContainer, avgHauler, priority.low)
                    }
                }
            })
        }
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
                        ResourceType: RESOURCE_ENERGY
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
                        ResourceType: RESOURCE_ENERGY
                    };

                    this.taskList.push(newTask);
                }
            }
        }
    }

    updateCreateWithdrawlRequest(target: Tombstone | Ruin | StructureContainer | StructureStorage, avgHauler: number, prio: Priority) {
        let trips: number = this.getTrips(target.store.getUsedCapacity(RESOURCE_ENERGY), avgHauler)
        const amount = target.store.getUsedCapacity(RESOURCE_ENERGY);
        const existingTask = this.taskList.find(task => task.targetId === target.id);
        if (existingTask != undefined) {
            existingTask.maxAssigned = trips;
            existingTask.amount = amount
        } else {
            // Create new task
            const newTask: Task = {
                id: target.id,
                targetId: target.id,
                assigned: [],
                maxAssigned: trips,
                priority: prio,
                transferType: 'withdrawl',
                amount: amount,
                ResourceType: RESOURCE_ENERGY
            };

            this.taskList.push(newTask);
        }
    }

    private updateCreateStructureTransfer(struc: StructuresToRefill, avgHauler: number, prio: Priority = priority.medium) {
        let trips: number = this.getTrips(struc.store.getFreeCapacity(RESOURCE_ENERGY), avgHauler)
        const amount = struc.store.getUsedCapacity(RESOURCE_ENERGY) - (struc.store.getCapacity() ?? 0);
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
                ResourceType: RESOURCE_ENERGY
            };

            this.taskList.push(newTask);
        }
    }

    private updateCreateCreepTransfer(creep: Creep, avgHauler: number, prio: Priority) {
        let trips: number = this.getTrips(creep.store.getFreeCapacity(RESOURCE_ENERGY), avgHauler)
        const amount = creep.store.getFreeCapacity(RESOURCE_ENERGY);
        const existingTask = this.taskList.find(task => task.targetId === creep.id);
        if (existingTask != undefined) {
            existingTask.maxAssigned = trips;
            existingTask.amount = amount
        } else {
            // Create new task
            const newTask: Task = {
                id: creep.id,
                targetId: creep.id,
                assigned: [],
                maxAssigned: trips,
                priority: prio,
                transferType: 'transfer',
                amount: amount,
                ResourceType: RESOURCE_ENERGY
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
                ResourceType: RESOURCE_ENERGY
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
        for (const task of this.taskList) {
            if (task.assigned.length < task.maxAssigned && task.transferType === type) {
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
