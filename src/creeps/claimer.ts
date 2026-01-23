import { moveTo } from "screeps-cartographer";
import BasicCreep from "./creepHelper";

export class Claimer extends BasicCreep{
    run(creep: Creep) {
        const memory = creep.memory as ClaimerMemory;
        if (creep.room.name != memory.target && memory.target.length < 7) {
            const exitPos = this.getExitToRoom(creep.room.name, memory.target);
            if(exitPos != undefined && exitPos.x != undefined && exitPos.y != undefined)
                creep.moveTo(exitPos.x, exitPos.y);
        } else {
            const controller = creep.room.controller;
            if (controller != undefined && creep.pos.inRangeTo(controller.pos.x, controller?.pos.y, 1) && !creep.room.controller?.my) {
                creep.claimController(controller);
                creep.signController(controller, "Owo");
                Memory.myRooms.push(creep.room.name)
            } else if (controller) {
                this.creepPathMove(creep, controller)
            }
        }
    }
}
