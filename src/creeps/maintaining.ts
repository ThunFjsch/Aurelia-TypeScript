import { MaintenanceObjective } from "objectives/objectiveInterfaces";
import { ObjectiveManager } from "objectives/objectiveManager";
import { ResourceService } from "services/resource.service";
import BasicCreep from "./creepHelper";
import { moveTo } from "screeps-cartographer";
import { PathCachingService } from "services/pathCaching.service";

export class Maintaining extends BasicCreep {
  objectiveManager: ObjectiveManager;

  constructor(objectiveManager: ObjectiveManager, pathCaching: PathCachingService) {
    super(pathCaching);
    this.objectiveManager = objectiveManager;
  }

  run(creep: Creep, energyManager: ResourceService) {
    const memory = creep.memory as MaintainerMemory;

    // Always try to repair when alive, get energy only when completely empty
    if (creep.room.name != memory.home && creep.store.getFreeCapacity() === 0) {
      const target = Game.getObjectById(memory.homeSpawn) as StructureSpawn;
      moveTo(creep, target);
      return;
    }

    // Get energy only when completely empty, but continue repair work otherwise
    if (creep.store.energy === 0) {
      this.getEnergy(creep, memory as MaintainerMemory, energyManager);
      return;
    }

    // Always try to repair - update target if needed
    if (memory.repairTarget === undefined) {
      this.setNewTarget(creep, memory);
    }

    const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: s => (s as AnyStructure).hits < (s as AnyStructure).hitsMax})// Game.getObjectById(memory.repairTarget as Id<Structure>) as Structure;

    // If target is invalid or fully repaired, find a new one
    if (target === null || target.hits >= target.hitsMax) {
      this.setNewTarget(creep, memory);
      return;
    }

    // Try to repair - use any available energy
    let repair: number = ERR_NOT_IN_RANGE;
    if (creep.pos.inRangeTo(target.pos.x, target.pos.y, 3)) {
      repair = creep.repair(target);
    }

    if (repair === ERR_INVALID_TARGET) {
      this.setNewTarget(creep, memory);
      return;
    }

    // Move to target if not in range, or if repair succeeded but we still have energy
    if (repair === ERR_NOT_IN_RANGE) {
      this.creepPathMove(creep, target as AnyStructure);
    } else if (repair === OK && creep.store.energy > 0) {
      // Continue repairing if we have energy and target still needs repair
      // This allows continuous repair even with low energy
    }
  }

  setNewTarget(creep: Creep, memory: MaintainerMemory): void {
    const objective = this.objectiveManager
      .getRoomObjectives(creep.room)
      .find(
        objective => objective.type === creep.memory.role && objective.home === creep.memory.home
      ) as MaintenanceObjective;
    if (objective === undefined) return;

    // Find structure with lowest hits ratio (normalized) instead of just lowest hits
    let bestTarget: string | undefined = undefined;
    let lowestRatio = 1.0; // Start with 100% (fully repaired)

    for (const structureId of objective.toRepair) {
      const structure = Game.getObjectById(structureId as Id<Structure>) as Structure | null;
      if (structure === null) continue;

      // Skip if already fully repaired
      if (structure.hits >= structure.hitsMax) continue;

      // Calculate hits ratio (lower is worse, needs more repair)
      const hitsRatio = structure.hits / structure.hitsMax;

      if (hitsRatio < lowestRatio) {
        lowestRatio = hitsRatio;
        bestTarget = structureId;
      }
    }

    if (bestTarget) {
      memory.repairTarget = bestTarget;
      creep.memory = memory;
    }
  }
}
