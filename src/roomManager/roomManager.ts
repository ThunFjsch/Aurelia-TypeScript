import { MemoryService } from "services/memory.service";
import { Planner } from "./basePlanner/planner";
import { ObjectiveManager } from "objectives/objectiveManager";
import { SpawnManager } from "roomManager/spawnManager";
import { ResourceService } from "services/resource.service";
import { roleContants } from "objectives/objectiveInterfaces";
import { getWorkParts } from "./spawn-helper";
import { ConstrcutionManager } from "./constructionManager";
import { Tower } from "structures/tower";
import { ScoutingService } from "services/scouting.service";
import { EconomyService } from "services/economy.service";
import { Infrastructure } from "./basePlanner/planner-infrastructure";

const economyService = new EconomyService();
const spawnManager = new SpawnManager(economyService);
const towerControle = new Tower();
const constructionManager = new ConstrcutionManager();
const infrastructure = new Infrastructure();

export interface RoomManager {
  ownedRooms: string[];
}

interface RoomCache {
  roomName: string;
  towers: StructureTower[];
  hostiles: Creep[];
  spawns: StructureSpawn[];
  creeps: Creep[];
  haulers: Creep[];
  tick: number;
}

export class RoomManager {
  memoryService: MemoryService;
  objectiveManager: ObjectiveManager;
  resourceService: ResourceService;
  scoutingService: ScoutingService;
  // Cache per room with proper structure
  private roomCaches: Map<string, RoomCache> = new Map();

  // Pre-sorted creep data from main loop
  private creepsByRoom: Map<string, Creep[]> | null = null;
  private creepsByRole: Map<string, Creep[]> | null = null;

  constructor(
    MemoryService: MemoryService,
    ObjectiveManager: ObjectiveManager,
    Resource: ResourceService,
    ScoutingService: ScoutingService,
  ) {
    this.memoryService = MemoryService;
    this.objectiveManager = ObjectiveManager;
    this.resourceService = Resource;
    this.scoutingService = ScoutingService;
  }

  /**
   * Set pre-sorted creep data from main loop
   */
  setCreepData(creepsByRoom: Map<string, Creep[]>, creepsByRole: Map<string, Creep[]>): void {
    this.creepsByRoom = creepsByRoom;
    this.creepsByRole = creepsByRole;
  }

  /**
   * Get or create cached room data
   */
  private getRoomCache(room: Room): RoomCache {
    let cache = this.roomCaches.get(room.name);

    // If no cache exists, we must create it
    if (!cache) {
      const roomCreeps = this.creepsByRoom?.get(room.name) || room.find(FIND_MY_CREEPS);
      const roomHaulers =
        this.creepsByRole?.get(roleContants.HAULING)?.filter(c => c.memory.home === room.name) ||
        roomCreeps.filter(c => c.memory.role === roleContants.HAULING);

      cache = {
        roomName: room.name,
        towers: room.find(FIND_MY_STRUCTURES, { filter: s => s.structureType === STRUCTURE_TOWER }) as StructureTower[],
        hostiles: room.find(FIND_HOSTILE_CREEPS),
        spawns: room.find(FIND_MY_SPAWNS),
        creeps: roomCreeps,
        haulers: roomHaulers,
        tick: Game.time
      };

      this.roomCaches.set(room.name, cache);
      return cache;
    }

    // Cache exists, check what needs updating
    const ticksSinceUpdate = Game.time - cache.tick;
    const shouldUpdateHostiles = ticksSinceUpdate >= 35;
    const shouldUpdateStructures = cache.spawns.length === 0 || ticksSinceUpdate >= 1500;

    // If nothing needs updating, return existing cache
    if (!shouldUpdateHostiles && !shouldUpdateStructures) {
      return cache;
    }

    // Update what's needed
    const roomCreeps = this.creepsByRoom?.get(room.name) || room.find(FIND_MY_CREEPS);
    const roomHaulers =
      this.creepsByRole?.get(roleContants.HAULING)?.filter(c => c.memory.home === room.name) ||
      roomCreeps.filter(c => c.memory.role === roleContants.HAULING);

    cache = {
      roomName: room.name,
      towers: shouldUpdateStructures
        ? (room.find(FIND_MY_STRUCTURES, { filter: s => s.structureType === STRUCTURE_TOWER }) as StructureTower[])
        : cache.towers,
      hostiles: shouldUpdateHostiles ? room.find(FIND_HOSTILE_CREEPS) : cache.hostiles,
      spawns: shouldUpdateStructures ? room.find(FIND_MY_SPAWNS) : cache.spawns,
      creeps: roomCreeps,
      haulers: roomHaulers,
      tick: Game.time
    };

    this.roomCaches.set(room.name, cache);
    return cache;
  }

