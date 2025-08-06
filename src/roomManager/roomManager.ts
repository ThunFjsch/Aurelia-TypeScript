import { MemoryService } from "services/memory.service";
import { Planner } from "./basePlanner/planner";
import { ObjectiveManager } from "objectives/objectiveManager";
import { SpawnManager } from "roomManager/spawn/spawnManager";

const spawnManager = new SpawnManager()

export interface RoomManager {
    ownedRooms: string[]
}

export class RoomManager {
    memoryService: MemoryService;
    objectiveManager: ObjectiveManager;

    constructor(MemoryService: MemoryService, ObjectiveManager: ObjectiveManager) {
        this.memoryService = MemoryService;
        this.objectiveManager = ObjectiveManager
    }

    run() {
        for (let index in Memory.myRooms) {
            const roomName = Memory.myRooms[index];
            const room = Game.rooms[roomName];

            if (room.memory.respawn || room.memory === undefined) {
                this.memoryService.initRoomMemory(room)
            }

            // The baseplanner is added in the initMemory but this allows for rebuilding the roomplan when I delete it.
            const basePlanner = room.memory.basePlanner;
            if (basePlanner === undefined) {
                const spawn = room.find(FIND_MY_SPAWNS)[0]
                const planner = new Planner();

                planner.startRoomPlanner(room, spawn)
            }

            this.objectiveManager.syncRoomObjectives(room)
            spawnManager.run(this.objectiveManager.objectives, room)
        }
    }
}
