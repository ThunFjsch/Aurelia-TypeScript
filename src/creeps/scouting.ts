import { ScoutingService } from "services/scouting.service";

export class Scouting {
    scoutingService = new ScoutingService();

    run(creep: Creep) {
        const memory: ScoutMemory = creep.memory as ScoutMemory;
        const currTarget = memory.route[memory.currIndex]
        if(currTarget === undefined || currTarget === null){
            memory.currIndex++
            creep.memory = memory
            return
        }
        const targetRoomPos = new RoomPosition(25, 25, currTarget.roomName)

        if (currTarget.lastVisit != 0 && Game.time - (currTarget.lastVisit ?? 0) > 20000) {
            memory.currIndex++
        }

        if (creep.room.name != currTarget.roomName) {
            creep.moveTo(targetRoomPos)
        } else if (creep.room.name === currTarget.roomName) {
            const controller = creep.room.controller;
            if (controller != undefined && (controller.sign === undefined || controller.sign.username != 'ThunFisch') && controller.sign?.username != 'Screeps') {
                if (creep.pos.inRangeTo(controller.pos.x, controller?.pos.y, 1)) {
                    creep.signController(controller, 'Owo');
                } else {
                    creep.moveTo(controller)
                }
            } else {
                if (creep.room.find(FIND_HOSTILE_STRUCTURES).find(structure => structure.structureType === "keeperLair")) {
                    memory.currIndex++;

                    memory.route[memory.currIndex].lastVisit = Game.time
                    const room = Game.rooms[memory.home];
                    if(room.memory.scoutPlan != undefined){
                        delete room.memory.scoutPlan[memory.currIndex];
                    }

                    creep.memory = memory
                    return;
                }
                const sources = creep.room.find(FIND_SOURCES)
                if(sources.length === 0) return;
                sources.forEach(source => {
                    let infoOnMem = false;
                    Memory.sourceInfo.forEach(info => {
                        if (info.id === source.id) {
                            infoOnMem = true;
                            memory.route[memory.currIndex].lastVisit = Game.time
                            Game.rooms[memory.home].memory.scoutPlan = memory.route;
                        }
                    })
                    if (!infoOnMem) {
                        const info = this.scoutingService.addSource(creep.room, source)
                        if (info != undefined) {
                            Memory.sourceInfo.push(info)
                            memory.route[memory.currIndex].lastVisit = Game.time
                            Game.rooms[memory.home].memory.scoutPlan = memory.route;
                            Memory.sourceInfo.sort((a,b)=>
                                (a.distance?? 0) - (b.distance?? 0)
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
