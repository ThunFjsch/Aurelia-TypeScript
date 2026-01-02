import BasicCreep from "./creepHelper";
import { moveTo } from "screeps-cartographer";

export class Blinkie extends BasicCreep{
    run(creep: Creep){
        const memory = creep.memory as BlinkieMemory
        if(creep.room.name != memory.target){
            const exitPos = this.getExitToRoom(creep.room.name, memory.target);
            if(exitPos != undefined && exitPos.x != undefined && exitPos.y != undefined)
                creep.moveTo(exitPos.x, exitPos.y);
        } else{
            const hostiles = creep.room.find(FIND_HOSTILE_CREEPS)
            const hostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
            if(hostile){
                if(creep.body.find(c => c.type === ATTACK)){
                    if(creep.pos.inRangeTo(hostile.pos.x, hostile.pos.y, 1)){
                        creep.rangedAttack(hostile)
                        creep.heal(creep);
                        creep.attack(hostile)
                    }
                } else {
                    if(creep.pos.inRangeTo(hostile.pos.x, hostile.pos.y, 1)){
                        creep.rangedAttack(hostile)
                        creep.heal(creep);
                        let path = PathFinder.search(creep.pos, hostiles.map(c=>{return{pos:c.pos,range:3}},{flee:true})).path
                        creep.moveByPath(path)
                    } if(creep.pos.inRangeTo(hostile.pos.x, hostile.pos.y, 2)){
                        creep.rangedAttack(hostile)
                        creep.heal(creep);
                        return
                    }
                    if(creep.pos.inRangeTo(hostile.pos.x, hostile.pos.y, 3)){
                        creep.heal(creep);
                        return
                    }
                }
                this.creepPathMove(creep, hostile)
            }
        }
    }
}
