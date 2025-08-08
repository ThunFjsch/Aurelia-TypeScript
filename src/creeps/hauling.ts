import { roleContants } from "objectives/objectiveInterfaces";
import { ResourceService } from "services/resource.service";

export interface HaulerMemory extends CreepMemory {
    target?: any
}

export class Hauling {
    run(creep: Creep, energyManager: ResourceService) {
        let memory = creep.memory as HaulerMemory
        // delete memory.target
        // creep.memory = memory;
        if (creep.store.energy < (creep.store.getCapacity() / 2) + 1) {
            if (memory.target === undefined) {
                memory.target = energyManager.assignToTask(creep, 'pickup')
                creep.memory = memory
                return;
            }
            const target = Game.getObjectById(memory.target) as Resource;
            if (target === null || target === undefined) {
                delete memory.target;
                creep.memory = memory;
                return
            } else{
                if (creep.pos.getRangeTo(target.pos.x, target.pos.y) <= 1) {
                    creep.pickup(target);
                    energyManager.removeFromTask(creep, target)
                    delete memory.target;
                    creep.memory = memory;
                    return
                } else{
                    creep.moveTo(target.pos.x, target.pos.y)
                }
            }

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
