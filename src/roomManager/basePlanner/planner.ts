import { getDistanceTransformMap } from "utils/algorithms/distanceTransform";
import { Point } from "utils/sharedTypes";
import { StartingLocation } from "./planner-startingLocation";
import { ScoredPoint } from "./planner-interfaces";
import { Infrastructure } from "./planner-infrastructure";
import { PlannerCore } from "./planner-core";
import { distanceFormula } from "./planner-helper";
import { PlannerDefence } from "./planner-defence";
import { logger } from "utils/logger/logger";

const infrastructure = new Infrastructure();
const core = new PlannerCore();
const starter = new StartingLocation();
const defence = new PlannerDefence(infrastructure);

export class Planner {
    startRoomPlanner(room: Room, spawn?: StructureSpawn) {
        this.initializeMemory(room, spawn);

        const startLocation = room.memory.basePlanner.startlocation;
        const centers: Point[] = [];
        centers.push({ x: startLocation.x, y: startLocation.y });

        const coreStamps = core.placeCore(startLocation, spawn);
        room.memory.basePlanner.stamps = coreStamps;

        infrastructure.placeResourceInfrastructure(room);

        const upgraderInfo = this.placeUpgraderLocation(room, startLocation);
        room.memory.basePlanner.upgradeLocations = upgraderInfo.spots;
        infrastructure.placeUpgraderContainer(room, upgraderInfo.center);

        core.placeAllStamps(room, room.memory.basePlanner.stamps, startLocation, centers);

        const occupied = core.getOccupiedGrid(room, false);
        room.memory.basePlanner.distanceTransform = getDistanceTransformMap(room.getTerrain(), TERRAIN_MASK_WALL, 0, occupied);

        defence.run(room, startLocation);
        logger.info('Build Planner created build Plan');
    }

    private initializeMemory(room: Room, spawn?: StructureSpawn) {
        room.memory.basePlanner = {
            startlocation: { x: 0, y: 0, score: 0 }
        };

        let startLocation: ScoredPoint;
        if (spawn) {
            startLocation = { x: spawn.pos.x, y: spawn.pos.y, score: 0 };
        } else {
            startLocation = starter.getStartLocation(room);
        }

        room.memory.basePlanner.startlocation = startLocation;
    }

    private placeUpgraderLocation(room: Room, start: Point): { center: Point; spots: Point[] } {
        const controller = room.controller;
        if (!controller) return { center: { x: 0, y: 0 }, spots: [] };

        const dt = getDistanceTransformMap(room.getTerrain(), TERRAIN_MASK_WALL);
        let best: Point = { x: 0, y: 0 };
        let bestDist = Infinity;

        for (let y = 0; y < 50; y++) {
            for (let x = 0; x < 50; x++) {
                if (controller.pos.inRangeTo(x, y, 3) && dt[y][x] === 2) {
                    const dist = Math.round(distanceFormula(x, y, start.x, start.y));
                    if (dist < bestDist) {
                        best = { x, y };
                        bestDist = dist;
                    }
                    dt[y][x] = dist;
                } else {
                    dt[y][x] = 0;
                }
            }
        }

        const spots: Point[] = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                spots.push({ x: best.x + dx, y: best.y + dy });
            }
        }

        return { center: best, spots };
    }
}
