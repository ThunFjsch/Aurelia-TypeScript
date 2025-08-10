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

const memoryService = new MemoryService();
const stats = new Stats();
const objectiveManager = new ObjectiveManager();
const resourceService = new ResourceService(memoryService);
const roomManager = new RoomManager(memoryService, objectiveManager, resourceService);
const visualizer = new Visualizer()

assignGlobals();
console.log(`Reset happened at ${Game.time}`)

if (settings.test.profiler) {
  profiler.enable();
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = () => {
  profiler.wrap(memHack(() => {
    console.log(`Current game tick is ${Game.time}`);
    if (hasRespawned() || Memory.respawn) {
      logger.info('Colony has respawned')
      memoryService.initGlobalMemory();
    }

    const creeps: Creep[] = []
    for (const index in Game.creeps) {
      const creep = Game.creeps[index];
      creeps.push(creep);
      runRole(creep, resourceService, objectiveManager)
    }

    // Automatically delete memory of missing creeps
    for (const name in Memory.creeps) {
      if (!(name in Game.creeps)) {
        delete Memory.creeps[name];
      }
    }

    roomManager.run(creeps)
    stats.update();

    if (settings.visuals.allowVisuals) {
      for (let index in Memory.myRooms) {
        const roomName = Memory.myRooms[index];
        const room = Game.rooms[roomName];
        visualizer.visualizeRoom(room, stats.getStatInfo(), stats.avgSize, objectiveManager.getRoomObjectives(room), resourceService)
      }
    }

    if (Game.shard.name === 'shard0' && Game.cpu.bucket === 10000) {
      Game.cpu.generatePixel();
    }
  })
  )
}
// }));

/**
 * global.hasRespawned()
 *
 * @author:  SemperRabbit
 * @version: 1.1
 * @date:    180331
 * @return:  boolean whether this is the first tick after a respawn or not
 *
 * The checks are set as early returns in case of failure, and are ordered
 * from the least CPU intensive checks to the most. The checks are as follows:
 *
 *      If it has returned true previously during this tick, return true again
 *      Check Game.time === 0 (returns true for sim room "respawns")
 *      There are no creeps
 *      There is only 1 room in Game.rooms
 *      The 1 room has a controller
 *      The controller is RCL 1 with no progress
 *      The controller is in safemode with the initial value
 *      There is only 1 StructureSpawn
 *
 * The only time that all of these cases are true, is the first tick of a respawn.
 * If all of these are true, you have respawned.
 *
 * v1.1 (by qnz): - fixed a condition where room.controller.safeMode can be SAFE_MODE_DURATION too
 *                - improved performance of creep number check (https://jsperf.com/isempty-vs-isemptyobject/23)
 */
function hasRespawned() {
  // check for multiple calls on same tick

  // check for 0 creeps
  for (const creepName in Game.creeps) {
    return false
  }

  // check for only 1 room
  const rNames = Object.keys(Game.rooms)
  if (rNames.length !== 1) {
    return false
  }

  // check for controller, progress and safe mode
  const room = Game.rooms[rNames[0]]
  if (
    !room.controller ||
    !room.controller.my ||
    room.controller.level !== 1 ||
    room.controller.progress ||
    !room.controller.safeMode ||
    room.controller.safeMode <= SAFE_MODE_DURATION - 1
  ) {
    return false
  }

  // check for 1 spawn
  if (Object.keys(Game.spawns).length > 1) {
    return false
  }

  return true;
}
