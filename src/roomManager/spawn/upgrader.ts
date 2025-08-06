import { UpgraderMemory } from "creeps/upgrading";
import { UpgradeObjective, roleContants } from "objectives/objectiveInterfaces";
import { EconomyService } from "services/economy.service";
import { getWorkParts, createCreepBody, generateName } from "./helper";

export class SpawnUpgrader {
    eco: EconomyService;
    constructor(Economy: EconomyService) {
        this.eco = Economy;
    }

    checkUpgradeObj(objectives: UpgradeObjective[], room: Room) {
        objectives.forEach(objective => {
            let currWork = 0;
            for (const index in Game.creeps) {
                const creep = Game.creeps[index]
                const memory = Memory.creeps[creep.name]
                if (memory.role === roleContants.UPGRADING && memory.home === objective.home) currWork += getWorkParts([creep], WORK);
            }
            const currNeed = this.eco.getCurrentRoomIncome(room) / 2.5;
            if (currWork < currNeed) {
                this.spawnUpgrader(objective, room);
            }
        })
    }

    spawnUpgrader(objective: UpgradeObjective, room: Room) {
        const body = createCreepBody(objective, room)
        const memory: UpgraderMemory = {
            home: room.name,
            role: roleContants.UPGRADING,
            working: false,
            controllerId: objective.controllerId
        }
        room.find(FIND_MY_SPAWNS)[0].spawnCreep(body, generateName(roleContants.UPGRADING), { memory })
    }
}
