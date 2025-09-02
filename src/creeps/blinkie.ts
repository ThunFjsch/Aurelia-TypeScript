export class Blinkie{
    run(creep: Creep){
        const memory = creep.memory as BlinkieMemory
        if(creep.room.name != memory.target){
            const target = new RoomPosition(25,25, memory.target)
            creep.moveTo(target, {reusePath: 15})
        } else{
            const hostiles = creep.room.find(FIND_HOSTILE_CREEPS)
            const hostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
            if(hostile){
                if(creep.pos.inRangeTo(hostile.pos.x, hostile.pos.y, 1)){
                    creep.moveTo(25,25)
                    creep.rangedAttack(hostile)
                    creep.heal(creep);
                    return;
                }
                if(creep.pos.inRangeTo(hostile.pos.x, hostile.pos.y, 2)){
                    creep.rangedAttack(hostile)
                    creep.heal(creep);
                    return
                }
                if(creep.pos.inRangeTo(hostile.pos.x, hostile.pos.y, 3)){
                    creep.heal(creep);
                    return
                }
                creep.moveTo(hostile)
            }
        }
    }
}
