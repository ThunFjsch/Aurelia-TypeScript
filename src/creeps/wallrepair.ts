import { MaintenanceObjective } from "objectives/objectiveInterfaces";
import { ObjectiveManager } from "objectives/objectiveManager";
import { ResourceService } from "services/resource.service";
import BasicCreep from "./creepHelper";
import { moveTo } from "screeps-cartographer";
import { PathCachingService } from "services/pathCaching.service";


const wallLimits = [0, 0, 0, 0, 0, 150000, 500000, 2000000, 5000000];

export class WallRepair extends BasicCreep{
    objectiveManager: ObjectiveManager

    constructor(ObjectiveManager: ObjectiveManager, pathCaching: PathCachingService) {
        super(pathCaching)
        this.objectiveManager = ObjectiveManager
    }

    run(creep: Creep, energyManager: ResourceService) {
        const memory = creep.memory as WallRepairMemory;

        if (creep.store.energy === 0) {
            memory.repairTarget = undefined
            this.getEnergy(creep, memory as WallRepairMemory, energyManager)
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
            if(target === null || target === undefined || target.hits === wallLimits[creep.room.controller?.level??0]){
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
                this.creepPathMove(creep, target as AnyStructure);
            }
        }
    }

    setNewTarget(creep: Creep, memory: MaintainerMemory): void {
        const target = creep.room.find(FIND_STRUCTURES).filter(s => s.structureType === STRUCTURE_RAMPART && s.hits < wallLimits[creep.room.controller?.level?? 0]).sort((a, b) => a.hits - b.hits)[0].id
        memory.repairTarget = target;
        creep.memory = memory;
    }
}
