import { settings } from "config";
import { visualizePlanner } from "./planner-visuals";
import { visualiseStats } from "./stats-visuals";
import { StatInfo } from "stats";
import { Objective } from "objectives/objectiveInterfaces";
import { visualizeObjectives } from "./objective-visuals";

export class Visualizer {
    visualizeRoom(room: Room, statInfo: StatInfo, cpuAverage: number, objectives: Objective[]) {
        if (settings.visuals.basePlanning) visualizePlanner(room);
        if (settings.visuals.showStats) visualiseStats(statInfo, cpuAverage);
        if (settings.visuals.showObjectives) visualizeObjectives(objectives);

        //TODO: This is my idea  for a mascot. Did get some cord via gpt. But will try to get the cords with wolfram
        // Let blahaj Mascot be a real thing!
        const vis = new RoomVisual();

        const OFFSET = { x: 1, y: 40 };

        const moved = scaledPoints.map(p => ({
            x: p.x + OFFSET.x,
            y: p.y + OFFSET.y
        }));


        for (let i = 0; i < moved.length - 1; i++) {
            const p1 = moved[i];
            const p2 = moved[i + 1];

            vis.line(p1.x, p1.y, p2.x, p2.y, {
                color: 'white',
                opacity: 0.5,
                width: 0.05
            });
        }

    }
}

const scaledPoints: { x: number, y: number }[] = [
    { x: 9.196, y: 1.841 },
    { x: 9.383, y: 1.841 },
    { x: 9.383, y: 2.384 },
    { x: 8.952, y: 3.922 },
    { x: 6.819, y: 4.946 },
    { x: 6.67, y: 5.661 },
    { x: 5.5, y: 6.102 },
    { x: 5.238, y: 6.082 },
    { x: 5.008, y: 6.006 },
    { x: 4.782, y: 5.799 },
    { x: 4.306, y: 5.088 },
    { x: 3.824, y: 5.694 },
    { x: 3.44, y: 6.125 },
    { x: 2.825, y: 7.246 },
    { x: 2.854, y: 8.629 },
    { x: 2.533, y: 8.46 },
    { x: 1.958, y: 7.715 },
    { x: 1.635, y: 6.955 },
    { x: 1.387, y: 6.218 },
    { x: 1.26, y: 5.449 },
    { x: 1.26, y: 4.57 },
    { x: 1.494, y: 3.701 },
    { x: 2.109, y: 2.881 },
    { x: 3.047, y: 2.373 },
    { x: 3.529, y: 2.305 },
    { x: 3.798, y: 1.572 },
    { x: 4.375, y: 0.947 },
    { x: 5.011, y: 0.625 },
    { x: 5.732, y: 0.615 },
    { x: 6.406, y: 0.87 },
    { x: 7.305, y: 1.699 },
    { x: 9.196, y: 1.841 }
];
