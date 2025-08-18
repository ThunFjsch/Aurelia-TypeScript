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
            return room.find(FIND_MY_SPAWNS)[0].spawnCreep(
                [CLAIM, MOVE],
                `${roleContants.RESERVING} ${reserv}`,
                {memory: mem}
            )
        }
        return undefined
    }
}
