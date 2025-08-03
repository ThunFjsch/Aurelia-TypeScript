import { settings } from "config";
import { StatInfo } from "stats";
import { drawTextBox } from "utils/styling/stylingHelper";

    export function visualiseStats(stats: StatInfo, average: number) {
        if (!Memory.globalReset) return;

        for (let name in Memory.myRooms) {
            const roomName = Memory.myRooms[name];
            const room = Game.rooms[roomName];
            if (room === undefined) return;
            let startX = settings.stats.startX;
            let startY = settings.stats.startY;
            const width = 11;
            const info = [
                'Performance',
                `time: ${stats.time.toString()}`,
                'cpu: ' + stats.cpu.used.toString() + " / " + stats.cpu.limit.toString(),
                `Bucket: ${stats.cpu.bucket}`,
                `Average(${average}): ${stats.cpu.avg}`,
                `used Heap: ${stats.heap.used}`
            ]
            drawTextBox(room, info, width, startX, startY);
        }
    }
