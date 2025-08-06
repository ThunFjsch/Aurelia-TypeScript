import { HaulingObjective, Objective, roleContants } from "objectives/objectiveInterfaces";
import { EconomyService } from "services/economy.service";
import { createCreepBody, generateName, getWorkParts } from "./helper";

export class SpawnHauler {
    eco: EconomyService;
    constructor(Economy: EconomyService) {
        this.eco = Economy
    }

    checkHaulObj(objectives: HaulingObjective[], room: Room, unsorted: Objective[]) {
        objectives.forEach(objective => {
            let currCarry = 0;
            for (const index in Game.creeps) {
                const creep = Game.creeps[index]
                const memory = Memory.creeps[creep.name]
                if (memory.role === roleContants.HAULING && memory.home === objective.home) currCarry += getWorkParts([creep], CARRY);
            }

            let dis = 0;
            unsorted.forEach(objective => { if (objective.distance) dis += objective.distance })
            const income = this.eco.getCurrentRoomIncome(room);
            const currentReq = this.eco.requiredHaulerParts(income, dis);
            // TODO: Delete magic number when more effective traffic management is implemented
            if (currCarry < (1.5 * objective.maxHaulerParts) && currCarry < currentReq) {
                return this.spawnHauler(objective, room);
            }
        })
    }

    spawnHauler(objective: Objective, room: Room) {
        const body = createCreepBody(objective, room)
        const memory: CreepMemory = {
            home: room.name,
            role: roleContants.HAULING,
            working: false
        }
        room.find(FIND_MY_SPAWNS)[0].spawnCreep(body, generateName(roleContants.HAULING), { memory })
    }
}
