import { settings } from "config";
import { logger } from "utils/logger/logger";

export class PathingService {
     findPath(current: RoomPosition, goal: RoomPosition): PathFinderPath | undefined{
        const currentRoom = current.roomName;

        let allowedRooms = {
            [currentRoom]: true,
        };

        let route = Game.map.findRoute(currentRoom, goal.roomName, {
            routeCallback(roomName) {
                let parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
                if (parsed === null) {
                    logger.error(`Error could not parse ${roomName}`, {error: 'findPath'})
                    return;
                }
                let isHighway = parseInt(parsed[1]) % 10 === 0 || parseInt(parsed[2]) % 10 === 0;

                if (isHighway) {
                    return 1;
                } else if (settings.avoidedRooms.includes(roomName)) {
                    return Infinity;
                } else {
                    return 1.5;
                }
            }
        });

        // Didn't find a path!
        if (route == ERR_NO_PATH) {
            logger.error(`Error finding path to ${current.roomName} from ${goal.roomName}`, {error: "PathingService/findPath"});
            return;
        }

        // sets
        route.forEach(function (info) {
            allowedRooms[info.room] = true;
        });

        // Invoke PathFinder, allowing access only to rooms from `findRoute`
        let path = PathFinder.search(current, goal, {
            plainCost: 1,
            swampCost: 3,
            roomCallback(currentRoom) {
                if (allowedRooms[currentRoom] === undefined) {
                    return false;
                }
                let room = Game.rooms[currentRoom];
                // In this example `room` will always exist, but since PathFinder
                // supports searches which span multiple rooms you should be careful!
                if (!room) return false;

                let costs = new PathFinder.CostMatrix();

                // TODO: When no vision this cannot be used and the pathfinder crahses
                // room.find(FIND_STRUCTURES).forEach(function (structure) {
                //     if (structure.structureType === STRUCTURE_ROAD) {
                //         // Favor roads over plain tiles
                //         costs.set(structure.pos.x, structure.pos.y, 1);
                //     } else if (
                //         structure.structureType !== STRUCTURE_CONTAINER &&
                //         (structure.structureType !== STRUCTURE_RAMPART || !structure.my)
                //     ) {
                //         // Can't walk through non-walkable buildings
                //         costs.set(structure.pos.x, structure.pos.y, 0xff);
                //     }
                // });

                return costs;
            },
        });
        if(path.incomplete){
            logger.warn(`Error completing path ${JSON.stringify(current)}, goal position: ${JSON.stringify(goal)}`)
        }
        return path;
    }
}
