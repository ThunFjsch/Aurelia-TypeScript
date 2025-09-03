import { getCurrentConstruction } from "roomManager/constructionManager";
import { helpAFriend } from "./creepHelper";
import { moveTo } from "screeps-cartographer";

export class Building {
    run(creep: Creep) {
        const memory = creep.memory as BuilderMemory
        //TODO: Use Id
        const spawn = Game.rooms[memory.home].find(FIND_MY_SPAWNS)[0];
        if (memory.target === undefined) {
            memory.target = getCurrentConstruction(creep.room, creep);
            creep.memory = memory;
            if (memory.done && creep.pos.inRangeTo(spawn.pos.x, spawn.pos.y, 2)) {
                spawn.recycleCreep(creep)
            } else if (memory.done) {
                moveTo(creep, spawn)
            }
            return;
        }
        const target: ConstructionSite = Game.getObjectById(memory.target) as ConstructionSite;

        if (target === null) {
            memory.target = getCurrentConstruction(creep.room, creep);
            creep.memory = memory;
            return;
        }

        helpAFriend(creep, memory);

        if (creep.store.energy === 0) {
            memory.working = false
        } else {
            memory.working = true
        }

        let building: number = ERR_NOT_IN_RANGE ;
        if (creep.pos.inRangeTo(target.pos.x, target.pos.y, 2) && memory.working) {
            building = creep.build(target)
        }
        if(building === OK) return;
        if (building === ERR_INVALID_TARGET) {
            memory.target = getCurrentConstruction(creep.room, creep);
            creep.memory = memory;
        }
        if (building != OK && building != ERR_NOT_ENOUGH_RESOURCES) {
            building = moveTo(creep, target);
        }
    }
}
