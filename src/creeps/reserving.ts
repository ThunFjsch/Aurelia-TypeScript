export class Reserving{
    run(creep: Creep){
        const memory = creep.memory as ReservMemory
        if(creep.room.name != memory.target){
            const target = new RoomPosition(25,25, memory.target);
            creep.moveTo(target)
        } else{
            const controller = creep.room.controller
            if(controller === undefined) return
            if(creep.pos.inRangeTo(controller.pos.x, controller.pos.y, 1)){
                creep.reserveController(controller);
            } else creep.moveTo(controller)
        }
    }
}
