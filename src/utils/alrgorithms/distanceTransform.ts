import {  floodFill, makeSimpleIncrementalFill } from "./floodFill";

interface dtObject {
    queuedEdges: Point[];
    dt: number[][];
}

export function getDistanceTransformMap(roomName: string, terrainMask: number): number[][] {
    const terrain = new Room.Terrain(roomName);
    const dtObject: dtObject = getDistanceTransform(terrain, terrainMask);
    let dt: number[][] = dtObject.dt;
    let queuedEdges: Point[] = dtObject.queuedEdges;

    // references of dt and queuedEdges are modified
    const fill = makeSimpleIncrementalFill();
    floodFill(dt, queuedEdges, fill.shouldVisit, fill.updateValue);

    Game.rooms[roomName].memory.distanceTransform = dt
    return dt;
}

function getDistanceTransform(terrain: RoomTerrain, terrainMask: number): dtObject {
    let dt: number[][] = []
    let queuedEdges: Point[] = [];
    for (let y = 0; y < 50; y++) {
        dt[y] = [];
        for (let x = 0; x < 50; x++) {
            const t = terrain.get(x, y);
            if (t === terrainMask) {
                dt[y][x] = 0;
                queuedEdges = queueTerrain(x, y, dt, queuedEdges);
            } else {
                dt[y][x] = Infinity;
            }
        }
    }
    return { queuedEdges, dt }
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
