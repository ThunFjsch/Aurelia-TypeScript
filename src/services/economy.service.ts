import { minerBuilder } from "creeps/creepFactory";

export class EconomyService {
    getMaxSourceIncome(route: PathFinderPath, energyPerTick: number, spawn: StructureSpawn, room: Room): number {
        const body = minerBuilder({ room, energyPerTick })
        let bodyCost = 0;
        if (energyPerTick === 10 && body.length === 3) {
            bodyCost = this.getBodyCost(body) * 3
        } else{
            bodyCost = this.getBodyCost(body);
        }
        const eToSpawnMiners = bodyCost / (CREEP_LIFE_TIME - route.cost)
        const haulerParts = energyPerTick * 2 * route.cost / CARRY_CAPACITY
        const eToSpawnHaulers = haulerParts * (room.memory.hasRoads? 75: 100);
        const containerRepair = room.controller?.my ? 1 : 0.5;  // Container repair cost changes if the room is under my controle
        const reserveCreepCost =  650;  // [CLAIM, MOVE]
        const reserverCost = (room.name === spawn.room.name) ? 0 : reserveCreepCost;    // if my room no reserver needed
        const netIncome = energyPerTick - eToSpawnMiners - eToSpawnHaulers - containerRepair - reserverCost;
        return netIncome
    }

    requiredHaulerParts(ePerTick: number, route: PathFinderPath): number {
        return ePerTick * 2 * route.cost / CARRY_CAPACITY;
    }

    getBodyPartAmount(body: BodyPartConstant[], bodypart: BodyPartConstant): number {
        return body.filter(part => part === bodypart).length
    }

    getBodyCost(body: BodyPartConstant[]): number {
        let cost = 0;
        for (let i in body) {
            cost += BODYPART_COST[body[i]];
        }
        return cost;
    }
}
