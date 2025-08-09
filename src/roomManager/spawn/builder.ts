import { BuildingObjective, roleContants } from "objectives/objectiveInterfaces";
import { EconomyService } from "services/economy.service";
import { getWorkParts, createCreepBody, generateName } from "./helper";

export class SpawnBuiilder {
    eco: EconomyService;
    constructor(Economy: EconomyService) {
        this.eco = Economy;
    }

    checkBuildObj(objectives: BuildingObjective[], room: Room) {
        let retValue = undefined;
        objectives.forEach(objective => {
            let currWork = 0;
            for (const index in Game.creeps) {
                const creep = Game.creeps[index]
                const memory = Memory.creeps[creep.name]
                if (memory.role === roleContants.BUILDING && memory.home === objective.home) currWork += getWorkParts([creep], WORK);
            }
            const currNeed = this.eco.getCurrentRoomIncome(room) / 4;
            if (currWork < currNeed) {
                retValue = this.spawnUpgrader(objective, room);
            }
        })
        return retValue
    }

    spawnUpgrader(objective: BuildingObjective, room: Room) {
        const body = createCreepBody(objective, room)
        const memory: BuilderMemory = {
            home: room.name,
            role: roleContants.BUILDING,
            working: false,
            target: objective.targetId,
            route: objective.path?? []
        }
        const spawn = room.find(FIND_MY_SPAWNS)[0]
        if(!spawn.spawning){
            spawn.spawnCreep(body, generateName(roleContants.BUILDING), { memory })
        }
    }
}
