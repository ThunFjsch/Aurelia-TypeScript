import { MaintenanceObjective, roleContants } from "objectives/objectiveInterfaces";
import { createCreepBody, generateName, getWorkParts } from "./helper";

export class SpawnMaintainer {
    checkMaintenanceObj(objectives: MaintenanceObjective[], room: Room, creeps: Creep[]) {
        const objective = objectives.find(objective => objective.home === room.name)
        if (objective != undefined) {
            const assignedCreeps = creeps.filter(creep => creep.memory.role === roleContants.MAINTAINING && creep.memory.home === room.name)
            const workParts = getWorkParts(assignedCreeps, WORK);
            if (objective.hitsOverLifeTime > 800 && workParts < objective.maxWorkParts) {
                this.spawnMaintainer(objective, room);
            }
        }
    }

    spawnMaintainer(objective: MaintenanceObjective, room: Room) {
        const body = createCreepBody(objective, room)
        const memory: MaintainerMemory = {
            home: room.name,
            role: roleContants.MAINTAINING,
            target: objective.toRepair[0],
            working: false,
            repairTarget: undefined
        }
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        if (!spawn.spawning) {
            return spawn.spawnCreep(body, generateName(roleContants.MAINTAINING), { memory });
        }
        return undefined;
    }

}
