import { settings } from "./config";
import { Stats } from './stats'
import { MemoryService } from "services/memory.service";
import { logger } from "utils/logger/logger";
import memHack from "./utils/memhack";
import { RoomManager } from "roomManager/roomManager";
import { assignGlobals } from "global-types";
import { Visualizer } from "visuals/visualizer";
import { ObjectiveManager } from "objectives/objectiveManager";
import { runRole } from "creeps/creeps";
import { ResourceService } from "services/resource.service";
import profiler from "screeps-profiler";
import { ScoutingService } from "services/scouting.service";
import { EconomyService } from "services/economy.service";
import { config, preTick, reconcileTraffic } from "screeps-cartographer";
import { trafficManagerConfigSetup } from "utils/trafficManager/setup";
import { PathCachingService } from "services/pathCaching.service";
import { PathingService } from "services/pathing.service";

const memoryService = new MemoryService();
const stats = new Stats();
const scoutingService = new ScoutingService();
const objectiveManager = new ObjectiveManager(scoutingService);
const resourceService = new ResourceService(memoryService);
const roomManager = new RoomManager(memoryService, objectiveManager, resourceService, scoutingService);
const visualizer = new Visualizer();
const economyService = new EconomyService()
const pathCachingService = new PathCachingService()

trafficManagerConfigSetup();
assignGlobals();

console.log(`Reset happened at ${Game.time}`)

if (settings.test.profiler) {
  profiler.enable();
}


// Initialize global cache if it doesn't exist
if (!global.roomCreepCounts) {
    global.roomCreepCounts = {};
}

export const loop = () => {
  profiler.wrap(memHack(() => {
    preTick();
    // console.log(`Current game tick is ${Game.time}`);
    if (Memory.respawn || Memory.myRooms === undefined) {
      logger.info('Colony has respawned')
      memoryService.initGlobalMemory();
      return;
    }
    // ============================================================
    // PHASE 1: PRE-PROCESSING - Build all data structures once
    // ============================================================

    const creeps: Creep[] = [];
    const creepsByRoom = new Map<string, Creep[]>();
    const creepsByRole = new Map<string, Creep[]>();
    const creepsByHome = new Map<string, Creep[]>(); // Additional: index by home room

    // Single iteration through all creeps - builds all indexes at once
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        creeps.push(creep);

        // Index by current room
        const roomName = creep.room.name;
        if (!creepsByRoom.has(roomName)) {
            creepsByRoom.set(roomName, []);
        }
        creepsByRoom.get(roomName)!.push(creep);

        // Index by role
        const role = creep.memory.role;
        if (role) {
            if (!creepsByRole.has(role)) {
                creepsByRole.set(role, []);
            }
            creepsByRole.get(role)!.push(creep);
        }

        // Index by home room (useful for many operations)
        const home = creep.memory.home;
        if (home) {
            if (!creepsByHome.has(home)) {
                creepsByHome.set(home, []);
            }
            creepsByHome.get(home)!.push(creep);
        }
    }

    // Automatically delete memory of missing creeps
    for (const name in Memory.creeps) {
      if (!(name in Game.creeps)) {
        delete Memory.creeps[name];
      }
    }

    // ============================================================
    // PHASE 2: DISTRIBUTE PRE-SORTED DATA TO SERVICES
    // ============================================================

    // Pass pre-sorted data to all services that need it
    resourceService.setCreepsByRoom(creepsByRoom);
    resourceService.setCreepsByRole(creepsByRole);
    roomManager.setCreepData(creepsByRoom, creepsByRole);

    // If you have BasicCreep or other services, pass data to them too
    // Example: basicCreepService.setCreepsByRoom(creepsByRoom);

    // ============================================================
    // PHASE 3: RUN INDIVIDUAL CREEP LOGIC
    // ============================================================

    // Now run each creep with the optimized context
    // The roles will benefit from the pre-sorted data passed to services
    for (const creep of creeps) {
        runRole(creep, resourceService, objectiveManager, pathCachingService);
    }

    // ============================================================
    // PHASE 4: ROOM-LEVEL OPERATIONS
    // ============================================================

    // Room manager now has access to pre-sorted creeps
    roomManager.run();

    // ============================================================
    // PHASE 5: GLOBAL OPERATIONS
    // ============================================================

    // Traffic reconciliation
    reconcileTraffic();

    // Stats update
    stats.update();

    // ============================================================
    // PHASE 6: VISUALIZATION (if enabled)
    // ============================================================

    if (settings.visuals.allowVisuals) {
        for (let index in Memory.myRooms) {
            const roomName = Memory.myRooms[index];
            const room = Game.rooms[roomName];

            visualizer.visualizeRoom(
                room,
                stats.getStatInfo(),
                stats.avgSize,
                objectiveManager.getRoomObjectives(room),
                resourceService,
                economyService
            );
        }
    }

    // ============================================================
    // PHASE 7: PIXEL GENERATION
    // ============================================================

    if ((Game.shard.name === 'shard1' || Game.shard.name === 'shard2') && Game.cpu.bucket === 10000) {
        // Game.cpu.generatePixel();
    }

    // ============================================================
    // OPTIONAL: PERFORMANCE MONITORING
    // ============================================================

    // Log CPU usage every 100 ticks
    if (Game.time % 100 === 0) {
        const cpuUsed = Game.cpu.getUsed();
        const cpuLimit = Game.cpu.limit;
        const bucketLevel = Game.cpu.bucket;
        // Warn if approaching CPU limit
        if (cpuUsed > cpuLimit * 0.9) {
            console.log(`⚠️ WARNING: High CPU usage (${(cpuUsed/cpuLimit*100).toFixed(1)}%)`);
        }
    }
  }))}