  run() {
    // Clear old room caches periodically to prevent memory buildup
    if (Game.time % 1000 === 0) {
      const currentRooms = new Set(Memory.myRooms);
      for (const roomName of this.roomCaches.keys()) {
        if (!currentRooms.has(roomName)) {
          this.roomCaches.delete(roomName);
        }
      }
    }

    for (let index in Memory.myRooms) {
      const roomName = Memory.myRooms[index];
      const room = Game.rooms[roomName];
      // Memory checks
      this.memCheck(room);

      // Get cached room data
      const roomCache = this.getRoomCache(room);

      // Base planner check
      if (room.memory.basePlanner === undefined) {
        const spawn = roomCache.spawns[0];
        if (spawn) {
          const planner = new Planner();
          planner.startRoomPlanner(room, spawn);
        }
      }

      // Tower defense (runs every tick for active threats)
      this.crudeTowerDefence(roomCache);

      // Automatic remote infrastructure placement
      if (room.controller?.level && room.controller.level >= 2 && Game.time % 25 === 0) {
      }
      this.placeRemoteInfrastructure(room);

      constructionManager.run(room);

      // Also build roads in remote rooms (after construction manager runs)
      const remoteObjectives = this.objectiveManager.getRoomObjectives(room);
      const miningObjectives = remoteObjectives.filter(
        obj => obj.type === roleContants.MINING && obj.target !== room.name
      );

      for (const miningObj of miningObjectives) {
        const remoteRoom = Game.rooms[miningObj.target];
        if (remoteRoom && remoteRoom.memory.basePlanner?.stamps) {
          infrastructure.maintainRemoteRoomInfrastructure(remoteRoom, room);
        }
      }

      // Objectives and construction (every 15 ticks or if no objectives)
      this.objectiveManager.syncRoomObjectives(room, roomCache.creeps);

      // Spawning
      const roomObjectives = this.objectiveManager.objectives.filter(o => o.home === room.name);
      if(Game.time % 5 === 0){
        spawnManager.run(roomObjectives, room, roomCache.creeps);
      }

      const assignedRooms = this.objectiveManager
          .getRoomObjectives(room)
          .filter(objective => objective.target !== room.name && objective.home === room.name);

        const haulCapacity = this.objectiveManager.getRoomHaulCapacity(room);
        const avgHauler = this.getRoomAvgHauler(roomCache);

        this.resourceService.run(room, haulCapacity, avgHauler, roomCache.creeps, assignedRooms);
      // Resource management (every 25 ticks)
      if (Game.time % 15 === 0) {

      }
    }
  }

  private crudeTowerDefence(roomCache: RoomCache): void {
    // Early exit if no hostiles
    if (roomCache.hostiles.length === 0) return;

    const towers = roomCache.towers;
    if (towers.length === 0) return;

    // Attack the closest hostile to any tower
    const target = roomCache.hostiles[0];
    for (const tower of towers) {
      towerControle.run(tower, target);
    }
  }

  /**
   * Calculate average hauler capacity using cached haulers
   */
  getRoomAvgHauler(roomCache: RoomCache): number {
    const haulers = roomCache.haulers;

    if (haulers.length === 0) return 1;

    let totalCarryParts = 0;
    for (const hauler of haulers) {
      totalCarryParts += getWorkParts([hauler], CARRY);
    }

    // Return average carry parts per hauler (minimum 1)
    return Math.max(1, Math.round(totalCarryParts / haulers.length));
  }

  private memCheck(room: Room): void {
    // Clear containers every 50 ticks for refresh
    if (Game.time % 50 === 0) {
      room.memory.containers = [];
    }

    // Initialize room memory if needed
    if (room.memory.containers === undefined || room.memory.respawn || room.memory === undefined) {
      this.memoryService.initRoomMemory(room);
      return;
    }

    // Initialize scout plan when enough energy
    if (room.memory.scoutPlan === undefined && room.energyCapacityAvailable >= 300) {
      room.memory.scoutPlan = this.scoutingService.getRoomScoutRoute(room);
    }

    // Track RCL progress
    const rcl = room.controller?.level ?? 0;
    if (room.memory.rclProgress.length < rcl) {
      room.memory.rclProgress.push({ finished: Game.time, level: rcl });
    }
  }

  /**
   * Automatically places infrastructure in remote rooms based on mining objectives
   */
  private placeRemoteInfrastructure(room: Room): void {
    const roomObjectives = this.objectiveManager.getRoomObjectives(room);
    const miningObjectives = roomObjectives.filter(obj => obj.type === roleContants.MINING && obj.target !== room.name);

    for (const miningObj of miningObjectives) {
      const remoteRoom = Game.rooms[miningObj.target];
      if (!remoteRoom) continue;

      // Check if infrastructure already exists
      if (
        remoteRoom.memory.basePlanner?.stamps?.some(s => s.type === STRUCTURE_CONTAINER || s.type === STRUCTURE_ROAD)
      ) {
        continue;
      }

      // Place remote infrastructure
      const success = infrastructure.placeRemoteRoomInfrastructure(remoteRoom, room);
      if (success) {
        console.log(`🚧 Placed infrastructure in remote room ${remoteRoom.name} for ${room.name}`);
      }
    }
  }
}
