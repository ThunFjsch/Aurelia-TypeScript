import { testMinCut } from "utils/algorithms/mincut";
import { Point } from "utils/sharedTypes";
import { PlacedStructure } from "./planner-interfaces";
import { floodFill } from "utils/algorithms/floodFill";
import { Infrastructure } from "./planner-infrastructure";
import { distanceFormula } from "./planner-helper";

type WallSection = Point[];

export class PlannerDefence {
    infrastructure: Infrastructure;

    constructor(Infrastructure: Infrastructure) {
        this.infrastructure = Infrastructure;
    }

    run(room: Room) {
        const walls = this.placeWalls(room);
        if (walls === undefined) return;
        const towers = this.planTowers(room, walls);

        for (const tower of towers) {
            const info: PlacedStructure = {
                type: 'tower',
                x: tower.x,
                y: tower.y,
            };
            if (room.memory.basePlanner.stamps === undefined) return;
            room.memory.basePlanner.stamps.push(info);
        }

    }

    placeWalls(room: Room) {

        testMinCut(false, room);
        const walls = room.memory.basePlanner.cuts;
        if (!walls) return;

        // Step 1: Convert wall data to Points
        const wallPoints: Point[] = walls.map(w => ({ x: w.x, y: w.y }));

        if (room.memory.basePlanner.stamps === undefined) return;

        // Step 2: Get all existing roads
        const roads: RoomPosition[] = room.memory.basePlanner.stamps
            .filter(s => s.type === 'road')
            .map(s => new RoomPosition(s.x, s.y, room.name));

        // Step 3: Group wall sections
        const wallSections = this.groupWallSectionsFromGrid(wallPoints);

        // Step 4: Process each wall section
        for (const section of wallSections) {
            const closest = this.findClosestWallTile(section, roads, room.name);
            if (!closest) continue;

            const info: PlacedStructure = {
                type: 'road',
                x: closest.x,
                y: closest.y,
            };
            room.memory.basePlanner.stamps.push(info);

            // Optional: Connect it to the network
            const connection = this.infrastructure.connectToRoadNetwork(room, { x: closest.x, y: closest.y }, roads);
            room.memory.basePlanner.stamps.push(...connection);
        }

        for (const wall of walls) {
            if (room.memory.basePlanner.stamps.includes({ x: wall.x, y: wall.y, type: 'road' })) continue;
            const info: PlacedStructure = {
                type: 'road',
                x: wall.x,
                y: wall.y,
            };
            room.memory.basePlanner.stamps.push(info);
        }
        return walls
    }


    /** Group wall tiles into contiguous wall sections using your floodFill */
    groupWallSectionsFromGrid(walls: Point[]): WallSection[] {
        const grid: number[][] = Array.from({ length: 50 }, () => Array(50).fill(0));
        const sectionMap: number[][] = Array.from({ length: 50 }, () => Array(50).fill(0));
        const unprocessed = new Set<string>();

        // Mark wall points in grid
        for (const { x, y } of walls) {
            grid[y][x] = 1;
            unprocessed.add(`${x},${y}`);
        }

        const sections: WallSection[] = [];
        let currentRegionId = 1;

        for (const { x, y } of walls) {
            if (sectionMap[y][x] !== 0) continue; // Already assigned

            const regionPoints: Point[] = [];
            const seeds: Point[] = [{ x, y }];

            const shouldVisit = (nx: number, ny: number, current: number, _from: number) => {
                return grid[ny][nx] === 1 && sectionMap[ny][nx] === 0;
            };

            const updateValue = (nx: number, ny: number, _from: number) => {
                regionPoints.push({ x: nx, y: ny });
                sectionMap[ny][nx] = currentRegionId;
                return currentRegionId;
            };

            floodFill(sectionMap, seeds, shouldVisit, updateValue);

            sections.push(regionPoints);
            currentRegionId++;
        }

        return sections;
    }

    findClosestWallTile(section: Point[], roads: RoomPosition[], roomName: string): RoomPosition | null {
        let closest: RoomPosition | null = null;
        let minDist = Infinity;

        for (const wall of section) {
            const wallPos = new RoomPosition(wall.x, wall.y, roomName);
            for (const road of roads) {
                const dist = wallPos.getRangeTo(road);
                if (dist < minDist) {
                    minDist = dist;
                    closest = wallPos;
                }
            }
        }

        return closest;
    }

    planTowers(room: Room, wallPositions: Point[], desiredCount: number = 6): RoomPosition[] {
        const terrain = new Room.Terrain(room.name);
        const baseCenter = new RoomPosition(25, 25, room.name); // Or use your base anchor
        const candidates: RoomPosition[] = [];

        // 1. Generate all walkable internal positions
        for (let x = 2; x < 48; x++) {
            for (let y = 2; y < 48; y++) {
                const pos = new RoomPosition(x, y, room.name);

                if (
                    terrain.get(x, y) !== TERRAIN_MASK_WALL &&
                    room.lookForAt(LOOK_STRUCTURES, pos).length === 0
                ) {
                    candidates.push(pos);
                }
            }
        }

        // 2. Score candidates
        const scored: { pos: RoomPosition; score: number }[] = candidates.map(pos => {
            // Distance to wall entrances
            const wallDistScore = Math.min(...wallPositions.map(w => distanceFormula(pos.x, pos.y, w.x, w.y)));

            // Distance to base center
            const centerScore = 25 - pos.getRangeTo(baseCenter);

            return {
                pos,
                score: wallDistScore + centerScore // You can tweak this formula
            };
        });

        // 3. Sort by descending score and pick top N
        const topTowers = _.sortBy(scored, s => -s.score)
            .slice(0, desiredCount)
            .map(s => s.pos);

        return topTowers;
    }

}
