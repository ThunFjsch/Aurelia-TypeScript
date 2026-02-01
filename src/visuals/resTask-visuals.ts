import { Task } from "services/resource.service";
import { drawTextBox } from "utils/styling/stylingHelper";

export function visualizeResourceTasks(tasks: Task[]) {
    if (!Memory.globalReset) return;

    for (let name in Memory.myRooms) {
        const roomName = Memory.myRooms[name];
        const room = Game.rooms[roomName];
        if (room === undefined) return;
        let startX = 0;
        let startY = 3;
        const width = 8;
        let info: string[] = ["Type | Amount | Ass | Prio"]
        tasks.forEach((task) => {
            if(task.amount > 0 && task.home === room.name && task.transferType != "transfer"){
                info.push(`${task.transferType} | ${task.amount}, | ${task.assigned.length}/${task.maxAssigned.toFixed(2)} | ${task.priority}`)
            }
        });

        drawTextBox(room, info, width, startX, startY);
    }
}
