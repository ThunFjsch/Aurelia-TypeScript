export class Miner {
    run(creep: Creep) {
        const memory = creep.memory as MinerMemory
        const source: Source = Game.getObjectById(memory.sourceId) as Source;

        if (source.energyCapacity > 0) {
            if (creep.harvest(source) != OK) {
                creep.moveTo(source);
            }
        }
    }
}
