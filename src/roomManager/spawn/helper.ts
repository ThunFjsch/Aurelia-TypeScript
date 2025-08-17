import { Objective, roleContants } from "objectives/objectiveInterfaces";

export function createCreepBody(objective: Objective, room: Room, currWorkParts: number = 0, maxWorkParts: number) {
    let body: BodyPartConstant[] = [];
    const numberOfStarters = Object.entries(Game.creeps).filter((creep) => creep[1].memory.role === objective.type).length
    let energyCap = room.energyCapacityAvailable;
    const workPartsLeft = maxWorkParts - currWorkParts
    if (objective.type === roleContants.MINING && currWorkParts < objective.maxWorkParts) {
        if (numberOfStarters === 0 || energyCap < 500) {
            return body = [WORK, WORK, MOVE];
        } else if (energyCap >= 550) {
            return body = [WORK, WORK, WORK, WORK, WORK, MOVE]
        }
    } else if (objective.type === roleContants.HAULING) {
        const preset = [CARRY, MOVE]
        return body = generateBody(preset, BODYPART_COST[CARRY] + BODYPART_COST[MOVE], room, room.energyAvailable, workPartsLeft)
    } else if (objective.type === roleContants.UPGRADING) {
        const preset = [WORK, WORK, CARRY, MOVE]
        return body = generateBody(preset, BODYPART_COST[CARRY] + BODYPART_COST[MOVE] + BODYPART_COST[WORK] + BODYPART_COST[WORK] , room, energyCap, workPartsLeft, 2)
    } else if(objective.type === roleContants.BUILDING){
        const preset = [WORK, CARRY, CARRY, MOVE]
        return body = generateBody(preset, BODYPART_COST[CARRY]+ BODYPART_COST[CARRY] + BODYPART_COST[MOVE] + BODYPART_COST[WORK] , room,  energyCap, workPartsLeft)
    } else if(objective.type === roleContants.MAINTAINING && currWorkParts < objective.maxWorkParts) {
        const preset = [WORK, CARRY, MOVE, MOVE]
        return body = generateBody(preset, BODYPART_COST[CARRY]+ BODYPART_COST[MOVE] + BODYPART_COST[MOVE] + BODYPART_COST[WORK] , room,  energyCap, workPartsLeft)
    }

    return body;
}

export function generateBody(preset: BodyPartConstant[], cost: number, room: Room, energy: number, maxWorkParts: number, workpartsInTemplate: number = 1): BodyPartConstant[] {
    let body: BodyPartConstant[] = [];
    const maxLength = 50/preset.length
    for (let i = cost; i <= energy; i += cost) {
        if(maxWorkParts <= workpartsInTemplate * (i/cost)){
            body.push(...preset)
            break;
        };
        if(i > maxLength)
        body.push(...preset)
    }
    console.log(JSON.stringify(body))
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
