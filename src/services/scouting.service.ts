import { logger } from "utils/logger/logger";
import { PathingService } from "./pathing.service";
import { EconomyService } from "./economy.service";
import { Point } from "utils/sharedTypes";

const pathingService = new PathingService();
const economyService = new EconomyService();

export class ScoutingService {
    addSource(room: Room, source: Source): SourceInfo | undefined {
        Memory.sourceInfo = Memory.sourceInfo.filter(elm => elm != null)
        const spawn: StructureSpawn = room.find(FIND_MY_SPAWNS)[0];
        const spots: LookAtResult<LookConstant>[] = this.getSpots(source)
        const route: PathFinderPath | undefined = pathingService.findPath(spawn.pos, source.pos);
        if (route === undefined) {
            logger.error('No Routie created/addSource aborted', { error: 'ScoutingService/addSource' })
            return
        };
        let sourceInfo: SourceInfo;
        if(route.cost < 100){
            const energyPerTick = this.getEnergyPerTickForSource(source);
            let my = false;
            if(room.controller?.my) my = true;
            if(room.controller?.reservation?.username === 'ThunFisch') my = true;
            sourceInfo = {
                my: my,
                id: source.id,
                pos: room.controller?.pos,
                roomName: source.room.name,
                home: spawn.room.name,
                spots: spots.length - 1,
                energy: 0,
                ePerTick: energyPerTick,
                distance: route.path.length,
                path: route.path,
                maxIncome: economyService.getMaxSourceIncome(route, energyPerTick, spawn, room),
                maxHaulerParts: economyService.requiredHaulerParts(energyPerTick, route.cost),
                maxWorkParts: (energyPerTick / 2)
            }
        } else{
            sourceInfo = {
                my: room.controller?.my?? false,
                id: source.id,
                spots: spots.length-1,
                roomName: room.name
            }
        }
        return sourceInfo;
    }

    getSpots(source: Source) {
        const pos = source.pos;
        let sourceArcea = source.room.lookAtArea(pos.y - 1, pos.x - 1, pos.y + 1, pos.x + 1, true);
        return sourceArcea.filter(spot => spot.terrain != 'wall');
    }

    getEnergyPerTickForSource(source: Source): number {
        return source.energyCapacity / ENERGY_REGEN_TIME
    }

    /**
     * Main method to get an optimal scout route using BFS
     */
    getRoomScoutRoute(roomObject: Room): ScoutPlan[] {
        const visited = new Set<string>();
        const queue: Array<{ name: string, distance: number }> = [];
        const result: ScoutPlan[] = [];

        // Start with adjacent rooms
        const startExits = Game.map.describeExits(roomObject.name);
        Object.values(startExits).forEach(exitRoom => {
            if (exitRoom) {
                queue.push({ name: exitRoom, distance: 1 });
            }
        });

        while (queue.length > 0 && result.length < 20) { // Limit total rooms
            const current = queue.shift()!;

            if (visited.has(current.name)) continue;
            visited.add(current.name);

            const exits = Game.map.describeExits(current.name);
            result.push({roomName: current.name, lastVisit: 0});

            // Add neighboring rooms to queue if within range
            if (current.distance < 3) {
                Object.values(exits).forEach(exitRoom => {
                    if (exitRoom && !visited.has(exitRoom)) {
                        queue.push({ name: exitRoom, distance: current.distance + 1 });
                    }
                });
            }
        }
        return result;
    }

    /**
     * Alternative method using BFS with directional clustering for more organized routes
     */
    getRoomScoutRouteWithClustering(roomObject: Room): RoomDistance[] {
        // Get rooms organized by distance layers
        const roomsByLayer = this.getBFSLayers(roomObject.name, 3);

        // Within each layer, group by direction
        const optimizedRoute: RoomDistance[] = [];

        roomsByLayer.forEach(layer => {
            const clusters = this.getDirectionalClusters(roomObject.name, layer);

            // Add rooms from each direction in a logical order
            const directionOrder = ['north', 'northeast', 'east', 'southeast',
                'south', 'southwest', 'west', 'northwest'];

            directionOrder.forEach(dir => {
                optimizedRoute.push(...clusters[dir]);
            });
        });

        return optimizedRoute;
    }

