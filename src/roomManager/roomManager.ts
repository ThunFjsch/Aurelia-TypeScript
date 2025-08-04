import { MemoryService } from "services/memory.service";
import { Planner } from "./basePlanner/planner";

export interface RoomManager{
    ownedRooms: string[]
}

export class RoomManager{
    memoryService: MemoryService;

    constructor(MemoryService: MemoryService){
        this.memoryService = MemoryService;
    }

    run(){
        for(let index in Memory.myRooms){
            const roomName = Memory.myRooms[index];
            const room = Game.rooms[roomName];

            if(room.memory.respawn){
                this.memoryService.initRoomMemory(room)
            }

            // The baseplanner is added in the initMemory but this allows for rebuilding the roomplan when I delete it.
            const basePlanner = room.memory.basePlanner;
            if(basePlanner === undefined){
                const spawn = room.find(FIND_MY_SPAWNS)[0]
                const planner = new Planner();

                planner.startRoomPlanner(room, spawn)
            }


        }
    }
}
