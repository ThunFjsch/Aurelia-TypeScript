import { settings } from "config";
import { HaulingObjective, Objective, roleContants } from "objectives/objectiveInterfaces";
import { EconomyService } from "services/economy.service";
import { StatInfo } from "stats";
import { drawTextBox } from "utils/styling/stylingHelper";

    export function visualiseStats(stats: StatInfo, average: number, room: Room, objectives: Objective[], economyService: EconomyService) {
        if (!Memory.globalReset) return;
            const haulerObjective = objectives.find(o => o.type === roleContants.HAULING) as HaulingObjective;

            let startX = settings.stats.startX;
            let startY = settings.stats.startY;
            const width = 11;
            const info = [
                'Performance',
                `time: ${stats.time.toString()}`,
                'cpu: ' + stats.cpu.used.toString() + " / " + stats.cpu.limit.toString(),
                `Bucket: ${stats.cpu.bucket}`,
                `Average(${average}): ${stats.cpu.avg}`,
                `used Heap: ${stats.heap.used}`,
                ``,
                `${room.name}`,
                `income: ${economyService.getCurrentRoomIncome(room, objectives).toFixed(2)}`,
                `sources: ${objectives.filter(o => o.type === roleContants.MINING).length}`,
                `h Capacity: ${haulerObjective?.maxHaulerParts.toFixed(2)}`,
                `h curr: ${haulerObjective?.currParts}`,
                ``,
                `Progress:`
            ]
            room.memory.rclProgress.forEach(prog => {
                info.push(`${prog.level}: ${prog.finished - room.memory.rclProgress[0].finished}`)
            })

            drawTextBox(room, info, width, startX, startY);
    }
