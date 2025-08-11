import { ResourceService, ResRole } from "services/resource.service";
import { getEnergy } from "./creepHelper";

export interface HaulerMemory extends CreepMemory {
    target?: any
    take: ResRole
}

export class Hauling {
    run(creep: Creep, energyManager: ResourceService) {
        let memory = creep.memory as HaulerMemory
        // delete memory.target
        // creep.memory = memory;
        if (creep.store.energy < (creep.store.getCapacity() / 8) + 1) {
            getEnergy(creep, memory, energyManager);
        } else {
            if (memory.target === undefined) {
                memory.target = energyManager.assignToTask(creep, "transfer")
                creep.memory = memory
                return
            } else {
                const target = Game.getObjectById(memory.target) as Creep;
                if (target === null) {
                    delete memory.target;
                    creep.memory = memory
                    return
                }

                if (creep.pos.getRangeTo(target.pos.x, target.pos.y) <= 1) {
                    creep.transfer(target, RESOURCE_ENERGY);

                    energyManager.removeFromTask(creep, target)
                    delete memory.target;
                    creep.memory = memory;
                }

                creep.moveTo(target.pos.x, target.pos.y)
            }
        }
    }
}
