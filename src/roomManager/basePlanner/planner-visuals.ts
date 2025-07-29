import { getGradientColor, structureSymbols } from "utils/styling/stylingHelper";
import { defaultTextStyle } from "utils/styling/stylings";
import { PlacedStructure } from "./planner";

export function visulaizeStamps(room: Room, placedStructures: PlacedStructure[]) {
    for (const structure of placedStructures) {
        const symbol = structureSymbols[structure.type] ?? '?';
        room.visual.text(symbol, structure.x, structure.y, { ...defaultTextStyle })
    }
}

export function visualiseDT(room: Room) {
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
                room.visual.text(value.toString(), x, y, { align: 'center' })

                const color = getGradientColor(value, maxValue); // light cyan
                room.visual.rect(x, y, 1, 1, { fill: color })
            }
        }
    }
}
