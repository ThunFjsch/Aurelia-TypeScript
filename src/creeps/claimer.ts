export class Claimer {
    run(creep: Creep){
        const memory = creep.memory as ClaimerMemory;
        if(creep.room.name != memory.target){
            const target = new RoomPosition(25,25, memory.target);
            creep.moveTo(target, {reusePath: 50})
        } else{
            const controller = creep.room.controller;
            if(controller != undefined && creep.pos.inRangeTo(controller.pos.x, controller?.pos.y, 1) && !creep.room.controller?.my){
                creep.claimController(controller);
                creep.signController(controller, "Owo");
                Memory.myRooms.push(creep.room.name)
            } else if(controller){
                creep.moveTo(controller)
            }
        }
    }
}
