import { Planner } from "./basePlanner/planner";

export interface RoomManager{
    ownedRooms: string[]
}

const planner = new Planner();

export class RoomManager{
    constructor(){}

    run(){
        for(let index in Memory.myRooms){
            const roomName = Memory.myRooms[index];
            const room = Game.rooms[roomName];
            const spawn = room.find(FIND_MY_SPAWNS)[0]

            if(room.memory.basePlanner === undefined){
                planner.startRoomPlanner(room, spawn)
            }
        }
    }
}
