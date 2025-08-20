import { ReserveObjective, roleContants } from "objectives/objectiveInterfaces";

export class SpawnReserver{
    checkReservObj(objective: ReserveObjective, room: Room, creeps: Creep[]){
        for(let reserv of objective.toReserve){
            const hasReserv = creeps.find(creep => creep.memory.role === roleContants.RESERVING &&
                                                    creep.memory.home === room.name &&
                                                    (creep.memory as ReservMemory).target === reserv);
            if(hasReserv != undefined) continue;
            const mem: ReservMemory = {
                home: room.name,
                role: roleContants.RESERVING,
                target: reserv
            }
            let body = [CLAIM, MOVE];
            if(room.storage){
                body = [CLAIM, CLAIM, MOVE]
            }
            return room.find(FIND_MY_SPAWNS)[0].spawnCreep(
                body,
                `${roleContants.RESERVING} ${reserv}`,
                {memory: mem}
            )
        }
        return undefined
    }
}
