import { ResourceService } from "services/resource.service";
import { doTransfer, getEnergy } from "./creepHelper";
import { HaulerMemory } from "./hauling";
import { PathCachingService } from "services/pathCaching.service";

export class Porting {
    pathCachingService: PathCachingService;
    constructor(PathCachinService: PathCachingService) {
        this.pathCachingService = PathCachinService;
    }
    run(creep: Creep, energyManager: ResourceService) {
        let memory = creep.memory as HaulerMemory
        if (creep.store.energy < (creep.store.getCapacity() / 2) + 1) {
            getEnergy(creep, memory, energyManager);

        } else {
            if (memory.target === undefined) {
                memory.target = energyManager.assignToTask(creep, "transfer");
                memory.onRoute = true;
                creep.memory = memory;
                return;
            } else {
                doTransfer(creep, energyManager, this.pathCachingService);
            }
        }
    }
}
