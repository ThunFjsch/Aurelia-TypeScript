import { getDistanceTransformMap } from "utils/alrgorithms/distanceTransform";
import { CoreStamp } from "./stamps";
import { settings } from "config";
import { getLowestScoreDTMap, pickStartingLocations } from "./startingLocation";

export class Planner {
    startRoomPlanner(room: Room) {
        room.memory.basePlanner = {}
        // Get or create distance transform map
        let dt: number[][] = []
        if (room.memory.basePlanner.distanceTransform === undefined) {
            dt = getDistanceTransformMap(room.name, TERRAIN_MASK_WALL, settings.buildPlanner.margin);
        } else {
            dt = room.memory.basePlanner.distanceTransform;
        }

        // pick Starting location
        const potentialPositions = pickStartingLocations(dt, room)
        let startLocations = getLowestScoreDTMap(potentialPositions);
        room.memory.basePlanner.distanceTransform = startLocations.result;
        //TODO: Not just select the middle array value
        const startlocation = startLocations.scoredPositions[5];
        room.memory.basePlanner.startlocation = startlocation;
    }


    visualiseDT(room: Room) {
        if (!!room.memory.basePlanner.distanceTransform) {

            let maxValue = 0;
            for (let y = 0; y < 50; y++) {
                for (let x = 0; x < 50; x++) {
                    maxValue = Math.max(maxValue, room.memory.basePlanner.distanceTransform[y][x]);
                }
            }

            for (let y = 0; y < 50; y++) {
                for (let x = 0; x < 50; x++) {
                    const value = room.memory.basePlanner.distanceTransform[y][x]
                    if (value === 0 || value === null) continue;
                    room.visual.text(value.toString(), x, y)

                    const color = getGradientColor(value, maxValue); // light cyan
                    room.visual.rect(x, y, 1, 1, { fill: color })
                }
            }
        }
        if(!!room.memory.basePlanner.startlocation){
            room.visual.text(`${room.memory.basePlanner.startlocation.score}`, room.memory.basePlanner.startlocation.x, room.memory.basePlanner.startlocation.y, {color: '#008000'})
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
