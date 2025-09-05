import { moveTo } from "screeps-cartographer";
import { getInTargetRange } from "./creepHelper";
import { PathCachingService } from "services/pathCaching.service";

export class Reserving{
    pathCachingService: PathCachingService;

    constructor(pathCaching: PathCachingService) {
        this.pathCachingService = pathCaching;
    }

    run(creep: Creep){
        const memory = creep.memory as ReservMemory
        if(creep.room.name != memory.targetRoom){
            const target = new RoomPosition(10,25, memory.targetRoom);
            moveTo(creep, target)
        } else{
            const controller = creep.room.controller
            if(controller === undefined) return
            if(memory.target === undefined) {
                memory.target = controller.id
            }
            getInTargetRange(creep, (target: StructureController) => {creep.reserveController(target)}, this.pathCachingService, 1)
        }
    }
}
