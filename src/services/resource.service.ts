import { Objective, roleContants } from "objectives/objectiveInterfaces";
import { priority, Priority } from "utils/sharedTypes";
import { MemoryService } from "./memory.service";
import { RCL } from "roomManager/constructionManager";
import { PathingService } from "./pathing.service";
import { getRoomCreepCounts } from "utils/global-helper";
import { HaulerMemory } from "creeps/hauling";

export type ResRole = 'pickup' | 'transfer' | 'withdrawl';
export const eStorageLimit = [0, 0, 0, 200000, 200000, 200000, 200000, 200000, 200000];

export interface Task {
    id: string;
    targetId: string;
    roomName: string;
    priority: Priority;
    assigned: string[];
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

// Cache for distance calculations
interface DistanceCache {
    [key: string]: number;
}

// Aggregated room data to avoid repeated find() calls
interface RoomData {
    spawn: StructureSpawn;
    storage: StructureStorage | undefined;
    structures: AnyStoreStructure[];
    containers: StructureContainer[];
    containerMemory: Map<string, ContainerMemory>;
    droppedEnergy: Resource[];
    tombstones: Tombstone[];
    ruins: Ruin[];
}

// Cache structure for room data
interface RoomDataCache {
    data: RoomData;
    tick: number;
}

export class ResourceService {
    taskList: Task[] = [];
    memoryService: MemoryService;
    private pathingService = new PathingService();
    private distanceCache: DistanceCache = {};
    private pathCache: Map<string, number> = new Map();

    // Pre-sorted creep data from main loop
    private creepsByRoom: Map<string, Creep[]> | null = null;
    private creepsByRole: Map<string, Creep[]> | null = null;

    // Room data caching
    private roomDataCache: Map<string, RoomDataCache> = new Map();

    constructor(MemoryService: MemoryService) {
        this.memoryService = MemoryService;
    }

    /**
     * Called from main loop to provide pre-sorted creep data
     */
    setCreepsByRoom(creepsByRoom: Map<string, Creep[]>): void {
        this.creepsByRoom = creepsByRoom;
    }

    /**
     * Called from main loop to provide creeps indexed by role
     */
    setCreepsByRole(creepsByRole: Map<string, Creep[]>): void {
        this.creepsByRole = creepsByRole;
    }

    /**
     * Get creeps in a specific room - uses pre-sorted data
     */
    private getCreepsInRoom(roomName: string): Creep[] {
        if (this.creepsByRoom) {
            return this.creepsByRoom.get(roomName) || [];
        }

        // Fallback if pre-sorted data isn't available
        const room = Game.rooms[roomName];
        return room ? room.find(FIND_MY_CREEPS) : [];
    }

    /**
     * Get creeps by role - uses pre-sorted data
     */
    private getCreepsByRole(role: string, roomName?: string): Creep[] {
        if (this.creepsByRole) {
            const roleCreeps = this.creepsByRole.get(role) || [];
            if (roomName) {
                return roleCreeps.filter(c => c.memory.home === roomName);
            }
            return roleCreeps;
        }

        // Fallback - iterate through all creeps
        const creeps: Creep[] = [];
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            if (creep.memory.role === role) {
                if (!roomName || creep.memory.home === roomName) {
                    creeps.push(creep);
                }
            }
        }
        return creeps;
    }

