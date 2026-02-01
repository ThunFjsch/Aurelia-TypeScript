import { moveTo } from "screeps-cartographer";

export type RCL = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type StructureAmount = Partial<Record<StructureConstant, number>>;

type RCLAvailableStructures = Record<number, StructureAmount>;

const rclAvailableStructures: RCLAvailableStructures = {
  1: {
    [STRUCTURE_SPAWN]: 1
  },
  2: {
    [STRUCTURE_EXTENSION]: 5,
    [STRUCTURE_CONTAINER]: 4,
  },
  3: {
    [STRUCTURE_EXTENSION]: 10,
    [STRUCTURE_CONTAINER]: 4,
    [STRUCTURE_TOWER]: 0,
    [STRUCTURE_ROAD]: Infinity
  },
  4: {
    [STRUCTURE_EXTENSION]: 20,
    [STRUCTURE_CONTAINER]: 5,
    [STRUCTURE_TOWER]: 0,
    [STRUCTURE_STORAGE]: 0,
    [STRUCTURE_ROAD]: Infinity
  },
  5: {
    [STRUCTURE_EXTENSION]: 30,
    [STRUCTURE_CONTAINER]: 5,
    [STRUCTURE_TOWER]: 2,
    [STRUCTURE_STORAGE]: 1,
    [STRUCTURE_ROAD]: 150,
    [STRUCTURE_RAMPART]: Infinity
  },
  6: {
    [STRUCTURE_EXTENSION]: 40,
    [STRUCTURE_CONTAINER]: 5,
    [STRUCTURE_TOWER]: 2,
    [STRUCTURE_STORAGE]: 1,
    [STRUCTURE_ROAD]: 300,
    [STRUCTURE_RAMPART]: Infinity,
    [STRUCTURE_EXTRACTOR]: 1,
    [STRUCTURE_LAB]: 3,
    [STRUCTURE_TERMINAL]: 1
  },
  7: {
    [STRUCTURE_EXTENSION]: 50,
    [STRUCTURE_CONTAINER]: 5,
    [STRUCTURE_TOWER]: 3,
    [STRUCTURE_STORAGE]: 1,
    [STRUCTURE_ROAD]: 300,
    [STRUCTURE_RAMPART]: Infinity,
    [STRUCTURE_EXTRACTOR]: 1,
    [STRUCTURE_LAB]: 6,
    [STRUCTURE_TERMINAL]: 1,
    [STRUCTURE_FACTORY]: 1
  },
  8: {
    [STRUCTURE_EXTENSION]: 60,
    [STRUCTURE_CONTAINER]: 5,
    [STRUCTURE_TOWER]: 6,
    [STRUCTURE_STORAGE]: 1,
    [STRUCTURE_ROAD]: 300,
    [STRUCTURE_RAMPART]: Infinity,
    [STRUCTURE_EXTRACTOR]: 1,
    [STRUCTURE_LAB]: 10,
    [STRUCTURE_TERMINAL]: 1,
    [STRUCTURE_FACTORY]: 1,
    [STRUCTURE_OBSERVER]: 1,
    [STRUCTURE_POWER_SPAWN]: 1,
    [STRUCTURE_NUKER]: 1
  }
};

export class ConstrcutionManager {
  run(room: Room) {
    this.checkMemory(room);
    const controller = room.controller;
    if (controller === undefined || controller.my === false) return;
    const rcl = controller.level as RCL;

    if (
      room.memory.constructionOffice.lastJob < rcl &&
      room.memory.constructionOffice.finished &&
      room.memory.constructionOffice.plans.length === 0
    ) {
      this.checkForConstruction(room, rcl);
    } else if (
      room.memory.constructionOffice.lastJob === rcl &&
      room.memory.constructionOffice.finished === false &&
      room.memory.constructionOffice.plans.length === 0
    ) {
      room.memory.constructionOffice.finished = true;
    } else if (room.memory.constructionOffice.lastJob === rcl && room.memory.constructionOffice.plans.length > 0) {
      //&& room.memory.constructionOffice.finished == false
      const cSites = room.find(FIND_CONSTRUCTION_SITES);
      if (cSites != undefined && cSites.length === 0) {
        const nextPlan = room.memory.constructionOffice.plans[0];
        if (nextPlan === null) return (room.memory.constructionOffice.finished = true);

        if (this.isPositionBlocked(room, nextPlan.x, nextPlan.y)) {
          room.memory.constructionOffice.plans.shift();
        }

        room
          .lookAt(nextPlan.x, nextPlan.y)
          .filter(e => e.creep != undefined)
          .forEach(c => {
            if (c.creep != undefined) {
              moveTo(c.creep, new RoomPosition(25, 25, room.name));
            }
          });
        const build = room.createConstructionSite(nextPlan.x, nextPlan.y, nextPlan.type as BuildableStructureConstant);
        if (build === ERR_INVALID_TARGET || build === ERR_RCL_NOT_ENOUGH) {
          room.memory.constructionOffice.plans.shift();
        }
      }
    } else if (room.memory.constructionOffice.finished && room.memory.constructionOffice.lastJob === rcl) {
      if (Game.time % 1000 === 0) {
        this.checkForConstruction(room, rcl);
      }
    }
    return;
  }

  private checkMemory(room: Room) {
    if (room.memory.constructionOffice === undefined) {
      room.memory.constructionOffice = {
        finished: true,
        lastJob: 1,
        plans: []
      };
    }
  }

