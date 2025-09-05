export function getRoomCreepCounts(roomName: string) {
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
            if (!key.endsWith(`_${Game.time}`)) {
                delete global.roomCreepCounts[key];
            }
        }
    }

    return global.roomCreepCounts[cacheKey];
}
