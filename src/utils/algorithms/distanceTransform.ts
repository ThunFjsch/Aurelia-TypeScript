import { Point } from "utils/sharedTypes";
import { floodFill, makeSimpleIncrementalFill } from "./floodFill";

interface dtObject {
    queuedEdges: Point[];
    dt: number[][];
}

export function getDistanceTransformMap(
    terrain: RoomTerrain,
    terrainMask: number,
    margin: number = 0,
    occupied?: boolean[][]
): number[][] {
    const { dt, queuedEdges } = getDistanceTransform(terrain, terrainMask, margin, occupied);
    const fill = makeSimpleIncrementalFill();
    floodFill(dt, queuedEdges, fill.shouldVisit, fill.updateValue);
    return dt;
}



/**
 * Calculates a distance transform map from terrain walls and optionally occupied positions (e.g. stamps).
 *
 * @param roomNameOrTerrain - Room name or preloaded RoomTerrain object
 * @param terrainMask - Usually TERRAIN_MASK_WALL
 * @param margin - Optional boundary to exclude from flood fill (e.g. 1 to avoid room edges)
 * @param occupied - Optional boolean grid [50][50] of blocked tiles (e.g. stamps, controller upgrades)
 */
export function getDistanceTransform(
    roomNameOrTerrain: string | RoomTerrain,
    terrainMask: number,
    margin: number = 0,
    occupied?: boolean[][]
): dtObject {
    const terrain: RoomTerrain =
        typeof roomNameOrTerrain === "string"
            ? new Room.Terrain(roomNameOrTerrain)
            : roomNameOrTerrain;

    const dt: number[][] = [];
    const seedPositions: Point[] = [];

    // First pass: build base map, and collect seed points (walls + occupied)
    for (let y = 0; y < 50; y++) {
        dt[y] = [];
        for (let x = 0; x < 50; x++) {
            if (x < margin || x >= 50 - margin || y < margin || y >= 50 - margin) {
                dt[y][x] = 0;
                continue;
            }

            const isWall = terrain.get(x, y) === terrainMask;
            const isOccupied = occupied?.[y]?.[x] ?? false;

            if (isWall || isOccupied) {
                dt[y][x] = 0;
                seedPositions.push({ x, y });
            } else {
                dt[y][x] = Infinity;
            }
        }
    }

    // Second pass: seed adjacent walkable tiles to start the floodFill
    let queuedEdges: Point[] = [];
    for (const { x, y } of seedPositions) {
        queuedEdges = queueTerrain(x, y, dt, queuedEdges);
    }

    return { queuedEdges, dt };
}

function queueTerrain(x: number, y: number, dt: number[][], queuedTerrains: Point[]): Point[] {
    // Add adjacent tiles to queue
    for (const dx of [-1, 0, 1]) {
        for (const dy of [-1, 0, 1]) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < 50 && ny >= 0 && ny < 50) {
                if (dt[ny] === undefined) dt[ny] = [];
                if (dt[ny][nx] === undefined || dt[ny][nx] === Infinity) {
                    dt[ny][nx] = 1;
                    queuedTerrains.push({ x: nx, y: ny });
                }
            }
        }
    }
    return queuedTerrains
}
