import { helpAFriend } from "./creepHelper";

export interface UpgraderMemory extends CreepMemory {
    controllerId: string
}

export class Upgrader {
    run(creep: Creep) {
        const memory = creep.memory as UpgraderMemory
        const controller: StructureController = Game.getObjectById(memory.controllerId) as StructureController;
        const shouldWork = creep.store.energy > 0;

        helpAFriend(creep, memory)

        if (creep.pos.getRangeTo(controller.pos.x, controller.pos.y) <= 2) {
            if (shouldWork) creep.upgradeController(controller);
        } else {
            if (shouldWork) creep.upgradeController(controller);
            creep.moveTo(controller.pos.x, controller.pos.y, { reusePath: 15 })
        }
    }
}
