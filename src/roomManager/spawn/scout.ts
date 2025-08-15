import { roleContants, ScoutingObjective } from "objectives/objectiveInterfaces";
import { generateName } from "./helper";

export class SpawnScout{
    checkScoutObj(objective: ScoutingObjective, room: Room, creeps: Creep[]){
        if(room.memory.scoutPlan === undefined) return;
        const scout = creeps.find(creep => creep.memory.role === roleContants.SCOUTING && creep.memory.home === room.name);
        if(scout != undefined) return;
        let totalTime = 0;
        let numberOfRooms = 0
        objective.toScout.forEach(room => {
            if((room.lastVisit?? 0) === 0){
                totalTime += 0
            } else{
                totalTime += Game.time - (room.lastVisit?? 0)
            }
            numberOfRooms++;
        })
        const avg = totalTime/numberOfRooms;
        if(avg < 10000){
            this.spawnScout(objective, room);
        }
    }

    spawnScout(objective: ScoutingObjective, room: Room) {
            const body = [MOVE];
            const memory: ScoutMemory = {
                home: room.name,
                role: roleContants.SCOUTING,
                currIndex: 0,
                route: objective.toScout,
            }
            const spawn = room.find(FIND_MY_SPAWNS)[0]
            if (!spawn.spawning) {
                return spawn.spawnCreep(body, generateName(roleContants.SCOUTING), { memory })
            }
            return undefined
        }
}
