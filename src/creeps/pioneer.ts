import { getCurrentConstruction } from "roomManager/constructionManager";
import { moveTo } from "screeps-cartographer";
import BasicCreep from "./creepHelper";

export class Pioneer extends BasicCreep{
    run(creep: Creep) {
        const memory = creep.memory as PioneerMemory;
        if (memory.reached === undefined) memory.reached = false;
        if (creep.room.name != memory.target && !memory.reached && memory.target.length < 7) {
            const exitPos = this.getExitToRoom(creep.room.name, memory.target);
            if(exitPos != undefined && exitPos.x != undefined && exitPos.y != undefined)
                creep.moveTo(exitPos.x, exitPos.y);
        } else {
            const spawn = creep.room.find(FIND_MY_SPAWNS)[0];
            if (spawn != undefined) {
                if (creep.pos.inRangeTo(spawn.pos.x, spawn.pos.y, 1)) {
                    spawn.recycleCreep(creep)
                } else this.creepPathMove(creep, spawn)
            }
            if (memory.reached === false) memory.reached = true;
            if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                memory.working = true;
                memory.sourceId = undefined
            }
            if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === creep.store.getCapacity(RESOURCE_ENERGY)) {
                memory.working = false;
            }

            if (memory.working) {
                if (memory.cSite === undefined) {
                    memory.cSite = getCurrentConstruction(creep.room, creep)?.id;
                    memory.target = memory.cSite ?? "0000000000";
                } else {
                    const target = Game.getObjectById(memory.cSite) as ConstructionSite;
                    if (target === null) {
                        memory.cSite = getCurrentConstruction(creep.room, creep)?.id;
                        creep.memory = memory;
                        return;
                    }

                    if (creep.store.energy === 0) {
                        memory.working = false
                    } else {
                        memory.working = true
                    }

                    const construct = (creep: Creep) => {
                        let building = creep.build(target)
                        if (building === ERR_INVALID_TARGET) {
                            memory.cSite = getCurrentConstruction(creep.room, creep)?.id;
                            creep.memory = memory;
                        }
                    }

                    if (creep.pos.getRangeTo(target.pos) <= 2) {
                        construct(creep);
                    } else {
                        this.creepPathMove(creep, target);
                    }
                }
            } else {
                if (memory.sourceId === undefined) {
                    const sourceId = creep.room.find(FIND_SOURCES_ACTIVE)[1];
                    if(sourceId != undefined)
                        memory.sourceId = sourceId.id
                } else {
                    const source = Game.getObjectById(memory.sourceId) as Source;
                    if (source === null || source.energy === 0) return;
                    if (creep.pos.inRangeTo(source.pos.x, source.pos.y, 1)) {
                        creep.harvest(source)
                    } else {
                        moveTo(creep, source)
                    }
                }
            }
        }
        creep.memory = memory;
    }
}
