import { ResourceService, ResRole } from "services/resource.service";
import { creepPathMove, doTransfer, getAwayFromStructure, getEnergy } from "./creepHelper";
import { moveByPath, moveTo } from "screeps-cartographer";
import { PathCachingService } from "services/pathCaching.service";

export interface HaulerMemory extends CreepMemory {
    target?: any;
    take: ResRole;
    onRoute: boolean;
}

export class Hauling {
    pathCachingService: PathCachingService;

    constructor(pathCaching: PathCachingService) {
        this.pathCachingService = pathCaching;
    }

    run(creep: Creep, energyManager: ResourceService) {
        let memory = creep.memory as HaulerMemory;
        let needsMemoryUpdate = false;

        if (creep.store.energy < (creep.store.getCapacity() / 3) + 1) {
            getEnergy(creep, memory, energyManager);
        } else {
            if (!memory.target) {
                const newTarget = energyManager.assignToTask(creep, "transfer");
                if (newTarget) {
                    memory.target = newTarget;
                    memory.onRoute = true;
                    needsMemoryUpdate = true;
                }
            } else {
                doTransfer(creep, energyManager, this.pathCachingService);
            }
        }

        if (needsMemoryUpdate) {
            creep.memory = memory;
        }
    }

}