    run(room: Room, haulCapacity: number, avgHauler: number, creeps: Creep[], objectives: Objective[]): Task[] {
        this.cleanUp();

        // Clear caches periodically (every 100 ticks)
        if (Game.time % 100 === 0) {
            this.distanceCache = {};
            this.pathCache.clear();
            this.roomDataCache.clear();
        }

        const rcl: RCL = (room.controller?.level ?? 0) as RCL;

        // Collect all room data once with caching
        const roomData = this.collectRoomData(room, room.find(FIND_MY_SPAWNS)[0]);
        if (!roomData.spawn) return [];

        // Ensure avgHauler is at least 1 to prevent division by zero in getTrips
        if (avgHauler <= 0) {
            avgHauler = 1;
        }

        // Process storage requests
        if (roomData.storage) {
            this.storageRequests(roomData.storage, rcl, avgHauler, room.name);
        }

        // Process main room
        let prio: Priority = priority.medium;
        this.processRoom(roomData, creeps, avgHauler, haulCapacity, prio, room.name, room);

        // Process remote rooms
        if (objectives.length > 0) {
            this.processRemoteRooms(objectives, creeps, avgHauler, haulCapacity, prio, roomData.spawn, room.name, room);
        }

        // Sort tasks once at the end using pre-calculated distances
        this.taskList.sort((a, b) => {
            const aScore = a.amount / (a.distance * (a.priority * 10));
            const bScore = b.amount / (b.distance * (b.priority * 10));
            return bScore - aScore;
        });

        return this.taskList;
    }

    private collectRoomData(room: Room, spawn: StructureSpawn): RoomData {
        // Check cache first
        const cached = this.roomDataCache.get(room.name);
        if (cached && Game.time - cached.tick < 5) {
            return cached.data;
        }

        const structures = room.find(FIND_STRUCTURES);
        const myStructures = room.find(FIND_MY_STRUCTURES);

        // Create container memory map for O(1) lookups
        const containerMemory = new Map<string, ContainerMemory>();
        if (room.memory.containers) {
            for (const mem of room.memory.containers) {
                containerMemory.set(mem.id, mem);
            }
        }

        const data: RoomData = {
            spawn: spawn,
            storage: myStructures.find(s => s.structureType === STRUCTURE_STORAGE) as StructureStorage,
            structures: structures as AnyStoreStructure[],
            containers: structures.filter(s => s.structureType === STRUCTURE_CONTAINER) as StructureContainer[],
            containerMemory,
            droppedEnergy: room.find(FIND_DROPPED_RESOURCES).filter(r => r.resourceType === RESOURCE_ENERGY),
            tombstones: room.find(FIND_TOMBSTONES),
            ruins: room.find(FIND_RUINS)
        };

        // Cache the result
        this.roomDataCache.set(room.name, { data, tick: Game.time });

        return data;
    }

    private processRoom(roomData: RoomData, creeps: Creep[], avgHauler: number, haulCapacity: number, prio: Priority, home: string, room: Room) {
        // Process dropped resources with cached distances
        this.processDroppedResources(roomData.droppedEnergy, avgHauler, haulCapacity, roomData.spawn, home);

        // Process withdrawals
        this.processWithdrawals(roomData.tombstones, avgHauler, priority.medium, roomData.spawn, home);
        this.processWithdrawals(roomData.ruins, avgHauler, priority.medium, roomData.spawn, home);

        // Process transfers - use pre-sorted creeps if available
        this.processTransfers(home, avgHauler, roomData, room);

        // Process containers
        this.processContainers(roomData, avgHauler, home, room);
    }

    private processDroppedResources(resources: Resource[], avgHauler: number, haulCapacity: number, spawn: StructureSpawn, home: string) {
        // Pre-calculate and cache distances
        if (spawn === undefined || !resources || resources.length === 0) return;

        const resourcesWithDistance = resources
            .filter(res => res != undefined && res.amount > 0)
            .map(res => ({
                resource: res,
                distance: this.getCachedDistance(spawn.pos, res.pos),
                score: res.amount / Math.max(1, this.getCachedDistance(spawn.pos, res.pos))
            }))
            .filter(item => item.distance > 0);

        if (resourcesWithDistance.length === 0) return;

        // Sort by score
        resourcesWithDistance.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

        // Process sorted resources
        for (const item of resourcesWithDistance) {
            this.createPickupTask(item.resource, avgHauler, priority.low, item.distance, home);
        }
    }

