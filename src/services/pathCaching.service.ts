import { cachePath, getCachedPath } from "screeps-cartographer";
import { roleContants } from "objectives/objectiveInterfaces";

declare global {
    interface Memory {
        pathCacheMeta?: { [key: string]: { created: number; lastUsed: number } };
        failedPaths?: { [key: string]: number };
    }
}

export class PathCachingService {
    private roomCache: {
        [roomName: string]: {
            costMatrix: CostMatrix;
            tick: number;
        }
    } = {};

    /**
     * Get or create a cached path between two positions.
     * Returns a path key that can be used with moveByPath().
     */
    getOrCreatePath(from: RoomPosition, to: RoomPosition): string {
        const pathKey = this.generatePathKey(from, to);

        // Initialize memory objects
        if (!Memory.failedPaths) Memory.failedPaths = {};
        if (!Memory.pathCacheMeta) Memory.pathCacheMeta = {};

        // Skip retrying failed paths too soon
        if (Memory.failedPaths[pathKey] && Game.time - Memory.failedPaths[pathKey] < 25) {
            return "";
        }

        const existingPath = getCachedPath(pathKey);
        if (existingPath && existingPath.length > 0) {
            Memory.pathCacheMeta[pathKey] = {
                created: Memory.pathCacheMeta[pathKey]?.created ?? Game.time,
                lastUsed: Game.time
            };
            return pathKey;
        }

        const newPath = cachePath(pathKey, from, to, {
            maxOps: 20000,
            maxRooms: 16,
            roomCallback: (roomName: string) => this.getRoomCostMatrix(roomName)
        });

        if (newPath && newPath.length > 0) {
            Memory.pathCacheMeta[pathKey] = {
                created: Game.time,
                lastUsed: Game.time
            };
            return pathKey;
        } else {
            Memory.failedPaths[pathKey] = Game.time;
            // Optionally log failed paths
            // console.log(`⚠️ Failed to create path: ${pathKey}`);
            return "";
        }
    }

    /**
     * Create a rounded path key to avoid overspecific path generation.
     */
    private generatePathKey(from: RoomPosition, to: RoomPosition): string {
        const round = (val: number, factor = 2) => Math.floor(val / factor) * factor;

        const fx = round(from.x);
        const fy = round(from.y);
        const tx = round(to.x);
        const ty = round(to.y);

        return `path_${from.roomName}_${fx}_${fy}_to_${to.roomName}_${tx}_${ty}`;
    }

    /**
     * Generates a cost matrix for a room, avoiding certain creeps and preferring roads.
     */
    private getRoomCostMatrix(roomName: string): CostMatrix | false {
    const room = Game.rooms[roomName];
    if (room === undefined) return false;

    // Only cleanup paths periodically (every 100 ticks) instead of on every call
    if (Game.time % 100 === 0) {
        this.cleanupOldPaths();
    }

    // Cache the CostMatrix, not the objects
    if (this.roomCache[roomName] && Game.time - this.roomCache[roomName].tick <= 10) {
        return this.roomCache[roomName].costMatrix;
    }

    const costs = new PathFinder.CostMatrix();
    const creeps = room.find(FIND_CREEPS);
    const structures = room.find(FIND_STRUCTURES);

    for (const creep of creeps) {
        const role = creep.memory?.role;
        if (role === roleContants.MINING) {
            costs.set(creep.pos.x, creep.pos.y, 255);
        } else if ([roleContants.UPGRADING, roleContants.BUILDING, roleContants.FASTFILLER].includes(role as roleContants)) {
            costs.set(creep.pos.x, creep.pos.y, 50);
        }
    }

    for (const struct of structures) {
        if (struct.structureType === STRUCTURE_ROAD) {
            costs.set(struct.pos.x, struct.pos.y, 1);
        }
    }

    this.roomCache[roomName] = {
        costMatrix: costs,
        tick: Game.time
    };

    return costs;
}

    /**
     * Clear a specific cached path (metadata only).
     */
    clearPath(from: RoomPosition, to: RoomPosition): void {
        const pathKey = this.generatePathKey(from, to);
        delete Memory.pathCacheMeta?.[pathKey];
        delete Memory.failedPaths?.[pathKey];
        // Note: Cartographer handles actual path data expiration
        console.log(`🧹 Marked path for cleanup: ${pathKey}`);
    }

    /**
     * Get a cached path by key for debugging or direct use.
     */
    getPathInfo(pathKey: string): RoomPosition[] | undefined {
        return getCachedPath(pathKey);
    }

    /**
     * Optionally call this periodically to clean up unused paths.
     */
    cleanupOldPaths(maxAge = 3000) {
        if (!Memory.pathCacheMeta) return;

        for (const key in Memory.pathCacheMeta) {
            const meta = Memory.pathCacheMeta[key];
            if (Game.time - meta.lastUsed > maxAge) {
                delete Memory.pathCacheMeta[key];
                delete Memory.failedPaths?.[key];
                // You could also implement a call to clear the path in cartographer if supported
            }
        }
    }
}
