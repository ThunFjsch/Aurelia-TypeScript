import BasicCreep from "./creepHelper";
import { moveTo } from "screeps-cartographer";

export interface CoreKillerMemory extends CreepMemory{
    target: string;
}

export class CoreKiller extends BasicCreep{
    run(creep: Creep){
        const memory = creep.memory as CoreKillerMemory;

        const target = Game.getObjectById(memory.target) as StructureInvaderCore
        if(target != null && target != undefined){
            if(creep.room.name != target.room.name){
                this.creepPathMove(creep, target)
            } else{
                if(creep.pos.inRangeTo(target.pos.x, target.pos.y, 1)){
                    creep.attack(target)
                } else this.creepPathMove(creep, target)
            }
        } else{
            if(creep.room.name != memory.home){
                const to = new RoomPosition(25,25,memory.home)
                moveTo(creep, to, {maxOps: 20000})
            } else{
                const spawn = creep.room.find(FIND_MY_SPAWNS)[0]
                if(creep.pos.inRangeTo(spawn.pos.x, spawn.pos.y, 1)){
                    spawn.recycleCreep(creep);
                } else{
                    this.creepPathMove(creep, spawn)
                }
            }
        }
    }
}