    private processWithdrawals(items: withdrawlToTakeFrom[], avgHauler: number, prio: Priority, spawn: StructureSpawn, home: string) {
        // Filter once
        const validItems = items.filter(item => item.store.getUsedCapacity(RESOURCE_ENERGY) > 0);
        if(validItems == undefined || spawn === undefined) return

        for (const item of validItems) {
            const distance = this.getCachedDistance(spawn.pos, item.pos);
            this.createWithdrawlTask(item, avgHauler, prio, distance, home);
        }
    }

    private processTransfers(home: string, avgHauler: number, roomData: RoomData, room: Room) {
        // Use pre-sorted creeps by role if available, otherwise fallback to filtering
        const upgraders = this.getCreepsByRole(roleContants.UPGRADING, home);
        const builders = this.getCreepsByRole(roleContants.BUILDING, home);
        const remoteBuilder = this.getCreepsByRole(roleContants.REMOTE_BUILDING, home);

        // Process upgraders
        for (const creep of upgraders) {
            if (creep.memory.home === home) {
                const distance = this.getCachedDistance(roomData.spawn.pos, creep.pos) + 50;
                this.createTransferTask(creep, avgHauler, priority.medium, distance, home);
            }
        }

        // Process builders
        for (const creep of builders) {
            if (creep.memory.home === home) {
                const distance = this.getCachedDistance(roomData.spawn.pos, creep.pos) + 50;
                this.createTransferTask(creep, avgHauler, priority.high, distance, home);
            }
        }

        // Process builders
        for (const creep of remoteBuilder) {
            if (creep.memory.home === home) {
                const distance = this.getCachedDistance(roomData.spawn.pos, creep.pos);
                this.createTransferTask(creep, avgHauler, priority.high, distance, home);
            }
        }

        // Process structures - explicitly handle spawn first to ensure it's always processed
        const priorityMap: { [key: string]: Priority } = {
            [STRUCTURE_TOWER]: priority.severe,
            [STRUCTURE_SPAWN]: roomData.containers.length === 0 ? priority.severe : priority.high,
            [STRUCTURE_EXTENSION]: priority.medium,
            [STRUCTURE_LAB]: priority.veryLow
        };

        // Explicitly process spawn - always create task if it needs energy
        if (roomData.spawn && roomData.spawn.store) {
            const freeCapacity = roomData.spawn.store.getFreeCapacity(RESOURCE_ENERGY);
            if (freeCapacity > 0) {
                const spawnPrio = roomData.containers.length === 0 ? priority.severe : priority.high;
                const distance = this.getCachedDistance(roomData.spawn.pos, roomData.spawn.pos);
                this.createTransferTask(roomData.spawn, avgHauler, spawnPrio, distance, home);
            }
        }

        // Process other structures
        for (const structure of roomData.structures) {
            // Skip spawn as we already processed it explicitly
            if (structure.structureType === STRUCTURE_SPAWN) continue;

            const prio = priorityMap[structure.structureType];
            if (prio !== undefined && structure.store && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                const distance = this.getCachedDistance(roomData.spawn.pos, structure.pos);
                this.createTransferTask(structure as StructuresToRefill, avgHauler, prio, distance, home);
            }
        }
    }

    private processContainers(roomData: RoomData, avgHauler: number, home: string, room: Room) {
        for (const container of roomData.containers) {
            const memory = roomData.containerMemory.get(container.id);

            if (!memory) {
                this.memoryService.initContainerMemory(container, roomData.spawn.room);
                continue;
            }

            const distance = this.getCachedDistance(roomData.spawn.pos, container.pos);

            switch (memory.type) {
                case roleContants.MINING:
                    this.createWithdrawlTask(container, avgHauler, priority.high, distance, home);
                    break;
                case roleContants.UPGRADING:
                        this.createTransferTask(container, avgHauler, priority.medium, distance, home);
                    break;
                case roleContants.FASTFILLER:
                    this.createTransferTask(container, avgHauler, priority.severe, distance, home);
                    break;
            }
        }
    }

