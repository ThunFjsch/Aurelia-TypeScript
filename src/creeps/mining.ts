export class Miner {
    run(creep: Creep) {
        const memory = creep.memory as MinerMemory
        const source: Source = Game.getObjectById(memory.sourceId) as Source;

        if (source.energyCapacity > 0) {
            let harvest = -6;
            if(creep.pos.inRangeTo(source.pos.x, source.pos.y, 1)){
                harvest = creep.harvest(source);
            }
            if (harvest != OK) {
                creep.moveTo(source);
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
