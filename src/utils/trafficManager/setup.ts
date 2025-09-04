import { config } from "screeps-cartographer";

export function trafficManagerConfigSetup() {
    // Reduce default pathfinding range to save CPU
    config.DEFAULT_MOVE_OPTS.maxRooms = 16; // Default is 64, reduce for less CPU
    config.DEFAULT_MOVE_OPTS.maxOps = 2000; // Default is 20000, reduce for less CPU

    // Use longer reuse paths to avoid frequent recalculations
    config.DEFAULT_MOVE_OPTS.reusePath = 5; // Default is 5

    // Set reasonable defaults for terrain costs
    config.DEFAULT_MOVE_OPTS.plainCost = 2;
    config.DEFAULT_MOVE_OPTS.swampCost = 10;
    config.DEFAULT_MOVE_OPTS.roadCost = 1;
}
