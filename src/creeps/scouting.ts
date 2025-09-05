import { moveTo } from "screeps-cartographer";
import { ScoutingService } from "services/scouting.service";
import { creepPathMove } from "./creepHelper";
import { PathCachingService } from "services/pathCaching.service";

export class Scouting {
    scoutingService = new ScoutingService();
    pathCachingService: PathCachingService;

    constructor(pathCaching: PathCachingService) {
        this.pathCachingService = pathCaching;
    }
    run(creep: Creep) {
        const memory: ScoutMemory = creep.memory as ScoutMemory;
        const currTarget = memory.route[memory.currIndex]
        if (currTarget === undefined || currTarget === null) {
            memory.currIndex++
            creep.memory = memory
            return
        }
        const targetRoomPos = new RoomPosition(25, 25, currTarget.roomName)

        if (currTarget.lastVisit != 0 && Game.time - (currTarget.lastVisit ?? 0) > 20000) {
            memory.currIndex++
        }

        if (creep.room.name != currTarget.roomName) {
            moveTo(creep, targetRoomPos)
        } else if (creep.room.name === currTarget.roomName) {
            const controller = creep.room.controller;
            if (controller != undefined && (controller.sign === undefined || controller.sign.username != 'ThunFisch') && controller.sign?.username != 'Screeps') {
                if (creep.pos.inRangeTo(controller.pos.x, controller?.pos.y, 1)) {
                    creep.signController(controller, 'Owo');
                } else {
                    creepPathMove(creep, controller, this.pathCachingService)
                }
            } else {
                if (creep.room.find(FIND_HOSTILE_STRUCTURES).find(structure => structure.structureType === "keeperLair") || (creep.room.controller?.owner?.username != 'ThunFisch' && creep.room.controller?.owner != undefined)) {
                    memory.currIndex++;

                    memory.route[memory.currIndex].lastVisit = Game.time
                    const room = Game.rooms[memory.home];

                    creep.memory = memory
                    return;
                }
                const sources = creep.room.find(FIND_SOURCES)
                if (sources.length === 0) {
                    memory.currIndex++;
                    creep.memory = memory;
                    return
                }
                sources.forEach(source => {
                    let iterator = 0;
                    Memory.sourceInfo.forEach(info => {
                        if (info != null && info.id === source.id) {
                            memory.route[memory.currIndex].lastVisit = Game.time
                            Game.rooms[memory.home].memory.scoutPlan = memory.route;
                            delete Memory.sourceInfo[iterator];
                        }
                        iterator++;
                    })
                    const room = Game.rooms[memory.home];
                    if (source != undefined && room != undefined && room != null) {
                        const info = this.scoutingService.addSource(room, source)
                        if (info != undefined && info != null) {
                            Memory.sourceInfo.push(info)
                            memory.route[memory.currIndex].lastVisit = Game.time
                            Game.rooms[memory.home].memory.scoutPlan = memory.route;
                            Memory.sourceInfo.sort((a, b) =>
                                (a?.distance ?? 0) - (b?.distance ?? 0)
                            )
                        }

                    }
                })
                memory.currIndex++;
            }
        }
        creep.memory = memory
    }
}
