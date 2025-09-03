import { getCurrentConstruction } from "roomManager/constructionManager";
import { moveTo } from "screeps-cartographer";

export class Pioneer {
    run(creep: Creep) {
        const memory = creep.memory as PioneerMemory;
        if(memory.reached === undefined) memory.reached = false;
        if (creep.room.name != memory.target && !memory.reached) {
            const target = new RoomPosition(25, 25, memory.target);
            moveTo(creep, target)
        } else {
            const spawn = creep.room.find(FIND_MY_SPAWNS)[0];
            if(spawn != undefined){
                if(creep.pos.inRangeTo(spawn.pos.x, spawn.pos.y, 1)){
                    spawn.recycleCreep(creep)
                } else moveTo(creep, spawn)
            }
            if(memory.reached === false) memory.reached = true;
            if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                memory.working = true;
                memory.sourceId = undefined
            }
            if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === creep.store.getCapacity(RESOURCE_ENERGY)) {
                memory.working = false;
            }

            if (memory.working) {
                if (memory.cSite === undefined) {
                    memory.cSite = getCurrentConstruction(creep.room, creep);
                } else {
                    const target = Game.getObjectById(memory.cSite) as ConstructionSite;
                    if (target === null) {
                        memory.cSite = getCurrentConstruction(creep.room, creep);
                        creep.memory = memory;
                        return;
                    }

                    if (creep.store.energy === 0) {
                        memory.working = false
                    } else {
                        memory.working = true
                    }

                    let building = -9;
                    if (creep.pos.inRangeTo(target.pos.x, target.pos.y, 2)) {
                        memory.working = true
                        building = creep.build(target)
                    } else memory.working = false;
                    if (building === ERR_INVALID_TARGET) {
                        memory.cSite = getCurrentConstruction(creep.room, creep);
                        creep.memory = memory;
                    }
                    if (building != OK && memory.working === false) {
                        moveTo(creep, target);
                    }
                }
            } else{
                if(memory.sourceId === undefined){
                    memory.sourceId = creep.room.find(FIND_SOURCES_ACTIVE)[0].id
                }
                const source = Game.getObjectById(memory.sourceId) as Source;
                if(source === null) return;
                if(creep.pos.inRangeTo(source.pos.x, source.pos.y, 1)){
                    creep.harvest(source)
                } else{
                    moveTo(creep, source)
                }
            }
        }
        creep.memory = memory;
    }
}
