import { MaintenanceObjective } from "objectives/objectiveInterfaces";
import { ObjectiveManager } from "objectives/objectiveManager";
import { ResourceService } from "services/resource.service";
import { getEnergy } from "./creepHelper";

export class Maintaining {
    objectiveManager: ObjectiveManager
    constructor(ObjectiveManager: ObjectiveManager) {
        this.objectiveManager = ObjectiveManager
    }

    run(creep: Creep, energyManager: ResourceService) {
        const memory = creep.memory as MaintainerMemory;

        if (creep.store.energy < (creep.store.getCapacity() / 8) + 1) {
            getEnergy(creep, memory, energyManager)
        } else {
            if (memory.repairTarget === undefined) {
                this.setNewTarget(creep, memory)
            }
            const target = Game.getObjectById(memory.repairTarget as Id<Structure>) as Structure;
            let repair: number = ERR_NOT_IN_RANGE
            if (creep.pos.inRangeTo(target.pos.x, target.pos.y, 2)) {
                repair = creep.repair(target);
            }
            if (repair === ERR_INVALID_TARGET) {
                this.setNewTarget(creep, memory)
            }
            if (repair != OK) {
                creep.moveTo(target);
            }
        }
    }

    setNewTarget(creep: Creep, memory: MaintainerMemory): void {
        const objective = this.objectiveManager.getRoomObjectives(creep.room)
            .find(objective => objective.type === creep.memory.role && objective.home === creep.memory.home) as MaintenanceObjective;
        memory.repairTarget = objective.toRepair[0];
        creep.memory = memory;
    }
}
