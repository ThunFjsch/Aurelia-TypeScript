import { HaulingObjective, Objective, roleContants } from "objectives/objectiveInterfaces";
import { EconomyService } from "services/economy.service";
import { createCreepBody, generateName, getWorkParts } from "./helper";

export class SpawnHauler {
    eco: EconomyService;
    constructor(Economy: EconomyService) {
        this.eco = Economy
    }

    checkHaulObj(objectives: HaulingObjective[], room: Room, unsorted: Objective[], creeps: Creep[]) {
        let retValue = undefined
        const income = this.eco.getCurrentRoomIncome(room, unsorted);
        objectives.forEach(objective => {
            let currCarry = 0;
            for (const index in Game.creeps) {
                const creep = Game.creeps[index]
                const memory = Memory.creeps[creep.name]
                if (memory.role === roleContants.HAULING && memory.home === objective.home) currCarry += getWorkParts([creep], CARRY);
            }

            let dis = 0;
            unsorted.forEach(objective => {
                let hasCreeps = 0;
                creeps.forEach(creep => {
                    if(creep.memory.role === objective.type && creep.memory.home === objective.home && (creep.memory as MinerMemory).sourceId === objective.id){
                        hasCreeps++;
                    }
                })

                if (objective.distance && hasCreeps > 0) dis += objective.distance
            })
            const currentReq = this.eco.requiredHaulerParts(income, dis);
            if (currCarry <= currentReq  && currCarry < objective.maxHaulerParts) {
                retValue = this.spawnHauler(objective, room, currCarry);
            }
        })
        return retValue
    }

    spawnHauler(objective: Objective, room: Room, currWorkParts: number) {
        const body = createCreepBody(objective, room, currWorkParts, objective.maxHaulerParts)
        const memory: CreepMemory = {
            home: room.name,
            role: roleContants.HAULING,
            working: false
        }
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        if(spawn.spawning === null){
            return spawn.spawnCreep(body, generateName(roleContants.HAULING), { memory })
        } else{
            return undefined;
        }
    }
}
