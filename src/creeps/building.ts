import { getCurrentConstruction } from "roomManager/constructionManager";
import { helpAFriend } from "./creepHelper";

export class Building {
    run(creep: Creep) {
        const memory = creep.memory as BuilderMemory
        if(memory.target === undefined){
            memory.target = getCurrentConstruction(creep.room);
            creep.memory = memory;
            return;
        }
        const target: ConstructionSite = Game.getObjectById(memory.target) as ConstructionSite;

        if(target === null){
            memory.target = getCurrentConstruction(creep.room);
            creep.memory = memory;
            return;
        }

        helpAFriend(creep, memory);

        if(creep.pos.x === target.pos.x && creep.pos.y === target.pos.y){
            creep.moveTo(32,33)
        }

        if(creep.store.energy === 0){
            memory.working = false
        } else{
            memory.working = true
        }

        let building = -9;
        if (creep.pos.inRangeTo(target.pos.x, target.pos.y, 2)) {
            memory.working = true
            building = creep.build(target)
        }else memory.working = false;
        if(building === ERR_INVALID_TARGET){
            memory.target = getCurrentConstruction(creep.room);
            creep.memory = memory;
        }
        if (building != OK && memory.working === false) {
            creep.moveTo(target);
        }
    }
}