    private processRemoteRooms(objectives: Objective[], creeps: Creep[], avgHauler: number, haulCapacity: number, prio: Priority, spawn: StructureSpawn, home: string, room: Room) {
        for (const objective of objectives) {
            const remoteRoom = Game.rooms[objective.target];
            if (!remoteRoom) continue;

            const remoteData = this.collectRoomData(remoteRoom, spawn)
            this.processRoom(remoteData, creeps, avgHauler, haulCapacity, prio, home, room);
        }
    }

    // Cached distance calculation
    private getCachedDistance(from: RoomPosition, to: RoomPosition): number {
        const key = `${from.x},${from.y}-${to.x},${to.y}`;

        if (this.distanceCache[key] === undefined) {
            // Use simple distance for same room, path distance for different rooms
            if (from.roomName === to.roomName) {
                this.distanceCache[key] = from.getRangeTo(to);
            } else {
                this.distanceCache[key] = this.getCachedPathDistance(from, to);
            }
        }

        return this.distanceCache[key];
    }

    // Cached path distance (only for complex paths)
    private getCachedPathDistance(from: RoomPosition, to: RoomPosition): number {
        const key = `${from.x},${from.y},${from.roomName}-${to.x},${to.y},${to.roomName}`;

        if (!this.pathCache.has(key) && from.getRangeTo(to.x, to.y) != 1 && from.getRangeTo(to.x, to.y) != 1) {
            const route = this.pathingService.findPath(from, to);
            this.pathCache.set(key, route?.cost ?? 50);
        }

        return this.pathCache.get(key)!;
    }

    // Simplified task creation methods
    private createPickupTask(resource: Resource, avgHauler: number, prio: Priority, distance: number, home: string) {
        let trips = this.getTrips(resource.amount, avgHauler) * 1.2;
        trips = Math.max(1, Math.ceil(trips));
        const taskId = resource.id;
        if(resource.amount > 1000){
            prio = priority.high
        }

        const existingTask = this.taskList.find(t => t.id === taskId);
        if (existingTask) {
            existingTask.maxAssigned = trips;
            existingTask.amount = resource.amount;
        } else {
            this.taskList.push({
                id: taskId,
                targetId: resource.id,
                assigned: [],
                maxAssigned: trips,
                priority: prio,
                transferType: 'pickup',
                amount: resource.amount,
                ResourceType: RESOURCE_ENERGY,
                StructureType: undefined,
                roomName: resource.room?.name?? home,
                distance,
                home
            });
        }
    }

    private createWithdrawlTask(target: withdrawlToTakeFrom, avgHauler: number, prio: Priority, distance: number, home: string) {
        const amount = target.store.getUsedCapacity(RESOURCE_ENERGY);
        if (amount === 0) return;

        let trips = Math.floor(this.getTrips(amount, avgHauler));
        trips = Math.max(1, trips);
        const taskId = target.id;

        const existingTask = this.taskList.find(t => t.targetId === taskId);
        if (existingTask) {
            existingTask.maxAssigned = trips;
            existingTask.amount = amount;
        } else {
            this.taskList.push({
                id: taskId,
                targetId: target.id,
                assigned: [],
                maxAssigned: trips,
                priority: prio,
                transferType: 'withdrawl',
                amount,
                ResourceType: RESOURCE_ENERGY,
                StructureType: (target as AnyStoreStructure).structureType,
                distance,
                roomName: target.room?.name?? home,
                home
            });
        }
    }

