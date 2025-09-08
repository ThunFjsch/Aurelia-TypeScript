import BasicCreep from "./creepHelper";

export interface UpgraderMemory extends CreepMemory {
    controllerId: string;
    spawnedRcl: number;
}

export class Upgrader extends BasicCreep{
    run(creep: Creep) {
        const memory = creep.memory as UpgraderMemory
        const controller: StructureController = Game.getObjectById(memory.controllerId) as StructureController;
        const shouldWork = creep.store.energy > 0;

        this.helpAFriend(creep, memory)

        if((creep.room.memory.rclProgress.length != memory.spawnedRcl && creep.room.memory.constructionOffice.finished === false)|| memory.spawnedRcl === undefined){
            const spawn = Game.rooms[memory.home].find(FIND_MY_SPAWNS)[0]
            if(creep.pos.inRangeTo(spawn.pos.x, spawn.pos.y, 1)){
                spawn.recycleCreep(creep)
            } else{
                this.creepPathMove(creep, spawn)
            }
            return
        }

        if (creep.pos.getRangeTo(controller.pos.x, controller.pos.y) <= 2) {
            if (shouldWork) creep.upgradeController(controller);
        } else {
            if (shouldWork) creep.upgradeController(controller);
            this.creepPathMove(creep, controller)
        }
    }
}
