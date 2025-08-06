import { MiningObjective, roleContants } from "objectives/objectiveInterfaces";
import { getWorkParts, createCreepBody, generateName } from "./helper";

export class SpawnMiner {
    checkMiningObj(objectives: MiningObjective[], room: Room) {
        const sorted = objectives.sort(function (a, b) {
            if (a.distance && b.distance) {
                return a.distance - b.distance
            } return Infinity
        })
        sorted.forEach(objective => {
            let assignedCreeps: Creep[] = [];
            for (const index in Game.creeps) {
                const creep = Game.creeps[index]
                const memory = Memory.creeps[creep.name] as MinerMemory
                if (memory.role === objective.type && memory.sourceId === objective.sourceId) assignedCreeps.push(creep);
            }

            let currWorkParts = 0;
            if (assignedCreeps.length > 0) {
                currWorkParts = getWorkParts(assignedCreeps, WORK);
            }
            if (objective.maxWorkParts > currWorkParts && objective.spots > assignedCreeps.length) {
                return this.spawnMiner(objective, room);
            }
        })
    }

    spawnMiner(objective: MiningObjective, room: Room) {
        const body = createCreepBody(objective, room)
        if (objective.path === undefined) return;
        const memory: MinerMemory = {
            home: room.name,
            role: roleContants.MINING,
            sourceId: objective.sourceId,
            route: objective.path,
            working: false
        }
        room.find(FIND_MY_SPAWNS)[0].spawnCreep(body, generateName(roleContants.MINING), { memory })
    }
}

