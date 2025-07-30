import { getDistanceTransformMap } from "utils/alrgorithms/distanceTransform";
import { CoreStamp } from "./stamps";
import { Point, priority } from "utils/sharedTypes";
import { distanceFormula, getLowestScoreDTMap, pickStartingLocations } from "./startingLocation";
import { settings } from "config";

export type PlacedStructure = {
    type: StructureConstant;
    x: number;
    y: number;
    priority?: number;
}

interface ScoredPoint {
    x: number;
    y: number;
    score: number
}

export class Planner {
    startRoomPlanner(room: Room, spawn?: StructureSpawn) {
        room.memory.basePlanner = {};
        let startlocation;
        if (spawn === undefined) {
            startlocation = this.getStartLocation(room);
            spawn = room.find(FIND_MY_SPAWNS)[0];
        } else {
            startlocation = { x: spawn.pos.x, y: spawn.pos.y, score: 0 }
        }
        room.memory.basePlanner.startlocation = startlocation;

        let stamps = this.placeCore(startlocation, spawn)
        room.memory.basePlanner.stamps = stamps;
        const upgradeInfo = this.placeUpgraderLocation(room, startlocation);
        room.memory.basePlanner.upgradeLocations = upgradeInfo.spots
        const occupied = this.getOccupiedGrid(room);
        const dt = getDistanceTransformMap(room.getTerrain(), TERRAIN_MASK_WALL, 0, occupied);
        room.memory.basePlanner.distanceTransform = dt
    }

    getStartLocation(room: Room) {
        // Get or create distance transform map
        let dt: number[][] = []
        if (room.memory.basePlanner.distanceTransform === undefined) {
            dt = getDistanceTransformMap(room.getTerrain(), TERRAIN_MASK_WALL, settings.buildPlanner.margin);
            Game.rooms[room.name].memory.basePlanner.distanceTransform = dt
        } else {
            dt = room.memory.basePlanner.distanceTransform;
        }

        // pick Starting location
        const potentialPositions = pickStartingLocations(dt, room)
        let startLocations = getLowestScoreDTMap(potentialPositions);
        room.memory.basePlanner.distanceTransform = startLocations.result;
        //TODO: Not just select the middle array value
        return startLocations.scoredPositions[5];
    }

    placeCore(startLocation: ScoredPoint, spawn?: StructureSpawn) {
        const placed: PlacedStructure[] = [];

        const offset = spawn ? 1 : 0;
        const centerX = startLocation.x - offset;
        const centerY = startLocation.y - offset;

        for (const [structureType, positions] of Object.entries(CoreStamp.structures)) {
            for (const rel of positions) {
                placed.push({
                    type: structureType as StructureConstant,
                    x: centerX - CoreStamp.center.x + rel.x,
                    y: centerY - CoreStamp.center.y + rel.y,
                    priority: rel.priority ?? priority.medium
                });
            }
        }

        return placed;
    }

    placeUpgraderLocation(room: Room, startLocation: any): { center: Point; spots: Point[] } {
        let center: Point = { x: 0, y: 0 }

        const controller = room.controller;
        if (!controller) return { center, spots: [] };

        const dt = getDistanceTransformMap(room.getTerrain(), TERRAIN_MASK_WALL);
        for (let y = 0; y < 50; y++) {
            for (let x = 0; x < 50; x++) {
                if (controller.pos.inRangeTo(x, y, 3) && dt[y][x] === 2) {
                    dt[y][x] = Math.round(distanceFormula(x, y, startLocation.x, startLocation.y));
                    continue;
                };
                dt[y][x] = 0;
            }
        }

        let lowest = 100
        for (let y = 0; y < 50; y++) {
            for (let x = 0; x < 50; x++) {

                if (dt[y][x] < lowest && dt[y][x] != 0) {
                    lowest = dt[y][x];
                    center = { x, y };
                }
            }
        }

        const spots: Point[] = []
        for (const dy of [-1, 0, 1]) {
            for (const dx of [-1, 0, 1]) {
                spots.push({ x: (center.x + dx), y: (center.y + dy) })
            }
        }

        return { center, spots };
    }

    getOccupiedGrid(room: Room): boolean[][] {
        const grid: boolean[][] = Array.from({ length: 50 }, () =>
            Array.from({ length: 50 }, () => false)
        );

        const stamps = room.memory.basePlanner.stamps || [];
        for (const { x, y } of stamps) {
            if (x >= 0 && x < 50 && y >= 0 && y < 50) grid[y][x] = true;
        }

        const upgraders = room.memory.basePlanner.upgradeLocations || [];
        for (const { x, y } of upgraders) {
            if (x >= 0 && x < 50 && y >= 0 && y < 50) grid[y][x] = true;
        }

        return grid;
    }

}

