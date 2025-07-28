import { settings } from "./config";
import { Stats } from './stats'
import { MemoryService } from "services/memory.service";
import { logger } from "utils/logger/logger";
import memHack from "./utils/memhack";
import { envManager } from './utils/logger/envManager';
import profiler, { Profiler } from "./utils/profiler/screeps-profiler"
import { Planner } from "roomManager/basePlanner/planner";

global.envManager = envManager;
global.logger = logger;

declare global {
  /*
    Example types, expand on these or remove them and add your own.
    Note: Values, properties defined here do no fully *exist* by this type definiton alone.
          You must also give them an implemention if you would like to use them. (ex. actually setting a `role` property in a Creeps memory)

    Types added in this `global` block are in an ambient, global context. This is needed because `main.ts` is a module file (uses import or export).
    Interfaces matching on name from @types/screeps will be merged. This is how you can extend the 'built-in' interfaces from @types/screeps.
  */
  // Memory extension samples
  interface Memory {
    uuid: number;
    log: any;
    myRooms: string[];
    globalReset: number;
    respawn?: boolean;
    sourceInfo: SourceInfo[];
    logs: any[];
    env: string;
    profiler?: ProfilerMemory;
  }

  interface SourceInfo {
    my?: boolean;
    id: Id<Source>;
    pos?: RoomPosition;
    spots: number;
    energy: number;
    ePerTick: number;
    container: RoomPosition;
    maxIncome: number;
    maxWorkParts: number;
    maxHaulerParts: number;
    distance?: number;
  }

  interface Spot {
    pos: RoomPosition;
    path: RoomPosition[];
    pathCost: number
  }

  interface RoomMemory {
    isOwned: boolean;
    remotes: string[];
    hasRoads?: boolean;
    distanceTransform?: number[][]
  }

  interface CreepMemory {
    role?: string;
    room?: string;
    sourceId?: string;
    working?: boolean;
  }

  interface ProfilerMemory {
    map: Record<string, { time: number; calls: number }>;
    totalTime: number;
    enabledTick: number;
    disableTick: number | false;
    type: string;
    filter?: string;
  }

  // Syntax for adding proprties to `global` (ex "global.log")
  namespace NodeJS {
    interface Global {
      log: any;
      Memory?: Memory;
      profiler?: Profiler;
      envManager: typeof envManager
      logger: typeof logger
    }
  }
}

const stats = new Stats();
const memoryService = new MemoryService()
const planner = new Planner();

// currently not working, could have been node
if (settings.test.profiler) {
  profiler.enable();
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = profiler.wrap(memHack(() => {
  console.log(`Current game tick is ${Game.time}`);
  if (hasRespawned() || Memory.respawn) {
    logger.info('Colony has respawned')
    memoryService.initGlobalMemory();
  }
  stats.update()
  stats.visualiseStats()

  for(let index in Memory.myRooms){
    const name = Memory.myRooms[index]
    const room = Game.rooms[name]
    if(room === undefined) continue;
    if(room.memory.distanceTransform != undefined){
      planner.visualiseDT(room);
    } else{
      planner.startRoomPlanner(room)
    }
  }

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }
}));

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
