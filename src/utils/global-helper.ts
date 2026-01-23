// In utils/global-helper.ts

// Declare global type if not already done
declare global {
    var roomCreepCounts: { [key: string]: { [role: string]: number } };
}

/**
 * Get creep counts by role for a specific room
 * Cached per tick to avoid repeated iterations
 */
export function getRoomCreepCounts(roomName: string): { [role: string]: number } {
    const cacheKey = `${roomName}_${Game.time}`;

    if (!global.roomCreepCounts[cacheKey]) {
        const counts: { [role: string]: number } = {};

        for (const creepName in Game.creeps) {
            const memory = Game.creeps[creepName].memory;
            if (memory.home === roomName) {
                counts[memory.role] = (counts[memory.role] || 0) + 1;
            }
        }

        global.roomCreepCounts[cacheKey] = counts;

        // Clean old entries (only keep current tick)
        for (const key in global.roomCreepCounts) {
            if (!key.endsWith(`_${Game.time}`)) {  // Fixed: Added backtick
                delete global.roomCreepCounts[key];
            }
        }
    }

    return global.roomCreepCounts[cacheKey];
}

/**
 * Alternative: Build all room counts at once in main loop
 * This is even more efficient if you need counts for multiple rooms
 */
export function buildAllRoomCreepCounts(): Map<string, { [role: string]: number }> {
    const allCounts = new Map<string, { [role: string]: number }>();

    for (const creepName in Game.creeps) {
        const creep = Game.creeps[creepName];
        const home = creep.memory.home;
        const role = creep.memory.role;

        if (!allCounts.has(home)) {
            allCounts.set(home, {});
        }

        const counts = allCounts.get(home)!;
        counts[role] = (counts[role] || 0) + 1;
    }

    return allCounts;
}

// Usage example in main.ts:
// const allRoomCounts = buildAllRoomCreepCounts();
// Then pass to services or store in global
