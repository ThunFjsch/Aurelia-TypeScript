import { BuildingObjective, Objective, roleContants } from "objectives/objectiveInterfaces";
import { E_FOR_BUILDER, EconomyService } from "services/economy.service";
import { getWorkParts, createCreepBody, generateName } from "./helper";

export class SpawnBuiilder {
    eco: EconomyService;
    constructor(Economy: EconomyService) {
        this.eco = Economy;
    }

    checkBuildObj(objectives: BuildingObjective[], room: Room, allObjectives: Objective[]) {
        let retValue = undefined;
        objectives.forEach(objective => {
            let currWork = 0;
            for (const index in Game.creeps) {
                const creep = Game.creeps[index]
                const memory = Memory.creeps[creep.name]
                if (memory.role === roleContants.BUILDING && memory.home === objective.home) currWork += getWorkParts([creep], WORK);
            }
            const currNeed = this.eco.getCurrentRoomIncome(room, allObjectives) / E_FOR_BUILDER;
            if (currWork < currNeed) {
                retValue = this.spawnBuilder(objective, room, currWork, currNeed);
            }
        })
        return retValue
    }

    spawnBuilder(objective: BuildingObjective, room: Room, currWorkParts: number, maxWorkParts: number) {
        const body = createCreepBody(objective, room, currWorkParts, maxWorkParts);
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
