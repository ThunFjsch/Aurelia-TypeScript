import { getDistanceTransformMap } from "utils/alrgorithms/distanceTransform";

export class Planner {
    startRoomPlanner(room: Room) {
        // Get or create distance transform map
        let dt: number[][] = []
        if (room.memory.distanceTransform === undefined) {
            dt = getDistanceTransformMap(room.name, TERRAIN_MASK_WALL);
        } else {
            dt = room.memory.distanceTransform;
        }

        // pick Starting location

    }

    visualiseDT(room: Room) {
        if (!!room.memory.distanceTransform) {

            let maxValue = 0;
            for (let y = 0; y < 50; y++) {
                for (let x = 0; x < 50; x++) {
                    maxValue = Math.max(maxValue, room.memory.distanceTransform[y][x]);
                }
            }

            for (let y = 0; y < 50; y++) {
                for (let x = 0; x < 50; x++) {
                    const value = room.memory.distanceTransform[y][x]
                    room.visual.text(value.toString(), x, y)

                    const color = getGradientColor(value, maxValue); // light cyan
                    room.visual.rect(x, y, 1, 1, { fill: color })
                }
            }
        }
    }
}

// helper function for the visualiseDT function.
function getGradientColor(value: number, max: number): string {
    // Normalize to 0..1
    const t = Math.min(1, value / max);

    // Linear gradient from blue (low) to white (high)
    const r = 255;
    const g = Math.round(255 * t);
    const b = Math.round(255 * t);

    return `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`;
}
