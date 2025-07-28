// Callback to decide if a tile can be visited / updated
type ShouldVisit = (x: number, y: number, current: number, from: number) => boolean;
// Callback to compute the new value
type UpdateValue = (x: number, y: number, from: number) => number;

export function floodFill(
    grid: number[][],
    seeds: Point[],
    shouldVisit: ShouldVisit,
    updateValue: UpdateValue
): number[][] {
    const queue: Point[] = [...seeds];

    while (queue.length > 0) {
        const { x, y } = queue.shift()!;
        const from = grid[y][x];

        for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= 50 || ny < 0 || ny >= 50) continue;

            const current = grid[ny][nx];
            if (shouldVisit(nx, ny, current, from)) {
                grid[ny][nx] = updateValue(nx, ny, from);
                queue.push({ x: nx, y: ny });
            }
        }
    }
    return grid;
}

export function makeSimpleIncrementalFill() {
    return {
        shouldVisit: (x: number, y: number, current: number, from: number) => current > from + 1,
        updateValue: (_x: number, _y: number, from: number) => from + 1,
    };
}
