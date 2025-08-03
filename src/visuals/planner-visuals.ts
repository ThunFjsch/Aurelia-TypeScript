import { getGradientColor, structureSymbols } from "utils/styling/stylingHelper";
import { affirmingGreen, defaultTextStyle } from "utils/styling/stylings";
import { PlacedStructure } from "../roomManager/basePlanner/planner-interfaces";
import { settings } from "config";

    export function visualizePlanner(room: Room) {
        if (room.memory.basePlanner.upgradeLocations && settings.visuals.showStamps) {
            const upgradeLocation = room.memory.basePlanner.upgradeLocations
            for(let point of upgradeLocation){
                room.visual.text('🟨', new RoomPosition(point.x,point.y, room.name)), {opacity: 0.5};
            }
        }
        if (room.memory.basePlanner.stamps && settings.visuals.showStamps) {
            visulaizeStamps(room, room.memory.basePlanner.stamps)
        }

        if (room.memory.basePlanner.distanceTransform  && settings.visuals.distanceTransform) {
            visualiseDT(room);
        }

        if (!!room.memory.basePlanner.startlocation && settings.visuals.showStamps) {
            room.visual.text(`${room.memory.basePlanner.startlocation.score}`,
                room.memory.basePlanner.startlocation.x,
                room.memory.basePlanner.startlocation.y,
                { ...defaultTextStyle, color: affirmingGreen })
        }
    }

function visulaizeStamps(room: Room, placedStructures: PlacedStructure[]) {
    for (const structure of placedStructures) {
        const symbol = structureSymbols[structure.type] ?? '?';
        room.visual.text(symbol, structure.x, structure.y, { ...defaultTextStyle, align:"center"})
    }
}

function visualiseDT(room: Room) {
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

                const color = getGradientColor(value, maxValue); // light cyan
                room.visual.rect(x - 0.5, y - 0.5, 1, 1, { fill: color})
                room.visual.text(Math.floor(value).toString(), x, y)
            }
        }
    }
}
