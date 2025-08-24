export interface CoreKillerMemory extends CreepMemory{
    target: string;
}

export class CoreKiller{
    run(creep: Creep){
        const memory = creep.memory as CoreKillerMemory;

        const target = Game.getObjectById(memory.target) as StructureInvaderCore
        if(target != null){
            if(creep.room.name != target.room.name){
                creep.moveTo(target)
            } else{
                if(creep.pos.inRangeTo(target.pos.x, target.pos.y, 1)){
                    creep.attack(target)
                } else creep.moveTo(target)
            }
        }
    }
}
