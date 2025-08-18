export class Miner {
    run(creep: Creep) {
        const memory = creep.memory as MinerMemory
        const source: Source = Game.getObjectById(memory.sourceId) as Source;

        if(creep.room.name != memory.targetRoom){
            const target = new RoomPosition(25,25,memory.targetRoom)
            creep.moveTo(target);
            return;
        }

        if (source.energyCapacity > 0) {
            let harvest = -6;
            if(creep.pos.inRangeTo(source.pos.x, source.pos.y, 1)){
                if(memory.containerPos != undefined && (creep.pos.x != memory.containerPos.x || creep.pos.y != memory.containerPos.y)){
                    creep.moveTo(memory.containerPos.x, memory.containerPos.y);
                }
                harvest = creep.harvest(source);
            }
            if (harvest != OK) {
                if(memory.containerPos != undefined && (memory.containerPos.x || creep.pos.y != memory.containerPos.y)){
                    creep.moveTo(memory.containerPos.x, memory.containerPos.y);
                } else{
                    creep.moveTo(source);
                }
            } else{
                if(memory.working === false){
                    memory.working = true;
                    creep.memory = memory;
                    return
                }
            }
        }
    }
}
