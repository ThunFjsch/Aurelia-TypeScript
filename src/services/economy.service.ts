import { minerBuilder } from "creeps/creepFactory";
import { Miner } from "creeps/mining";
import { Objective, roleContants } from "objectives/objectiveInterfaces";

export const E_FOR_UPGRADER = 0.8;
export const E_FOR_BUILDER = 3;
export const E_FOR_MAINTAINER = 1;
export const HAULER_MULTIPLIER = 2;

export class EconomyService {
  private roomCache: {
    [roomName: string]: {
      income: number;
    };
  } = {};

  getMaxSourceIncome(route: PathFinderPath, energyPerTick: number, spawn: StructureSpawn, room: Room): number {
    const body = minerBuilder({ room, energyPerTick });
    let bodyCost = 0;
    if (energyPerTick === 10 && body.length === 3) {
      bodyCost = this.getBodyCost(body) * 3;
    } else {
      bodyCost = this.getBodyCost(body);
    }
    const eToSpawnMiners = bodyCost / (CREEP_LIFE_TIME - route.cost);
    const haulerParts = (energyPerTick * 2 * route.cost) / CARRY_CAPACITY;

    // Enhanced road efficiency calculation
    let roadEfficiencyBonus = 1.0; // No bonus = 1.0, full road bonus = 0.6
    if (room.memory.hasRoads) {
      // Check if this is a remote room with dedicated roads
      const remoteRoom = Game.rooms[room.name];
      if (remoteRoom && remoteRoom.memory.basePlanner && remoteRoom.memory.basePlanner.stamps) {
        const hasRoads = remoteRoom.memory.basePlanner.stamps.some((s: any) => s.type === STRUCTURE_ROAD);
        if (hasRoads) {
          roadEfficiencyBonus = 0.6; // 40% reduction with remote roads
        } else {
          roadEfficiencyBonus = 0.75; // 25% reduction with basic roads
        }
      } else {
        roadEfficiencyBonus = 0.75; // 25% reduction with basic roads
      }
    }

    const eToSpawnHaulers = (haulerParts * (100 * roadEfficiencyBonus)) / CREEP_LIFE_TIME;
    const containerRepair = room.controller?.my ? 1 : 0.5; // Container repair cost changes if room is under my controle
    const reserveCreepCost = 650; // [CLAIM, MOVE]
    const reserverCost = room.name === spawn.room.name ? 0 : reserveCreepCost / CREEP_CLAIM_LIFE_TIME; // if my room no reserver needed
    const netIncome = energyPerTick - eToSpawnMiners - eToSpawnHaulers - containerRepair - reserverCost;
    return netIncome;
  }

  requiredHaulerParts(ePerTick: number, route: number): number {
    return (ePerTick * HAULER_MULTIPLIER * route) / CARRY_CAPACITY;
  }

  getBodyPartAmount(body: BodyPartDefinition[], bodypart: BodyPartConstant): number {
    return body.filter(part => part.type === bodypart).length;
  }

  getBodyCost(body: BodyPartConstant[]): number {
    let cost = 0;
    for (let i in body) {
      cost += BODYPART_COST[body[i]];
    }
    return cost;
  }

  getCurrentRoomIncome(room: Room, objectives: Objective[]) {
    if (this.roomCache[room.name] === undefined) {
      this.roomCache[room.name] = { income: -1 };
    }
    if (this.roomCache[room.name].income === -1 || Game.time % 25 === 0) {
      let currentIncome = 0;
      let maxIncome = 0;
      objectives.forEach(objective => {
        if (objective.type === roleContants.MINING) maxIncome += objective.maxIncome;
      });
      for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        if (creep.memory.role === roleContants.MINING && creep.memory.home === room.name && creep.memory.working) {
          const memory = creep.memory as MinerMemory;
          const source = Game.getObjectById(memory.sourceId) as Source;
          if (
            source != null &&
            creep.room.name === source.room.name &&
            creep.pos.inRangeTo(source.pos.x, source.pos.y, 1)
          ) {
            currentIncome += this.getBodyPartAmount(creep.body, WORK) * 2;
          }
        }
      }

      if (maxIncome < currentIncome) {
        this.roomCache[room.name].income = maxIncome;
      } else this.roomCache[room.name].income = currentIncome;
    }
    return this.roomCache[room.name].income;
  }
}
