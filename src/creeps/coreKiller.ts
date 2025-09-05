import { PathCachingService } from "services/pathCaching.service";
import { creepPathMove } from "./creepHelper";
import { moveTo } from "screeps-cartographer";

export interface CoreKillerMemory extends CreepMemory{
    target: string;
}

export class CoreKiller{
    pathCachingService: PathCachingService;

        constructor(pathCaching: PathCachingService) {
            this.pathCachingService = pathCaching;
        }
    run(creep: Creep){
        const memory = creep.memory as CoreKillerMemory;

        const target = Game.getObjectById(memory.target) as StructureInvaderCore
        if(target != null){
            if(creep.room.name != target.room.name){
                creepPathMove(creep, target, this.pathCachingService)
            } else{
                if(creep.pos.inRangeTo(target.pos.x, target.pos.y, 1)){
                    creep.attack(target)
                } else creepPathMove(creep, target, this.pathCachingService)
            }
        } else{
            if(creep.room.name != memory.home){
                const to = new RoomPosition(25,25,memory.home)
                moveTo(creep, to)
            } else{
                const spawn = creep.room.find(FIND_MY_SPAWNS)[0]
                if(creep.pos.inRangeTo(spawn.pos.x, spawn.pos.y, 1)){
                    spawn.recycleCreep(creep);
                } else{
                    creepPathMove(creep, spawn, this.pathCachingService)
                }
            }
        }
    }
}
