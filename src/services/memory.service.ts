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
                myRooms.push(name)
            }
        }
        return myRooms;
    }

    initSourceInfo(): SourceInfo[] {
        let sourceInfos: SourceInfo[] = []
        for (let i in Memory.myRooms) {
            const room: Room = Game.rooms[Memory.myRooms[i]];
            const sources = room.find(FIND_SOURCES);
            for (let j in sources) {
                const source = sources[j]
                const result = scoutingService.addSource(room, source);
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
            basePlanner: {startlocation:{x: 0, y:0, score: 0}},
            constructionOffice: {
                finished: true,
                lastJob: 0,
                plans: []
            },
            containers: []
        }
        planner.startRoomPlanner(room, spawn)
    }

    initContainerMemory(container: StructureContainer, room: Room){
        const controller = room.controller
        if(controller != undefined){
            if(container.pos.inRangeTo(controller.pos.x, controller.pos.y, 4)){
                const info: ContainerMemory = {
                    id: container.id,
                    type: roleContants.UPGRADING
                }
                room.memory.containers.push(info)
                return
            }
        }
        room.find(FIND_SOURCES).forEach(source => {
            if(container.pos.inRangeTo(source.pos.x, source.pos.y, 1)){
                const info: ContainerMemory = {
                    id: container.id,
                    type: roleContants.MINING
                }
                room.memory.containers.push(info)
                return
            }
        })
        room.find(FIND_MY_STRUCTURES).filter(structure => structure.structureType === STRUCTURE_EXTENSION)
            .forEach(extension => {
                if(container.pos.inRangeTo(extension.pos.x, extension.pos.y, 1)){
                const info: ContainerMemory = {
                    id: container.id,
                    type: roleContants.FASTFILLER
                }
                room.memory.containers.push(info)
                return
            }
            })
    }

}
