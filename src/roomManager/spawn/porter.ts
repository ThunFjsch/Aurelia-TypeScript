
import { HaulerMemory } from "creeps/hauling";
import { roleContants } from "objectives/objectiveInterfaces";
import { generateBody, generateName, getWorkParts } from "./helper";

export class SpawnPorter {
    checkPorterObj(room: Room, creeps: Creep[]) {
        const rcl = room.controller?.level ?? 0;
        const storage = room.find(FIND_MY_STRUCTURES).filter(struc => struc.structureType === STRUCTURE_STORAGE)[0];
        const porter = creeps.filter(creep => creep.memory.role === roleContants.PORTING);
        let workParts = 0;
        if (porter.length > 0) {
            workParts = getWorkParts(porter, CARRY);
        }
        console.log(rcl > 4 && storage != undefined && workParts < 20)
        if (rcl > 4 && storage != undefined && workParts < 20 && porter.length < 4) {
            this.spawnPorter(room, (40 - workParts))
        }
    }

    spawnPorter(room: Room, neededParts: number) {
        const body = generateBody([CARRY, CARRY, MOVE],
            BODYPART_COST[CARRY] + BODYPART_COST[CARRY] + BODYPART_COST[MOVE],
            room, room.energyAvailable, neededParts, 2);
        const memory: HaulerMemory = {
            home: room.name,
            role: roleContants.PORTING,
            take: "withdrawl",
        }
        const spawn = room.find(FIND_MY_SPAWNS)[0]
        if (!spawn.spawning) {
            return spawn.spawnCreep(body, generateName(roleContants.PORTING), { memory })
        }
        return undefined
    }
}
