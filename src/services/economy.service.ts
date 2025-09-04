import { minerBuilder } from "creeps/creepFactory";
import { Objective, roleContants } from "objectives/objectiveInterfaces";

export const E_FOR_UPGRADER = 1.3;
export const E_FOR_BUILDER = 6;
export const E_FOR_MAINTAINER = 1;
export const HAULER_MULTIPLIER = 1.4;

export class EconomyService {
    getMaxSourceIncome(route: PathFinderPath, energyPerTick: number, spawn: StructureSpawn, room: Room): number {
        const body = minerBuilder({ room, energyPerTick })
        let bodyCost = 0;
        if (energyPerTick === 10 && body.length === 3) {
            bodyCost = this.getBodyCost(body) * 3
        } else {
            bodyCost = this.getBodyCost(body);
        }
        const eToSpawnMiners = bodyCost / (CREEP_LIFE_TIME - route.cost)
        const haulerParts = energyPerTick * 2 * route.cost / CARRY_CAPACITY
        const eToSpawnHaulers = (haulerParts * (room.memory.hasRoads ? 75 : 100)) / CREEP_LIFE_TIME;
        const containerRepair = room.controller?.my ? 1 : 0.5;  // Container repair cost changes if the room is under my controle
        const reserveCreepCost = 650;  // [CLAIM, MOVE]
        const reserverCost = (room.name === spawn.room.name) ? 0 : (reserveCreepCost / CREEP_CLAIM_LIFE_TIME);    // if my room no reserver needed
        const netIncome = energyPerTick - eToSpawnMiners - eToSpawnHaulers - containerRepair - reserverCost;
        return netIncome
    }

    requiredHaulerParts(ePerTick: number, route: number): number {
        return ePerTick * HAULER_MULTIPLIER * route / CARRY_CAPACITY;
    }

    getBodyPartAmount(body: BodyPartDefinition[], bodypart: BodyPartConstant): number {
        return body.filter(part => part.type === bodypart).length
    }

    getBodyCost(body: BodyPartConstant[]): number {
        let cost = 0;
        for (let i in body) {
            cost += BODYPART_COST[body[i]];
        }
        return cost;
    }

    getCurrentRoomIncome(room: Room, objectives: Objective[]) {
        let currentIncome = 0;
        let maxIncome = 0
        objectives.forEach(objective => {
            if (objective.type === roleContants.MINING) maxIncome += objective.maxIncome;
        })
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            if (creep.memory.role === roleContants.MINING && creep.memory.home === room.name && creep.memory.working) {
                currentIncome += (this.getBodyPartAmount(creep.body, WORK) * 2);
            }
        }

        if(maxIncome < currentIncome){
            return maxIncome;
        }
        return currentIncome
    }
}
