import { MaintenanceObjective, roleContants } from "objectives/objectiveInterfaces";
import { createCreepBody, generateName, getWorkParts } from "./helper";

const MaintananceThreshold = [0, 600, 700, 800, 900, 1300, 1500, 3000]

const maxHitsPerWorkPart = 3000;

export class SpawnMaintainer {
    checkMaintenanceObj(objectives: MaintenanceObjective[], room: Room, creeps: Creep[]) {
        let retValue = undefined;
        const objective = objectives.find(objective => objective.home === room.name)
        if (objective != undefined) {
            const assignedCreeps = creeps.filter(creep => creep.memory.role === roleContants.MAINTAINING && creep.memory.home === room.name)
            const workParts = getWorkParts(assignedCreeps, WORK);
            const rcl = room.controller?.level?? 0;
            if (objective.hitsOverLifeTime > MaintananceThreshold[rcl] && workParts < objective.maxWorkParts) {
                retValue = this.spawnMaintainer(objective, room);
            }
        }
        return retValue;
    }

    spawnMaintainer(objective: MaintenanceObjective, room: Room) {
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        if (spawn.spawning) {
            return undefined
        }
        const body = createCreepBody(objective, room)
        const memory: MaintainerMemory = {
            home: room.name,
            role: roleContants.MAINTAINING,
            target: objective.toRepair[0],
            working: false,
            repairTarget: undefined,
            take: "pickup"
        }
        return spawn.spawnCreep(body, generateName(roleContants.MAINTAINING), { memory });
    }

}
