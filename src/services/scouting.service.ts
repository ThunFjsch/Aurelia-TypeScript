import { logger } from "utils/logger/logger";
import { PathingService } from "./pathing.service";
import { EconomyService } from "./economy.service";
import { minerBuilder } from "creeps/creepFactory";

const pathingService =  new PathingService();
const economyService = new EconomyService();
export class ScoutingService {
    addSource(room: Room, source: Source): SourceInfo | undefined{
        const spawn: StructureSpawn = room.find(FIND_MY_SPAWNS)[0];
        const route: PathFinderPath | undefined = pathingService.findPath(spawn.pos, source.pos);
        if(route === undefined) {
            logger.error('No Routie created/addSource aborted', {error: 'ScoutingService/addSource'})
            return
        };

        const spotAmmount = this.getSpots(source);
        const energyPerTick = this.getEnergyPerTickForSource(source);

        const sourceInfo: SourceInfo = {
            my: room.controller?.my,
            id: source.id,
            pos: room.controller?.pos,
            spots: spotAmmount,
            energy: 0,
            ePerTick: energyPerTick,
            container: route.path[route.path.length - 1],
            distance: route.path.length,
            maxIncome: economyService.getMaxSourceIncome(route, energyPerTick, spawn, room),
            maxHaulerParts: economyService.requiredHaulerParts(energyPerTick, route),
            maxWorkParts: economyService.getBodyPartAmount(minerBuilder({ room, energyPerTick }), WORK)
        }
        return sourceInfo;
    }

    getSpots(source: Source){
        const pos = source.pos;
        let sourceArcea = source.room.lookAtArea(pos.y + 1, pos.x - 1, pos.y - 1, pos.x + 1, true);
        return sourceArcea.filter(spot => spot.terrain != 'wall').length;
    }

    getEnergyPerTickForSource(source: Source): number {
        return source.energyCapacity / ENERGY_REGEN_TIME
    }
}
