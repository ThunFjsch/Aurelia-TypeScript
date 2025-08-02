import { Point, priority } from "utils/sharedTypes";
import { PlacedStructure, ScoredPoint } from "./planner-interfaces";
import { canPlaceStamp, CoreStamp, scoreStampAt, Stamp, stampPlan } from "./stamps";
import { getDistanceTransformMap } from "utils/algorithms/distanceTransform";

export class PlannerCore {
    placeCore(start: ScoredPoint, spawn?: StructureSpawn): PlacedStructure[] {
        const placed: PlacedStructure[] = [];
        const offset = spawn ? 1 : 0;
        const centerX = start.x - offset;
        const centerY = start.y - offset;

        for (const [type, positions] of Object.entries(CoreStamp.structures)) {
            for (const rel of positions) {
                placed.push({
                    type: type as StructureConstant,
                    x: centerX - CoreStamp.center.x + rel.x,
                    y: centerY - CoreStamp.center.y + rel.y,
                    priority: rel.priority ?? priority.medium
                });
            }
        }

        return placed;
    }

    placeAllStamps(room: Room, stamps: PlacedStructure[], startLocation: Point, centers: Point[]) {
        const placeAndTrack = (stamp: Stamp, repeat: number = 1) => {
            for (let i = 0; i < repeat; i++) {
                const occupied = this.getOccupiedGrid(room, true);
                const dt = getDistanceTransformMap(room.getTerrain(), TERRAIN_MASK_WALL, 0, occupied);
                const result = this.placeStamp(dt, stamp, startLocation, centers);

                stamps.push(...result.placements);
                centers.push(result.center);

                room.memory.basePlanner.stamps = stamps;
                room.memory.basePlanner.distanceTransform = dt;
            }
        };

        for (const { stamp, count } of stampPlan) {
            placeAndTrack(stamp, count);
        }

        this.placeRemainingExtensions(stamps, room, startLocation, centers);
    }

    getOccupiedGrid(room: Room, ignoreRoads: boolean): boolean[][] {
        const grid = Array.from({ length: 50 }, () => Array(50).fill(false));

        for (const { x, y, type } of room.memory.basePlanner.stamps || []) {
            if (!ignoreRoads || type !== STRUCTURE_ROAD) grid[y][x] = true;
        }

        for (const { x, y } of room.memory.basePlanner.upgradeLocations || []) {
            grid[y][x] = true;
        }

        return grid;
    }

    private placeStamp(dt: number[][], stamp: Stamp, start: Point, others: Point[]): { center: ScoredPoint; placements: PlacedStructure[] } {
        let best: ScoredPoint = { x: 0, y: 0, score: Infinity };

        for (let y = 0; y < 50; y++) {
            for (let x = 0; x < 50; x++) {
                if (!canPlaceStamp(x, y, stamp, dt)) continue;

                const score = scoreStampAt(x, y, stamp, dt, start, others);
                if (score < best.score) best = { x, y, score };
            }
        }

        const placements: PlacedStructure[] = [];
        for (const [type, positions] of Object.entries(stamp.structures)) {
            for (const rel of positions) {
                placements.push({
                    type: type as StructureConstant,
                    x: best.x + rel.x - stamp.center.x,
                    y: best.y + rel.y - stamp.center.y,
                    priority: rel.priority ?? priority.medium
                });
            }
        }

        return { center: best, placements };
    }

    private placeRemainingExtensions(stamps: PlacedStructure[], room: Room, start: Point, centers: Point[]): void {
        const count = 60 - stamps.filter(s => s.type === STRUCTURE_EXTENSION).length;

        const single: Stamp = {
            center: { x: 0, y: 0 },
            width: 1,
            height: 1,
            structures: {
                extension: [{ x: 0, y: 0 }]
            }
        };

        for (let i = 0; i < count; i++) {
            const dt = getDistanceTransformMap(room.getTerrain(), TERRAIN_MASK_WALL, 0, this.getOccupiedGrid(room, false));
            const result = this.placeStamp(dt, single, start, centers);

            stamps.push(...result.placements);
            centers.push(result.center);

            room.memory.basePlanner.stamps = stamps;
            room.memory.basePlanner.distanceTransform = dt;
        }
    }
}
