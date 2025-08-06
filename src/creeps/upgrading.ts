export interface UpgraderMemory extends CreepMemory {
    controllerId: string
}

export class Upgrader {
    run(creep: Creep) {
        const memory = creep.memory as UpgraderMemory
        const controller: StructureController = Game.getObjectById(memory.controllerId) as StructureController;
        if (creep.pos.getRangeTo(controller.pos.x, controller.pos.y) <= 2) {
            creep.upgradeController(controller);
        } else {
            creep.upgradeController(controller);
            creep.moveTo(controller.pos.x, controller.pos.y, { reusePath: 15 })
        }
    }
}
