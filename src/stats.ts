import { settings } from "config";
import { drawTextBox } from "utils/styling/stylingHelper";

export interface Stats {
    cpu: cpuStats;
    heap: heapStats
    time: number;
    avgData: number[];
    avgIndex: number;
    update(): void;
    getCPUStats(): cpuStats;
    getHeapStats(): heapStats;
    getCpuAverage(): number;
    visualiseStats(): void;
}

export interface cpuStats {
    bucket: number;
    limit: number;
    used: number;
    avg: number;
}

export interface heapStats {
    used: number;
}

export class Stats implements Stats {
    readonly avgSize: number = 100;
    avgIndex: number;
    avgData: number[];
    time: number;
    cpu: cpuStats;
    heap: heapStats;

    constructor() {
        const initAverage = 5;
        this.avgIndex = 0;
        this.avgData = Array(this.avgSize).fill(initAverage)
        this.time = Game.time;
        this.cpu = this.getCPUStats();
        this.heap = this.getHeapStats();
    }

    update() {
        const currentUsed = Game.cpu.getUsed();

        if (this.avgIndex < this.avgSize) this.avgIndex = 0;
        this.avgData[this.avgIndex] = currentUsed;
        this.avgIndex++;
        this.cpu = this.getCPUStats();
        this.heap = this.getHeapStats();
    }

    getCPUStats(): cpuStats {
        return {
            bucket: Game.cpu.bucket,
            limit: Game.cpu.limit,
            used: Math.ceil(Game.cpu.getUsed()),
            avg: this.getCpuAverage()
        }
    }

    getHeapStats(): heapStats {
        const heapStats: any = Game.cpu.getHeapStatistics;

        if (!!heapStats) {
            return {
                used: heapStats.used_heap_size
            }
        }
        return { used: 0 }

    }

    getCpuAverage(): number {
        let sumOfUsed = 0;
        this.avgData.map(e => sumOfUsed += e);
        return Math.ceil(sumOfUsed / this.avgSize);
    }

    visualiseStats() {
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
                `time: ${this.time.toString()}`,
                'cpu: ' + this.cpu.used.toString() + " / " + this.cpu.limit.toString(),
                `Bucket: ${this.cpu.bucket}`,
                `Average(${this.avgSize}): ${this.cpu.avg}`,
                `used Heap: ${this.heap.used}`
            ]
            drawTextBox(room, info, width, startX, startY);
        }
    }
}
