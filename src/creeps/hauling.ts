import { ResourceService, ResRole } from "services/resource.service";
import { getAwayFromStructure, getEnergy } from "./creepHelper";

export interface HaulerMemory extends CreepMemory {
    target?: any;
    take: ResRole;
    onRoute: boolean;
}

export class Hauling {
    run(creep: Creep, energyManager: ResourceService) {
        let memory = creep.memory as HaulerMemory
        if (creep.store.energy < (creep.store.getCapacity() / 3) + 1) {
            getEnergy(creep, memory, energyManager);
        } else {
            if (memory.target === undefined) {
                memory.target = energyManager.assignToTask(creep, "transfer");
                memory.onRoute = true
                creep.memory = memory
                return;
            }
            const target = Game.getObjectById(memory.target) as Creep | AnyStoreStructure;

            if(memory.target != undefined) {
                if (target === null) {
                    delete memory.target;
                    memory.onRoute = false;
                    creep.memory = memory;
                    return
                }

                if (creep.pos.getRangeTo(target.pos.x, target.pos.y) <= 1) {
                    creep.transfer(target, RESOURCE_ENERGY);
                    energyManager.cleanTasks(creep)
                    creep.moveTo(25,25);
                    getAwayFromStructure(creep, target as Structure)
                    memory.onRoute = false;
                    delete memory.target;
                    creep.memory = memory;
                } else{
                    creep.moveTo(target, {visualizePathStyle: {lineStyle: "dotted", stroke: "#DE21AC",}, reusePath: 50})
                }
            }
        }
    }
}
