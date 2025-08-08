import { MemoryService } from "services/memory.service";
import { Planner } from "./basePlanner/planner";
import { ObjectiveManager } from "objectives/objectiveManager";
import { SpawnManager } from "roomManager/spawn/spawnManager";
import { ResourceService } from "services/resource.service";
import { roleContants } from "objectives/objectiveInterfaces";
import { getWorkParts } from "./spawn/helper";
import { visualizeResourceTasks } from "visuals/resTask-visuals";

const spawnManager = new SpawnManager();

export interface RoomManager {
    ownedRooms: string[]
}

export class RoomManager {
    memoryService: MemoryService;
    objectiveManager: ObjectiveManager;
    creeps: Creep[] = [];
    resourceService: ResourceService;

    constructor(MemoryService: MemoryService, ObjectiveManager: ObjectiveManager, Resource: ResourceService) {
        this.memoryService = MemoryService;
        this.objectiveManager = ObjectiveManager;
        this.resourceService = Resource;
        Object.entries(Game.creeps).forEach((key) => {
            this.creeps.push(key[1])
        })
    }

    run(creeps: Creep[]) {
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
            spawnManager.run(this.objectiveManager.objectives, room, creeps)

            this.resourceService.run(room, this.objectiveManager.getRoomHaulCapacity(room), this.getRoomAvgHauler(room), creeps)
            }
    }

    getRoomAvgHauler(room: Room) {
        const hauler = this.creeps.filter(creep => creep.memory.home === room.name && creep.memory.role === roleContants.HAULING);
        let cap = 0;
        let creeps = 0
        hauler.forEach(creep => {
            cap += getWorkParts([creep], CARRY)
            creeps++;
        });
        return cap/creeps;
    }
}
