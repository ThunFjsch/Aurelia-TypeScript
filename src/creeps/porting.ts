import { ResourceService } from "services/resource.service";
import BasicCreep from "./creepHelper";
import { HaulerMemory } from "./hauling";

export class Porting extends BasicCreep{
    run(creep: Creep, energyManager: ResourceService) {
        let memory = creep.memory as HaulerMemory
        if (creep.store.energy < (creep.store.getCapacity() / 2) + 1) {
            this.getEnergy(creep, memory, energyManager);

        } else {
            if (memory.target === undefined) {
                memory.target = energyManager.assignToTask(creep, "transfer");
                memory.onRoute = true;
                creep.memory = memory;
                return;
            } else {
                this.doTransfer(creep, energyManager);
            }
        }
    }
}