  private checkForConstruction(room: Room, rcl: RCL) {
    const structures = room.find(FIND_STRUCTURES);
    const currentStructures: StructureAmount = this.getCurrentStructures(structures);
    const remainingStructure = this.getRemainingStructure(rcl, currentStructures);
    const memory = room.memory;
    for (let index in remainingStructure) {
      let remaining = remainingStructure[index as StructureConstant] ?? 0;
      if (remaining > 0) {
        if (memory.basePlanner.stamps === undefined) {
          memory.basePlanner.stamps = [];
        }
        for (let stamp of memory.basePlanner.stamps) {
          if (stamp.type != index || ((stamp.requiredRCL?? 5) > rcl) && stamp.type === STRUCTURE_ROAD) continue;
          const structures = room
            .lookAt(stamp.x, stamp.y)
            .find(look => look.structure?.structureType === index && look.structure?.structureType === stamp.type);
          if (remaining > 0 && structures === undefined) {
            memory.constructionOffice.plans.push(stamp);
            remaining--;
          }
        }
      }
    }
    if (memory.constructionOffice.plans.length > 0) {
      room.memory.constructionOffice.finished = false;
      room.memory.constructionOffice.plans = memory.constructionOffice.plans;
      room.memory.constructionOffice.lastJob = rcl;
    }
  }

  private getCurrentStructures(structures: AnyStructure[]) {
    return {
      spawn: this.filterForStructure(structures, STRUCTURE_SPAWN),
      tower: this.filterForStructure(structures, STRUCTURE_TOWER),
      extension: this.filterForStructure(structures, STRUCTURE_EXTENSION),
      container: this.filterForStructure(structures, STRUCTURE_CONTAINER),
      rampart: this.filterForStructure(structures, STRUCTURE_RAMPART),
      terminal: this.filterForStructure(structures, STRUCTURE_TERMINAL),
      lab: this.filterForStructure(structures, STRUCTURE_LAB),
      road: this.filterForStructure(structures, STRUCTURE_ROAD),
      storagge: this.filterForStructure(structures, STRUCTURE_STORAGE),
      extractor: this.filterForStructure(structures, STRUCTURE_EXTRACTOR),
      factory: this.filterForStructure(structures, STRUCTURE_FACTORY),
      observer: this.filterForStructure(structures, STRUCTURE_OBSERVER),
      nuker: this.filterForStructure(structures, STRUCTURE_NUKER),
      powerSpawn: this.filterForStructure(structures, STRUCTURE_POWER_SPAWN)
    };
  }

  private getRemainingStructure(rcl: number, currentStructures: StructureAmount) {
    const rclStructs = rclAvailableStructures[rcl];

    const remainingStructure: StructureAmount = {
      spawn: (rclStructs[STRUCTURE_SPAWN] ?? 0) - (currentStructures.spawn ?? 0),
      storage: (rclStructs[STRUCTURE_STORAGE] ?? 0) - (currentStructures.storage ?? 0),
      extension: (rclStructs[STRUCTURE_EXTENSION] ?? 0) - (currentStructures.extension ?? 0),
      container: (rclStructs[STRUCTURE_CONTAINER] ?? 0) - (currentStructures.container ?? 0),
      tower: (rclStructs[STRUCTURE_TOWER] ?? 0) - (currentStructures.tower ?? 0),
      rampart: (rclStructs[STRUCTURE_RAMPART] ?? 0) - (currentStructures.rampart ?? 0),
      terminal: (rclStructs[STRUCTURE_TERMINAL] ?? 0) - (currentStructures.terminal ?? 0),
      lab: (rclStructs[STRUCTURE_LAB] ?? 0) - (currentStructures.lab ?? 0),
      road: (rclStructs[STRUCTURE_ROAD] ?? 0) - (currentStructures.road ?? 0),
      extractor: (rclStructs[STRUCTURE_EXTRACTOR] ?? 0) - (currentStructures.extractor ?? 0),
      factory: (rclStructs[STRUCTURE_EXTRACTOR] ?? 0) - (currentStructures.extractor ?? 0),
      observer: (rclStructs[STRUCTURE_OBSERVER] ?? 0) - (currentStructures.observer ?? 0),
      nuker: (rclStructs[STRUCTURE_NUKER] ?? 0) - (currentStructures.nuker ?? 0),
      powerSpawn: (rclStructs[STRUCTURE_POWER_SPAWN] ?? 0) - (currentStructures.powerSpawn ?? 0)
    };

    return remainingStructure;
  }

  private filterForStructure(structures: AnyStructure[], constant: StructureConstant) {
    return structures.filter(structure => structure.structureType === constant).length;
  }

  private isPositionBlocked(room: Room, x: number, y: number): boolean {
    // Check terrain first (most efficient)
    const terrain = room.getTerrain();
    if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
      return true;
    }

    // Check for existing structures that would block construction
    const structures = room.lookForAt(LOOK_STRUCTURES, x, y);
    return structures.some(structure => structure.structureType === STRUCTURE_WALL);
  }
}

export function getCurrentConstruction(room: Room, creep?: Creep): ConstructionSite | null {
  const cSite = room.find(FIND_CONSTRUCTION_SITES)[0];
  if (room.memory.constructionOffice != undefined && room.memory.constructionOffice.finished && creep != undefined) {
    (creep.memory as BuilderMemory).done = true;
    return null;
  }
  if (cSite === undefined) return null;
  return cSite;
}
