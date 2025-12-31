import { moveTo } from "screeps-cartographer";
import BasicCreep from "./creepHelper";

export class Miner extends BasicCreep{
    run(creep: Creep) {
        const memory = creep.memory as MinerMemory
        const source: Source = Game.getObjectById(memory.sourceId) as Source;

        if (creep.room.name != memory.targetRoom) {
            if (source === null || source === undefined || source.pos === undefined) {
                const exitPos = this.getExitToRoom(creep.room.name, (creep.memory as MinerMemory).targetRoom);
            if(exitPos != undefined && exitPos.x != undefined && exitPos.y != undefined)
                creep.moveTo(exitPos.x, exitPos.y);
                return;
            } else {
                this.creepPathMove(creep, source)
                return;
            }

        } else if (creep.room.name === memory.targetRoom) {
            if (source != null && source.energyCapacity > 0) {
                let harvest = -6;
                if (creep.pos.inRangeTo(source.pos.x, source.pos.y, 1)) {
                    if (memory.containerPos != undefined && (creep.pos.x != memory.containerPos.x || creep.pos.y != memory.containerPos.y)) {
                        moveTo(creep, new RoomPosition(memory.containerPos.x, memory.containerPos.y, creep.room.name), {maxOps: 20000});
                    }
                    harvest = creep.harvest(source);
                }
                if (harvest != OK) {
                    if (memory.containerPos != undefined) {
                        const containerPos = new RoomPosition(memory.containerPos.x, memory.containerPos.y, creep.room.name);
                        if (memory.containerPos != undefined && creep.pos === containerPos) {
                        } else if (creep.pos.inRangeTo(containerPos.x, containerPos.y, 2)) {
                            creep.moveTo(containerPos)
                        } else moveTo(creep, containerPos)
                    } else {
                        if (creep.pos.inRangeTo(source.pos.x, source.pos.y, 2)) {
                            creep.moveTo(source)
                        } else this.creepPathMove(creep, source)
                    }
                } else {
                    if (memory.working === false) {
                        memory.working = true;
                        creep.memory = memory;
                        return
                    }
                }
            }
        }
    }
}
