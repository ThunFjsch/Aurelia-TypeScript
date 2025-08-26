import { helpAFriend } from "./creepHelper";

export interface UpgraderMemory extends CreepMemory {
    controllerId: string;
    spawnedRcl: number;
}

export class Upgrader {
    run(creep: Creep) {
        const memory = creep.memory as UpgraderMemory
        const controller: StructureController = Game.getObjectById(memory.controllerId) as StructureController;
        const shouldWork = creep.store.energy > 0;

        helpAFriend(creep, memory)

        if(creep.room.memory.rclProgress.length != memory.spawnedRcl || memory.spawnedRcl === undefined){
            const spawn = Game.rooms[memory.home].find(FIND_MY_SPAWNS)[0]
            if(creep.pos.inRangeTo(spawn.pos.x, spawn.pos.y, 1)){
                spawn.recycleCreep(creep)
            } else{
                creep.moveTo(spawn)
            }
            return
        }

        if (creep.pos.getRangeTo(controller.pos.x, controller.pos.y) <= 2) {
            if (shouldWork) creep.upgradeController(controller);
        } else {
            if (shouldWork) creep.upgradeController(controller);
            creep.moveTo(controller.pos.x, controller.pos.y, { reusePath: 15 })
        }
    }
}
