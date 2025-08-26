export class FastFilling{
    run(creep: Creep){
        const memory = creep.memory as FastFillerMemory;
        if(creep.store.getUsedCapacity(RESOURCE_ENERGY) < (creep.store.getFreeCapacity()/2) && memory.supply != undefined){
            const container = Game.getObjectById(memory.supply) as StructureContainer;
            if(container != null && container.store.getUsedCapacity(RESOURCE_ENERGY) > 200){
                creep.withdraw(container, RESOURCE_ENERGY)
            }
        }
        if(creep.pos.x === memory.pos.x && creep.pos.y === memory.pos.y){
            const extensions: StructureExtension[] = []
            creep.room.lookAtArea(creep.pos.y - 1, creep.pos.x - 1, creep.pos.y + 1, creep.pos.x + 1, true)
                        .forEach(item => {
                            if(item.structure != undefined && (item.structure.structureType === STRUCTURE_EXTENSION || item.structure.structureType === STRUCTURE_SPAWN)){
                                extensions.push(item.structure as StructureExtension)
                            }
                        });
            for(let extension of extensions){
                if(extension.store.getFreeCapacity(RESOURCE_ENERGY) > 0){
                    creep.transfer(extension, RESOURCE_ENERGY)
                    return
                }
            }
        } else{
            creep.moveTo(memory.pos.x, memory.pos.y)
        }
    }
}
