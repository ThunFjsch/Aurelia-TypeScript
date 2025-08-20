import { PlacedStructure } from "roomManager/basePlanner/planner-interfaces";
import { RCL } from "roomManager/constructionManager";
import { ContiainerType, ResRole } from "services/resource.service";
import { envManager } from "utils/logger/envManager";
import { logger } from "utils/logger/logger";
import { Point } from "utils/sharedTypes";
export function assignGlobals(): void {
    global.envManager = envManager;
    global.logger = logger;

}

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
        roomName: string;
        home?: string;
        spots: number;
        energy?: number;
        ePerTick?: number;
        maxIncome?: number;
        maxWorkParts?: number;
        maxHaulerParts?: number;
        distance?: number;
        path?: RoomPosition[]
    }

    interface Spot {
        pos: RoomPosition;
        path: RoomPosition[];
        pathCost: number
    }

    interface RoomMemory {
        respawn?: boolean;
        isOwned: boolean;
        remotes: string[];
        hasRoads?: boolean;
        basePlanner: BasePlanner;
        constructionOffice: ConstructionOffice;
        containers: ContainerMemory[],
        scoutPlan: ScoutPlan[] | undefined;
    }

    interface ScoutPlan{
        roomName: string,
        lastVisit?: number
        hasEnemy?: boolean;
        enemies?: Creep[]
    }

    interface ContainerMemory{
        id: string;
        source: string | undefined;
        type: ContiainerType;
        fastFillerSpots: Point[] | undefined
    }

    interface ConstructionOffice{
        plans: PlacedStructure[];
        finished: boolean;
        lastJob: RCL
    }

    interface BasePlanner {
        startlocation: { x: number, y: number, score: number }
        distanceTransform?: number[][];
        stamps?: PlacedStructure[];
        upgradeLocations?: Point[];
        cuts?: Point[]
    }

    interface CreepMemory {
        role: string;
        home: string;
        working?: boolean;
        blocking?: number
    }

    interface MinerMemory extends CreepMemory {
        route: RoomPosition[];
        containerPos: Point | undefined;
        sourceId: string;
        targetRoom: string;
    }

    interface FastFillerMemory extends CreepMemory {
        pos: Point;
        supply: string
    }

    interface BuilderMemory extends CreepMemory {
        target: string | undefined;
        route: RoomPosition[];
    }

    interface MaintainerMemory extends CreepMemory {
        target: string | undefined;
        take: ResRole;
        repairTarget: string | undefined;
    }

    interface ScoutMemory extends CreepMemory {
        currIndex: number;
        route: ScoutPlan[];
    }

    interface ReservMemory extends CreepMemory {
        target: string;
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
            envManager: typeof envManager
            logger: typeof logger

        }
    }
}
