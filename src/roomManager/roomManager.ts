import { MemoryService } from "services/memory.service";
import { Planner } from "./basePlanner/planner";
import { ObjectiveManager } from "objectives/objectiveManager";
import { SpawnManager } from "roomManager/spawnManager";
import { ResourceService } from "services/resource.service";
import { roleContants } from "objectives/objectiveInterfaces";
import { getWorkParts } from "./spawn-helper";
import { ConstrcutionManager} from "./constructionManager";
import { Tower } from "structures/tower";
import { ScoutingService } from "services/scouting.service";

const spawnManager = new SpawnManager();
const towerControle = new Tower();
const constructionManager = new ConstrcutionManager();

export interface RoomManager {
    ownedRooms: string[]
}

export class RoomManager {
    memoryService: MemoryService;
    objectiveManager: ObjectiveManager;
    resourceService: ResourceService;
    scoutingService: ScoutingService;

    constructor(MemoryService: MemoryService, ObjectiveManager: ObjectiveManager, Resource: ResourceService, ScoutingService: ScoutingService) {
        this.memoryService = MemoryService;
        this.objectiveManager = ObjectiveManager;
        this.resourceService = Resource;
        this.scoutingService = ScoutingService;
    }

    run(creeps: Creep[]) {
        for (let index in Memory.myRooms) {
            const roomName = Memory.myRooms[index];
            const room = Game.rooms[roomName];

            if(Game.time % 1500 === 0){
                room.memory.containers = []
            }

            if (room.memory.respawn || room.memory === undefined) {
                this.memoryService.initRoomMemory(room);
                return
            }

            if(room.memory.scoutPlan === undefined){
                room.memory.scoutPlan = this.scoutingService.getRoomScoutRoute(room)
            }

            // The baseplanner is added in the initMemory but this allows for rebuilding the roomplan when I delete it.
            const basePlanner = room.memory.basePlanner;
            if (basePlanner === undefined) {
                const spawn = room.find(FIND_MY_SPAWNS)[0]
                const planner = new Planner();

                planner.startRoomPlanner(room, spawn)
            }

            this.crudeTowerDefence(room)

            constructionManager.run(room);

            this.objectiveManager.syncRoomObjectives(room)
            spawnManager.run(this.objectiveManager.objectives, room, creeps)

            const assignedRooms = this.objectiveManager.getRoomObjectives(room).filter(objective => objective.target != room.name);
            this.resourceService.run(room, this.objectiveManager.getRoomHaulCapacity(room), this.getRoomAvgHauler(room, creeps), creeps, assignedRooms);
        }
    }

    private crudeTowerDefence(room: Room) {
        const thread = this.isRoomUnderThread(room);
        if (thread.underThread) {
            const towers = room.find(FIND_MY_STRUCTURES).filter(structure => structure.structureType === STRUCTURE_TOWER);
            const hostiles = thread.hostiles;
            if (towers != undefined && towers.length > 0) {
                towers.forEach(tower => towerControle.run(tower as StructureTower, hostiles[0]));
            }
        }
    }

    private isRoomUnderThread(room: Room) {
        const hostiles = room.find(FIND_HOSTILE_CREEPS);
        let underThread = false;
        if (hostiles.length > 0) {
            underThread = true
        }
        return { underThread, hostiles }
    }

    getRoomAvgHauler(room: Room, creeps: Creep[]) {
        const hauler = creeps.filter(creep => creep.memory.home === room.name && creep.memory.role === roleContants.HAULING);
        let cap = 1;
        let creepAmount = 1;
        hauler.forEach(creep => {
            cap += getWorkParts([creep], CARRY)
            creepAmount++;
        });
        return cap / creepAmount;
    }
}
