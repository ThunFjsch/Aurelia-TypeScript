import { Objective, roleContants } from "objectives/objectiveInterfaces";

export function createCreepBody(objective: Objective, room: Room) {
    let body: BodyPartConstant[] = [];
    const numberOfStarters = Object.entries(Game.creeps).filter((creep) => creep[1].memory.role === objective.type).length
    const energyCap = room.energyCapacityAvailable;

    if (objective.type === roleContants.MINING) {
        if (numberOfStarters === 0 || energyCap < 400) {
            body = [WORK, WORK, MOVE];
        } else if (energyCap > 400 && energyCap < 550) {
            body = [WORK, WORK, MOVE]
        } if (energyCap >= 550) {
            body = [WORK, WORK, WORK, WORK, WORK, MOVE]
        }
    } else if (objective.type === roleContants.HAULING) {
        const preset = [CARRY, MOVE]
        body = generateBody(preset, BODYPART_COST[CARRY] + BODYPART_COST[MOVE], room)
    } else if (objective.type === roleContants.UPGRADING) {
        const preset = [WORK, WORK, CARRY, MOVE]
        body = generateBody(preset, BODYPART_COST[CARRY] + BODYPART_COST[MOVE] + BODYPART_COST[WORK] + BODYPART_COST[WORK] , room)
    }
    return body;
}

export function generateBody(preset: BodyPartConstant[], cost: number, room: Room): BodyPartConstant[] {
    const energy = room.energyAvailable;
    let body: BodyPartConstant[] = [];
    for (let i = cost; i <= energy; i += cost) {
        body.push(...preset)
    }
    return body;
}

export function getWorkParts(creeps: Creep[], toCountFor: BodyPartConstant): number {
    let totalParts = 0;
    creeps.forEach(creep => {
        totalParts += creep.body.filter(part => part.type === toCountFor).length
    })
    return totalParts;
}

export function generateName(role: string) {
    return role + '_' + Math.random().toString(36).slice(2, 7).toString();
}
