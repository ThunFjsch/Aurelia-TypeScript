import { settings } from "config";
import { defaultTextStyle } from "./stylings";

export const structureSymbols: Record<StructureConstant, string> = {
    spawn: '⚪',
    extension: '🔋',
    road: '▫️',
    storage: '📦',
    terminal: '🏪',
    tower: '🎯',
    observer: '🔭',
    powerSpawn: '⚡',
    factory: '🏭',
    nuker: '☢️',
    container: '📥',
    lab: '⚗️',
    link: '🔗',
    constructedWall: '🟫',
    extractor: '🛸',
    rampart: '🟩',
    controller: '',
    invaderCore: '',
    keeperLair: '',
    portal: '',
    powerBank: ''
};

// helper function for the visualiseDT function.
export function getGradientColor(value: number, max: number): string {
    // Normalize to 0..1
    const t = Math.min(1, value / max);

    // Linear gradient from blue (low) to white (high)
    const r = 255;
    const g = Math.round(255 * t);
    const b = Math.round(255 * t);

    return `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`;
}


export function drawTextBox(room: Room, info: string[], width: number, startX: number, startY: number) {
    const height = info.length + 1

    room.visual.rect(startX, startY, width, height, settings.stats.innerBoxStyle);

    startX++; startY++;   // margin +· 1
    for(let i in info){
        if(startX > 49 || startY > 49) return
        room.visual.text(info[i], new RoomPosition(startX, startY, room.name), { ...defaultTextStyle, align: 'left' });
        startY++;
    }
}