    private createTransferTask(target: StructuresToRefill | Creep, avgHauler: number, prio: Priority, distance: number, home: string) {
        const amount = target.store.getFreeCapacity(RESOURCE_ENERGY);
        if (amount === 0) return;

        let trips = this.getTrips(amount, avgHauler);
        if((target as StructuresToRefill).structureType === STRUCTURE_TOWER || (target as StructuresToRefill).structureType === STRUCTURE_CONTAINER){
            trips = Math.floor(trips);
        }
        const taskId = target.id;
        if((target as StructuresToRefill).structureType === STRUCTURE_SPAWN){
            trips = trips * 2;
        }

        trips = Math.max(1, Math.ceil(trips));

        const existingTask = this.taskList.find(t => t.targetId === taskId);
        if (existingTask) {
            existingTask.maxAssigned = trips;
            existingTask.amount = amount;
        } else {
            this.taskList.push({
                id: taskId,
                targetId: target.id,
                assigned: [],
                maxAssigned: trips,
                priority: prio,
                transferType: 'transfer',
                amount,
                ResourceType: RESOURCE_ENERGY,
                StructureType: (target as AnyStoreStructure).structureType,
                distance,
                roomName: target.room.name,
                home
            });
        }
    }

    storageRequests(storage: StructureStorage, rcl: RCL, avgHauler: number, home: string) {
        if (!storage) return;

        const energyUsed = storage.store.getUsedCapacity(RESOURCE_ENERGY);
        const limit = eStorageLimit[rcl];

        // Transfer to storage
        if (energyUsed < limit) {
            const amount = Math.min(limit - energyUsed, storage.store.getFreeCapacity(RESOURCE_ENERGY)) *2;
            const trips = this.getTrips(amount, avgHauler) * 2;
            const taskId = storage.id + "transfer";

            const existingTask = this.taskList.find(t => t.id === taskId);
            if (existingTask && trips != 0) {
                existingTask.maxAssigned = trips;
                existingTask.amount = amount;
            } else {
                this.taskList.push({
                    id: taskId,
                    targetId: storage.id,
                    assigned: [],
                    maxAssigned: trips,
                    priority: priority.veryLow,
                    transferType: 'transfer',
                    amount,
                    ResourceType: RESOURCE_ENERGY,
                    StructureType: STRUCTURE_STORAGE,
                    distance: 30,
                    roomName: storage.room.name,
                    home
                });
            }
        }

        // Withdraw from storage
        if (energyUsed > 0) {
            const trips = this.getTrips(energyUsed, avgHauler);
            const taskId = storage.id + "withdrawl";
            const existingTask = this.taskList.find(t => t.id === taskId);
            if (existingTask) {
                existingTask.maxAssigned = trips;
                existingTask.amount = energyUsed;
            } else {
                this.taskList.push({
                    id: taskId,
                    targetId: storage.id,
                    roomName: storage.room.name,
                    assigned: [],
                    maxAssigned: trips,
                    priority: priority.veryLow,
                    transferType: 'withdrawl',
                    amount: energyUsed,
                    ResourceType: RESOURCE_ENERGY,
                    StructureType: STRUCTURE_STORAGE,
                    distance: 1,
                    home
                });
            }
        }
    }

    getTrips(capacity: number, avgHauler: number): number {
        const haulerCapacity = Math.max(avgHauler, 1) * CARRY_CAPACITY;
        if (haulerCapacity === 0) return 0;
        return capacity / haulerCapacity;
    }

    cleanUp() {
        this.taskList = this.taskList.filter(task => Game.getObjectById(task.targetId) != null);
    }

    // Optimized task assignment with priority loop
    assignToTask(creep: Creep, type: ResRole): string | undefined {
        this.cleanTasks(creep);

        const counts = getRoomCreepCounts(creep.memory.home);
        const hasFastFiller = (counts[roleContants.FASTFILLER] || 0) >= 1;
        const hasPorter = (counts[roleContants.PORTING] || 0) > 2;

        // Iterate through priorities from highest to lowest
        for (const priorityValue of [priority.severe, priority.high, priority.medium, priority.low, priority.veryLow]) {
            const validTasks = this.getValidTasksForCreep(creep, type, hasFastFiller, hasPorter, priorityValue);

            if (validTasks.length > 0) {
                validTasks[0].assigned.push(creep.name);
                (creep.memory as HaulerMemory).take = 'withdrawl';
                return validTasks[0].targetId;
            }
        }

        return undefined;
    }

