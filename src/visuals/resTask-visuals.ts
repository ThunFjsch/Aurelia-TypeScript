import { settings } from "config";
import { Objective, roleContants } from "objectives/objectiveInterfaces";
import { EconomyService } from "services/economy.service";
import { Task } from "services/resource.service";
import { drawTextBox } from "utils/styling/stylingHelper";

const eco = new EconomyService();

export function visualizeResourceTasks(tasks: Task[]) {
    if (!Memory.globalReset) return;

    for (let name in Memory.myRooms) {
        const roomName = Memory.myRooms[name];
        const room = Game.rooms[roomName];
        if (room === undefined) return;
        let startX = 30;
        let startY = settings.objective.startY;
        const width = 13;
        let info: string[] = ["Type | Amount | Ass | Prio"]
        tasks.forEach((task) => {
            info.push(`${task.type} | ${task.amount}, | ${task.assigned.length}/${task.maxAssigned.toFixed(2)} | ${task.priority}`)
        });

        drawTextBox(room, info, width, startX, startY);
    }
}