    /**
     * Helper method to get rooms organized by BFS layers (distance groups)
     */
    private getBFSLayers(baseRoomName: string, maxDistance: number): RoomDistance[][] {
        const layers: RoomDistance[][] = [];
        const visited = new Set<string>();
        const queue: Array<{ name: string, distance: number }> = [];

        // Initialize with adjacent rooms
        const startExits = Game.map.describeExits(baseRoomName);
        Object.values(startExits).forEach(exitRoom => {
            if (exitRoom) {
                queue.push({ name: exitRoom, distance: 1 });
            }
        });

        while (queue.length > 0) {
            const current = queue.shift()!;

            if (visited.has(current.name)) continue;
            visited.add(current.name);

            // Ensure we have an array for this distance layer
            if (!layers[current.distance - 1]) {
                layers[current.distance - 1] = [];
            }

            const exits = Game.map.describeExits(current.name);
            layers[current.distance - 1].push({
                name: current.name,
                distance: current.distance,
                exits: exits
            });

            // Add neighboring rooms if within range
            if (current.distance < maxDistance) {
                Object.values(exits).forEach(exitRoom => {
                    if (exitRoom && !visited.has(exitRoom)) {
                        queue.push({ name: exitRoom, distance: current.distance + 1 });
                    }
                });
            }
        }
        return layers.filter(layer => layer.length > 0); // Remove empty layers
    }

    /**
     * Group rooms by their direction from the base room
     */
    private getDirectionalClusters(baseRoom: string, rooms: RoomDistance[]) {
        const clusters: { [key: string]: RoomDistance[] } = {
            north: [], south: [], east: [], west: [],
            northeast: [], northwest: [], southeast: [], southwest: []
        };

        rooms.forEach(room => {
            const direction = this.getDirection(baseRoom, room.name);
            clusters[direction].push(room);
        });

        // Sort each cluster by distance
        Object.keys(clusters).forEach(dir => {
            clusters[dir].sort((a, b) => a.distance - b.distance);
        });

        return clusters;
    }

    /**
     * Determine the direction of targetRoom relative to baseRoom
     */
    private getDirection(baseRoom: string, targetRoom: string): string {
        const baseCoords = this.parseRoomName(baseRoom);
        const targetCoords = this.parseRoomName(targetRoom);

        const deltaX = targetCoords.x - baseCoords.x;
        const deltaY = targetCoords.y - baseCoords.y;

        // Determine primary directions
        let direction = '';

        if (deltaY > 0) direction += 'north';
        else if (deltaY < 0) direction += 'south';

        if (deltaX > 0) direction += 'east';
        else if (deltaX < 0) direction += 'west';

        return direction || 'center'; // fallback, though shouldn't happen
    }

    /**
     * Parse room name to get coordinates
     */
    private parseRoomName(roomName: string): Point {
        const matches = roomName.match(/^([WE])(\d+)([NS])(\d+)$/);
        if (!matches) {
            throw new Error(`Invalid room name: ${roomName}`);
        }

        const [, ewDir, xStr, nsDir, yStr] = matches;

        let x = parseInt(xStr);
        let y = parseInt(yStr);

        // Convert to absolute coordinates (West/South are negative)
        if (ewDir === 'W') x = -x - 1;
        if (nsDir === 'S') y = -y - 1;

        return { x, y };
    }

    /**
     * Traveling salesman approximation for optimal room visiting order
     */
    createOptimalRoute(rooms: RoomDistance[], startRoom: string): RoomDistance[] {
        const unvisited = [...rooms];
        const route: RoomDistance[] = [];
        let currentRoom = startRoom;

        while (unvisited.length > 0) {
            // Find nearest unvisited room
            let nearest = unvisited[0];
            let nearestIndex = 0;
            let shortestDistance = Game.map.getRoomLinearDistance(currentRoom, nearest.name);

            for (let i = 1; i < unvisited.length; i++) {
                const distance = Game.map.getRoomLinearDistance(currentRoom, unvisited[i].name);
                if (distance < shortestDistance) {
                    shortestDistance = distance; // Fixed typo: was 'shortest'
                    nearest = unvisited[i];
                    nearestIndex = i;
                }
            }

            route.push(nearest);
            unvisited.splice(nearestIndex, 1);
            currentRoom = nearest.name;
        }

        return route;
    }

    /**
     * Calculate priority score for a room based on various factors
     */
    private calculatePriority(room: RoomDistance, baseRoom: string): number {
        let priority = 0;

        // Lower distance = higher priority
        priority += (10 - room.distance) * 2;

        // More exits = higher priority (more connectivity)
        priority += Object.keys(room.exits).length;

        // Rooms that connect multiple directions get bonus
        if (this.isJunctionRoom(room)) {
            priority += 5;
        }

        return priority;
    }

    /**
     * Check if a room is a junction (connects multiple directions)
     */
    private isJunctionRoom(room: RoomDistance): boolean {
        return Object.keys(room.exits).length >= 3;
    }
}

interface RoomDistance {
    name: string,
    distance: number,
    exits: ExitsInformation
}
