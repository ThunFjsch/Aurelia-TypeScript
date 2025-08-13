import { roleContants } from "objectives/objectiveInterfaces";
import { Point } from "utils/sharedTypes";
import { generateName } from "./helper";

export class SpawnFastFiller {
    checkFastFiller(room: Room, creeps: Creep[]) {
        let retValue = undefined;
        room.memory.containers.forEach(container => {
            if (container.type === roleContants.FASTFILLER && container.fastFillerSpots != undefined) {
                for(let spot of container.fastFillerSpots){
                    if (!creeps.find(creep => creep.memory.role === roleContants.FASTFILLER && (creep.memory as FastFillerMemory).pos.x === spot.x && (creep.memory as FastFillerMemory).pos.y === spot.y)) {
                        retValue = this.spawnFastFiller(room, spot, container.id)
                        break;
                    }
                }
            }
        })
        return retValue
    }

    spawnFastFiller(room: Room, pos: Point, container: string) {
        const body = [CARRY, CARRY, CARRY, MOVE];
        const memory: FastFillerMemory = {
            home: room.name,
            role: roleContants.FASTFILLER,
            working: false,
            pos: pos,
            supply: container
        }
        const spawn = room.find(FIND_MY_SPAWNS)[0]
        if (!spawn.spawning) {
            return spawn.spawnCreep(body, generateName(roleContants.FASTFILLER), { memory })
        }
        return undefined
    }
}
