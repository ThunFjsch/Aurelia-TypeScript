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

    run(room: Room, center: Point) {
        const walls = this.placeWalls(room);
        if (walls === undefined) return;
        const towers = this.planTowers(room, walls, 6);

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

        // Step 3: Group wall sections
        const wallSections = this.groupWallSectionsFromGrid(wallPoints);

        // Step 4: Process each wall section
        for (const section of wallSections) {
            // Step 2: Get all existing roads
            const roads: RoomPosition[] = this.getRoadNetwork(room);

            const closest = this.findClosestWallTile(section, roads, room.name);
            if (!closest) continue;

            const info: PlacedStructure = {
                type: 'rampart',
                x: closest.x,
                y: closest.y,
            };
            room.memory.basePlanner.stamps.push(info);

            // Optional: Connect it to the network
            const connection = this.infrastructure.connectToRoadNetwork(room, { x: closest.x, y: closest.y }, roads, 2);
            room.memory.basePlanner.stamps.push(...connection);
        }

        for (const wall of walls) {
            if (room.memory.basePlanner.stamps.some(s => s.x === wall.x && s.y === wall.y && s.type === 'road')) continue;

            const info: PlacedStructure = {
                type: 'rampart',
                x: wall.x,
                y: wall.y,
            };
            room.memory.basePlanner.stamps.push(info);
        }

        return walls;
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

    planTowers(room: Room, wallPositions: Point[], desiredCount: number = 6, minSpacing: number = 6): RoomPosition[] {
        const terrain = new Room.Terrain(room.name);
        const baseCenter = new RoomPosition(25, 25, room.name); // Use your actual anchor

        const stamps = room.memory.basePlanner.stamps ?? [];
        const occupied = new Set(stamps.map(s => `${s.x},${s.y}`));

        const candidates: RoomPosition[] = [];

        // Step 1: Collect candidates
        for (let x = 2; x < 48; x++) {
            for (let y = 2; y < 48; y++) {
                const key = `${x},${y}`;
                if (occupied.has(key)) continue;
                if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

                const pos = new RoomPosition(x, y, room.name);
                if (room.lookForAt(LOOK_STRUCTURES, pos).length > 0) continue;

                candidates.push(pos);
            }
        }

        // Step 2: Score them
        const scored: { pos: RoomPosition; score: number }[] = candidates.map(pos => {
            const distToCenter = pos.getRangeTo(baseCenter);
            const distToNearestWall = Math.min(...wallPositions.map(w => distanceFormula(pos.x, pos.y, w.x, w.y)));

            const balanceScore = -Math.abs(distToCenter - distToNearestWall);
            const proximityScore = -(distToCenter + distToNearestWall) * 0.1;

            const totalScore = balanceScore + proximityScore;

            return { pos, score: totalScore };
        });

        // Step 3: Select top-scoring positions while enforcing spacing
        const selected: RoomPosition[] = [];

        const sorted = _.sortBy(scored, s => -s.score);
        for (const { pos } of sorted) {
            if (
                selected.every(existing => existing.getRangeTo(pos) >= minSpacing)
            ) {
                selected.push(pos);
                if (selected.length >= desiredCount) break;
            }
        }

        return selected;
    }

    getRoadNetwork(room: Room): RoomPosition[] {
    return (room.memory.basePlanner.stamps || [])
      .filter(s => s.type === STRUCTURE_ROAD)
      .map(s => new RoomPosition(s.x, s.y, room.name));
  }
}