    private getValidTasksForCreep(creep: Creep, type: ResRole, hasFastFiller: boolean, hasPorter: boolean, priorityFilter: Priority): Task[] {
        const rcl = creep.room.controller?.level ?? 0;
        const role = creep.memory.role;
        const home = creep.memory.home;
        const capacity = creep.store.getFreeCapacity(RESOURCE_ENERGY);

        return this.taskList.filter(task => {
            // Priority filter - only consider tasks of this priority
            if (task.priority !== priorityFilter) return false;

            // Basic filters
            if (task.home !== home) return false;
            if (task.assigned.length >= task.maxAssigned) return false;
            if (task.transferType !== type) return false;
            // Only filter out small withdrawl tasks if creep has very little capacity - allow pickup of any amount
            if (capacity < 50 && capacity / 8 > task.amount && task.transferType === "withdrawl") return false;

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
        const storage = Game.rooms[task.home].storage;

        if (hasFastFiller && hasPorter && storage && storage?.store.getUsedCapacity(RESOURCE_ENERGY) <= eStorageLimit[rcl]) {
            if (task.StructureType === STRUCTURE_STORAGE && task.transferType === "withdrawl") return false;
            if (task.StructureType === STRUCTURE_CONTAINER && task.transferType === "transfer") return false;
            if (task.StructureType === STRUCTURE_LAB) return false;
            if (task.StructureType === STRUCTURE_EXTENSION || task.StructureType === STRUCTURE_SPAWN) return false;
        } else if (!hasFastFiller && !hasPorter) {
            if (task.StructureType === STRUCTURE_CONTAINER && task.transferType === "transfer") return false;
        } else if (hasFastFiller && !hasPorter) {
            if (task.StructureType === STRUCTURE_EXTENSION || task.StructureType === STRUCTURE_SPAWN) return false;
            if (task.StructureType === STRUCTURE_STORAGE && task.transferType === "withdrawl" && storage && storage?.store.energy < eStorageLimit[rcl]) return false;
            if (task.StructureType === STRUCTURE_STORAGE && task.transferType === "transfer") return false;
        } else if (hasFastFiller && hasPorter && storage && storage?.store.getUsedCapacity(RESOURCE_ENERGY) >= eStorageLimit[rcl]) {
            if (task.StructureType === STRUCTURE_EXTENSION || task.StructureType === STRUCTURE_SPAWN) return false;
            if (task.StructureType === STRUCTURE_STORAGE && task.transferType === "withdrawl") return false;
            if (task.StructureType === STRUCTURE_STORAGE && task.transferType === "withdrawl") return false;
        }else {
            if (task.StructureType === STRUCTURE_STORAGE && task.transferType === "transfer") return false;
        }

        return true;
    }

    private isValidPortingTask(task: Task, hasFastFiller: boolean): boolean {
        if (task.transferType === "pickup") return false;
        if (task.transferType === "withdrawl" && task.StructureType !== STRUCTURE_STORAGE) return false;
        if (task.StructureType === STRUCTURE_EXTENSION && hasFastFiller) return false;
        if (task.StructureType === STRUCTURE_SPAWN && hasFastFiller) return false;
        if (task.transferType === "transfer" && task.StructureType === STRUCTURE_STORAGE) return false;

        return true;
    }

    private isValidMaintenanceTask(task: Task, rcl: number): boolean {
        if (rcl > 4) {
            if (task.StructureType !== undefined && task.StructureType !== STRUCTURE_STORAGE && task.transferType === "withdrawl") return false;
            if (task.transferType === "pickup") return false;
        }

        return true;
    }

    cleanTasks(creep: Creep) {
        for (const task of this.taskList) {
            task.assigned = task.assigned.filter(name =>
                name && name !== creep.name && Game.creeps[name] !== undefined
            );
        }
    }
}
