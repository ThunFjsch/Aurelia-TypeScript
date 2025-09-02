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
    used: string;
    avg: number;
}

export interface heapStats {
    used: number;
}

export interface StatInfo{
    time: number;
    cpu: cpuStats;
    heap: heapStats
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

        if (this.avgIndex > this.avgSize) this.avgIndex = 0;
        this.time = Game.time;
        this.avgData[this.avgIndex] = currentUsed;
        this.avgIndex++;
        this.cpu = this.getCPUStats();
        this.heap = this.getHeapStats();
    }

    getCPUStats(): cpuStats {
        return {
            bucket: Game.cpu.bucket,
            limit: Game.cpu.limit,
            used: Game.cpu.getUsed().toFixed(2),
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

    getStatInfo(): StatInfo{
        return {
            time: this.time,
            cpu: this.cpu,
            heap: this.heap
        }
    }

}
