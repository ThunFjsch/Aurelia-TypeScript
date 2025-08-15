import { ScoutingService } from "services/scouting.service";

export class Scouting {
    scoutingService = new ScoutingService();

    run(creep: Creep) {
        const memory: ScoutMemory = creep.memory as ScoutMemory;
        const currTarget = memory.route[memory.currIndex]
        const targetRoomPos = new RoomPosition(25, 25, currTarget.roomName)

        if (currTarget.lastVisit != 0 || Game.time - (currTarget.lastVisit ?? 0) < Game.time - 20000) {
            memory.currIndex++
        }

        if (creep.room.name != currTarget.roomName) {
            creep.moveTo(targetRoomPos)
        } else if (creep.room.name === currTarget.roomName) {
            const controller = creep.room.controller;
            console.log(controller != undefined && (controller.sign === undefined || controller.sign.username != 'asdf'))
            if (controller != undefined && (controller.sign === undefined || controller.sign.username != 'asdf')) {
                if (creep.pos.inRangeTo(controller.pos.x, controller?.pos.y, 1)) {
                    creep.signController(controller, 'Owo')
                } else {
                    creep.moveTo(controller)
                }
            } else {
                if (creep.room.find(FIND_HOSTILE_STRUCTURES).find(structure => structure.structureType === "keeperLair")) {
                    memory.currIndex++;

                    memory.route[memory.currIndex].lastVisit = Game.time
                    Game.rooms[memory.home].memory.scoutPlan = memory.route;
                    return;
                }
                creep.room.find(FIND_SOURCES).forEach(source => {
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
                        }
                    }
                })
                memory.currIndex++;
            }
        }
        creep.memory = memory
    }
}
