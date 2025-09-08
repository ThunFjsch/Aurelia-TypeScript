import { getCurrentConstruction } from "roomManager/constructionManager";
import BasicCreep from "./creepHelper";
import { moveTo } from "screeps-cartographer";

export class Building extends BasicCreep{

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
                this.creepPathMove(creep, spawn)
            }
            return;
        }
        const target: ConstructionSite = Game.getObjectById(memory.target) as ConstructionSite;

        if (target === null) {
            memory.target = getCurrentConstruction(creep.room, creep);
            creep.memory = memory;
            return;
        }

        if (creep.pos.x === target.pos.x && creep.pos.y === target.pos.y) {
            moveTo(creep, new RoomPosition(32, 33, creep.room.name))
            return;
        }

        this.helpAFriend(creep, memory);

        const doInRange = (target: ConstructionSite) => {creep.build(target)}

        if (creep.store.energy === 0) {
            memory.working = false
        } else {
            memory.working = true
        }

        this.getInTargetRange(creep, doInRange, 2);
    }
}
