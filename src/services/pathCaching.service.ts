import { cachePath, getCachedPath } from "screeps-cartographer";
import { PathingService } from "./pathing.service";
import { roleContants } from "objectives/objectiveInterfaces";

export class PathCachingService {
    private pathingService: PathingService;

    constructor(pathingService: PathingService) {
        this.pathingService = pathingService;
    }

    /**
     * Get or create a cached path between two positions
     * Returns a path key that can be used with moveByPath
     */
    getOrCreatePath(from: RoomPosition, to: RoomPosition): string {
        // Create a unique key for this path
        const pathKey = this.generatePathKey(from, to);

        // Check if path already exists
        const existingPath = getCachedPath(pathKey);

        if (existingPath && existingPath.length > 0) {
            // console.log(`Using existing cached path: ${pathKey}`);
            return pathKey;
        }

        // Create new cached path
        // console.log(`Creating new cached path: ${pathKey}`);
        const newPath = cachePath(pathKey, from, to, {
            maxOps: 20000,
            maxRooms: 16,
            // Room callback for custom costs
            roomCallback: (roomName: string) => {
                const room = Game.rooms[roomName];
                if (room === undefined) return false;
                const costs = new PathFinder.CostMatrix();
                // Avoid creeps
                room.find(FIND_CREEPS).forEach(creep => {
                    if (creep.memory != undefined && (creep.memory.role === roleContants.MINING)) {
                        costs.set(creep.pos.x, creep.pos.y, 255);
                    }
                    if (creep.memory != undefined && (creep.memory.role === roleContants.UPGRADING || creep.memory.role === roleContants.BUILDING || creep.memory.role === roleContants.FASTFILLER)) {
                        costs.set(creep.pos.x, creep.pos.y, 50);
                    }
                });

                //     // Prefer roads
                room.find(FIND_STRUCTURES).forEach(struct => {
                    if (struct.structureType === STRUCTURE_ROAD) {
                        costs.set(struct.pos.x, struct.pos.y, 1);
                    }
                });

                return costs;
            }
        });

        if (newPath && newPath.length > 0) {
            // console.log(`Cached path created with ${newPath.length} steps`);
            return pathKey;
        } else {
            console.log(`Failed to create path from ${from} to ${to}`);
            return "";
        }
    }

    /**
     * Generate a unique key for a path between two positions
     */
    private generatePathKey(from: RoomPosition, to: RoomPosition): string {
        return `path_${from.roomName}_${from.x}_${from.y}_to_${to.roomName}_${to.x}_${to.y}`;
    }

    /**
     * Clear a specific cached path
     */
    clearPath(from: RoomPosition, to: RoomPosition): void {
        const pathKey = this.generatePathKey(from, to);
        // Note: Cartographer doesn't expose a direct clear method
        // Paths will be automatically cleaned up based on their TTL
        console.log(`Marked path for cleanup: ${pathKey}`);
    }

    /**
     * Get path information for debugging
     */
    getPathInfo(pathKey: string): RoomPosition[] | undefined {
        return getCachedPath(pathKey);
    }
}
