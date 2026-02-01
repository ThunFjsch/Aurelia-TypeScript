import { settings } from "config";
import { Objective, roleContants } from "objectives/objectiveInterfaces";
import { EconomyService } from "services/economy.service";
import { drawTextBox } from "utils/styling/stylingHelper";

const eco = new EconomyService();

export function visualizeObjectives(objectives: Objective[], room: Room) {
    if (!Memory.globalReset) return;
    let startX = settings.objective.startX;
    let startY = settings.objective.startY;
    const width = 10;
    let info: string[] = ["Objectives", "Type | Priority | Target | Inc | HParts"]
    let income = 0;
    let haulerCapacity = 0;
    objectives.forEach((objective) => {
        if (true) {
            if (objective.maxIncome > 0) {
                info.push(`${objective.type} | ${objective.priority} | ${objective.target} | ${objective.maxIncome.toFixed(2)} | ${objective.maxHaulerParts.toFixed(2)}`)
            } else {
                info.push(`${objective.type} | ${objective.priority} | ${objective.target} | ${objective.maxHaulerParts.toFixed(2)}`)
            }
            income += objective.maxIncome
            if (objective.type != roleContants.HAULING) {
                haulerCapacity += objective.maxHaulerParts
            }
        }
    });
    info.push(`Income: ${eco.getCurrentRoomIncome(room, objectives).toFixed(2)}/${income.toFixed(2)}  | ${(haulerCapacity).toFixed(2)}`);

    drawTextBox(room, info, width, startX, startY);
}
