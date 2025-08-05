import { settings } from "config";
import { Objective } from "objectives/objectiveInterfaces";
import { drawTextBox } from "utils/styling/stylingHelper";

export function visualizeObjectives(objectives: Objective[]) {
    if (!Memory.globalReset) return;

    for (let name in Memory.myRooms) {
        const roomName = Memory.myRooms[name];
        const room = Game.rooms[roomName];
        if (room === undefined) return;
        let startX = settings.objective.startX;
        let startY = settings.objective.startY;
        const width = 12;
        let info: string[] = ["Objectives", "Type | Priority | Target"]
        let income = 0;
        objectives.forEach((objective) => {
            if(objective.maxIncome > 0){
                info.push(`${objective.type} | ${objective.priority} | ${objective.target} | ${objective.maxIncome.toFixed(2)}`)
            }else{
                info.push(`${objective.type} | ${objective.priority} | ${objective.target}`)
            }
            income += objective.maxIncome
        });
        info.push(`Income: ${income.toFixed(2)}`);

        drawTextBox(room, info, width, startX, startY);
    }
}
