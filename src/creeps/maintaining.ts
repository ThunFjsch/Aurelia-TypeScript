import { MaintenanceObjective } from "objectives/objectiveInterfaces";
import { ObjectiveManager } from "objectives/objectiveManager";
import { ResourceService } from "services/resource.service";
import { creepPathMove, getEnergy } from "./creepHelper";
import { moveTo } from "screeps-cartographer";
import { PathCachingService } from "services/pathCaching.service";

export class Maintaining {
    objectiveManager: ObjectiveManager
    pathCachingService: PathCachingService;

    constructor(ObjectiveManager: ObjectiveManager, pathCaching: PathCachingService) {
        this.objectiveManager = ObjectiveManager
            this.pathCachingService = pathCaching;
    }

    run(creep: Creep, energyManager: ResourceService) {
        const memory = creep.memory as MaintainerMemory;

        if (creep.store.energy < (creep.store.getCapacity() / 8) + 1) {
            getEnergy(creep, memory as MaintainerMemory, energyManager)
        } else {
            if(creep.room.name != memory.home){
                const target = new RoomPosition(25,25, memory.home)
                moveTo(creep, target)
                return
            }
            if (memory.repairTarget === undefined) {
                this.setNewTarget(creep, memory)
            }
            const target = Game.getObjectById(memory.repairTarget as Id<Structure>) as Structure;
            if(target === null || target.hits === target.hitsMax){
                this.setNewTarget(creep, memory);
                return;
            }
            let repair: number = ERR_NOT_IN_RANGE
            if (creep.pos.inRangeTo(target.pos.x, target.pos.y, 2)) {
                repair = creep.repair(target);
            }
            if (repair === ERR_INVALID_TARGET) {
                this.setNewTarget(creep, memory)
            }
            if (repair != OK) {
                creepPathMove(creep, target as AnyStructure, this.pathCachingService);
            }
        }
    }

    setNewTarget(creep: Creep, memory: MaintainerMemory): void {
        const objective = this.objectiveManager.getRoomObjectives(creep.room)
            .find(objective => objective.type === creep.memory.role && objective.home === creep.memory.home) as MaintenanceObjective;
        if(objective === undefined) return;
        memory.repairTarget = objective.toRepair[0];
        creep.memory = memory;
    }
}
