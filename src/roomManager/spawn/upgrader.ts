import { UpgraderMemory } from "creeps/upgrading";
import { Objective, UpgradeObjective, roleContants } from "objectives/objectiveInterfaces";
import { E_FOR_UPGRADER, EconomyService } from "services/economy.service";
import { getWorkParts, createCreepBody, generateName } from "./helper";

export class SpawnUpgrader {
    eco: EconomyService;
    constructor(Economy: EconomyService) {
        this.eco = Economy;
    }

    checkUpgradeObj(unsorted: Objective[], objectives: UpgradeObjective[], room: Room) {
        let maxIncome = 0;
        unsorted.forEach(objective => maxIncome += objective.maxIncome)
        let retValue = undefined
        objectives.forEach(objective => {
            let currWork = 0;
            for (const index in Game.creeps) {
                const creep = Game.creeps[index]
                const memory = Memory.creeps[creep.name]
                if (memory.role === roleContants.UPGRADING && memory.home === objective.home) currWork += getWorkParts([creep], WORK);
            }
            const income = this.eco.getCurrentRoomIncome(room, unsorted);
            const currNeed = income / E_FOR_UPGRADER;
            if (currWork < currNeed && income > (maxIncome / 3)) {
                retValue = this.spawnUpgrader(objective, room, currWork, currNeed);
            }
        })
        return retValue
    }

    spawnUpgrader(objective: UpgradeObjective, room: Room, currWorkParts: number, maxWorkParts: number) {
        const body = createCreepBody(objective, room, currWorkParts, maxWorkParts)
        const memory: UpgraderMemory = {
            home: room.name,
            role: roleContants.UPGRADING,
            working: false,
            controllerId: objective.controllerId
        }
        return room.find(FIND_MY_SPAWNS)[0].spawnCreep(body, generateName(roleContants.UPGRADING), { memory })
    }
}
