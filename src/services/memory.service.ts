import { Planner } from "roomManager/basePlanner/planner";
import { ScoutingService } from "./scouting.service";
import { roleContants } from "objectives/objectiveInterfaces";

const scoutingService = new ScoutingService()
export class MemoryService {
    initGlobalMemory() {
        Memory.respawn = undefined
        Memory.myRooms = [];
        Memory.globalReset = Game.time;
        Memory.myRooms = this.getMyRooms();
        Memory.sourceInfo = this.initSourceInfo();
    }

    getMyRooms(): string[] {
        let myRooms: string[] = []
        for (let [name, room] of Object.entries(Game.rooms)) {
            if (room.controller?.my) {
                myRooms.push(name);
            }
        }
        return myRooms;
    }

    initSourceInfo(): SourceInfo[] {
        let sourceInfos: SourceInfo[] = []
        Memory.sourceInfo = sourceInfos;
        for (let i in Memory.myRooms) {
            const room: Room = Game.rooms[Memory.myRooms[i]];
            const sources = room.find(FIND_SOURCES);
            for (let j in sources) {
                const source = sources[j]
                const result = scoutingService.addSource(room, source);
                if(result === undefined) continue;
                Memory.sourceInfo.push(result);
                Memory.sourceInfo.sort((a, b) =>
                    (a.distance ?? 0) - (b.distance ?? 0)
                )
                if (result != undefined) {
                    sourceInfos.push(result);
                }
            }
        }
        return sourceInfos;
    }

    initRoomMemory(room: Room) {
        const spawn = room.find(FIND_MY_SPAWNS)[0]
        const planner = new Planner();
        room.memory = {
            isOwned: true,
            remotes: [],
            hasRoads: false,
            basePlanner: { startlocation: { x: 0, y: 0, score: 0 } },
            constructionOffice: {
                finished: true,
                lastJob: 0,
                plans: []
            },
            containers: [],
            scoutPlan: undefined,
            rclProgress: [{finished: Game.time, level: 1}]
        }
        planner.startRoomPlanner(room, spawn)
    }

    initContainerMemory(container: StructureContainer, room: Room) {
        const controller = room.controller
        let exists = false;
        room.memory.containers.forEach(memContainer => {
            if (memContainer.id === container.id) exists = true;
        })
        if (exists) return;

        // check for upgrade container
        if (controller != undefined) {
            if (container.pos.inRangeTo(controller.pos.x, controller.pos.y, 4)) {
                const info: ContainerMemory = {
                    id: container.id,
                    type: roleContants.UPGRADING,
                    fastFillerSpots: undefined,
                    source: undefined
                }
                room.memory.containers.push(info)
                return
            }
        }

        // check for source container
        room.find(FIND_SOURCES).forEach(source => {
            if (container.pos.inRangeTo(source.pos.x, source.pos.y, 1)) {
                const info: ContainerMemory = {
                    id: container.id,
                    source: source.id,
                    type: roleContants.MINING,
                    fastFillerSpots: [{ x: container.pos.x, y: container.pos.y }]
                }
                room.memory.containers.push(info)
                return
            }
        })

        // check for fast filler container
        let isNearSource = false;
        room.find(FIND_SOURCES).forEach(source => {
            if (source.pos.inRangeTo(container.pos.x, container.pos.y, 1)) {
                isNearSource = true
            }
        })
        if (isNearSource) return;
        let isNearExtension = false
        room.find(FIND_MY_STRUCTURES).filter(structure => structure.structureType === STRUCTURE_EXTENSION)
            .forEach(extension => {
                if (extension.pos.inRangeTo(container.pos.x, container.pos.y, 2)) {
                    isNearExtension = true
                }
            })
        if (isNearExtension) {
            let spots = []
            if (room.lookAt(container.pos.x - 2, container.pos.y - 2).find(item => item.structure != undefined)) {
                spots.push({ x: container.pos.x - 1, y: container.pos.y - 1 })
            }
            if (room.lookAt(container.pos.x + 2, container.pos.y - 2).find(item => item.structure != undefined)) {
                spots.push({ x: container.pos.x + 1, y: container.pos.y - 1 })
            }
            if (room.lookAt(container.pos.x + 2, container.pos.y + 2).find(item => item.structure != undefined)) {
                spots.push({ x: container.pos.x + 1, y: container.pos.y + 1 })
            }
            const info: ContainerMemory = {
                id: container.id,
                type: roleContants.FASTFILLER,
                fastFillerSpots: spots,
                source: undefined

            }
            room.memory.containers.push(info);
            return
        }
    }
}
