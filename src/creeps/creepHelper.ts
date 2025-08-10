import { ResourceService } from "services/resource.service";
import { HaulerMemory } from "./hauling";

export function getEnergy(creep: Creep, memory: HaulerMemory|MaintainerMemory, energyManager: ResourceService){
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
            } else {
                if (creep.pos.getRangeTo(target.pos.x, target.pos.y) <= 1) {
                    creep.pickup(target);
                    energyManager.removeFromTask(creep, target)
                    delete memory.target;
                    creep.memory = memory;
                    return
                } else {
                    creep.moveTo(target.pos.x, target.pos.y)
                }
            }
}
