import { moveTo } from "screeps-cartographer";
import BasicCreep from "./creepHelper";

export class Reserving extends BasicCreep{
    run(creep: Creep){
        const memory = creep.memory as ReservMemory
        if(creep.room.name != memory.targetRoom){
            const controller = Game.rooms[memory.targetRoom]?.controller
            if(controller != undefined){
                this.creepPathMove(creep, controller)
            } else{
                const exitPos = this.getExitToRoom(creep.room.name, (creep.memory as ReservMemory).targetRoom);
            if(exitPos != undefined && exitPos.x != undefined && exitPos.y != undefined)
                creep.moveTo(exitPos.x, exitPos.y, {maxOps: 20000});
            }
        } else{
            const controller = creep.room.controller
            if(controller === undefined) return
            if(memory.target === undefined) {
                memory.target = controller.id
            }
            this.getInTargetRange(creep, (target: StructureController) => {creep.reserveController(target)}, 1)
        }
    }
}
