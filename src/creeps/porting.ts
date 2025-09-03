import { ResourceService } from "services/resource.service";
import { getEnergy } from "./creepHelper";
import { HaulerMemory } from "./hauling";
import { moveTo } from "screeps-cartographer";

export class Porting {
    run(creep: Creep, energyManager: ResourceService) {
        let memory = creep.memory as HaulerMemory
        if (creep.store.energy < (creep.store.getCapacity() / 2) + 1) {
            getEnergy(creep, memory, energyManager);

        } else {
            if(memory.home != creep.room.name){
                const target = new RoomPosition(25,25,memory.home)
                moveTo(creep, target,{reusePath: 50})
                return;
            }
            if (memory.target === undefined) {
                memory.target = energyManager.assignToTask(creep, "transfer");
                creep.memory = memory
                return
            } else {
                const target = Game.getObjectById(memory.target) as Creep;
                if (target === null) {
                    memory.target = energyManager.assignToTask(creep, "transfer")
                    creep.memory = memory
                    return
                }

                if (creep.pos.getRangeTo(target.pos.x, target.pos.y) <= 1) {
                    creep.transfer(target, RESOURCE_ENERGY);
                    energyManager.cleanTasks(creep);
                    delete memory.target;
                    creep.memory = memory;
                } else{
                    moveTo(creep, target)
                }

            }
        }
    }
}
