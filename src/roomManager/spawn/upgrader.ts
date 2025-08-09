import { UpgraderMemory } from "creeps/upgrading";
import { Objective, UpgradeObjective, roleContants } from "objectives/objectiveInterfaces";
import { EconomyService } from "services/economy.service";
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
            const income = this.eco.getCurrentRoomIncome(room);
            const currNeed = this.eco.getCurrentRoomIncome(room) / 2.5;
            if (currWork < currNeed && income > (maxIncome / 3)) {
                retValue = this.spawnUpgrader(objective, room);
            }
        })
        return retValue
    }

    spawnUpgrader(objective: UpgradeObjective, room: Room) {
        const body = createCreepBody(objective, room)
        const memory: UpgraderMemory = {
            home: room.name,
            role: roleContants.UPGRADING,
            working: false,
            controllerId: objective.controllerId
        }
        return room.find(FIND_MY_SPAWNS)[0].spawnCreep(body, generateName(roleContants.UPGRADING), { memory })
    }
}
