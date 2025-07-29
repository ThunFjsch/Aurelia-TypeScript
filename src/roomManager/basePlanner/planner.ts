import { getStartLocation } from "utils/alrgorithms/distanceTransform";
import { CoreStamp } from "./stamps";
import { affirmingGreen, defaultTextStyle } from "utils/styling/stylings";
import { priority } from "utils/sharedTypes";
import { visulaizeStamps, visualiseDT } from "./planner-visuals";

export type PlacedStructure = {
    type: StructureConstant;
    x: number;
    y: number;
    priority?: number;
}

interface ScoredPoint {
    x: number;
    y: number;
    score: number
}

export class Planner {
    startRoomPlanner(room: Room, spawn?: StructureSpawn) {
        room.memory.basePlanner = {};
        let startlocation;
        if (spawn === undefined) {
            startlocation = getStartLocation(room);
        } else {
            startlocation = { x: spawn.pos.x, y: spawn.pos.y, score: 0 }
        }
        room.memory.basePlanner.startlocation = startlocation;

        let stamps = this.placeCore(startlocation, spawn)
        room.memory.basePlanner.stamps = stamps;
    }

    placeCore(startLocation: ScoredPoint, spawn?: StructureSpawn) {
        const placed: PlacedStructure[] = [];

        const offset = spawn ? 1 : 0;
        const centerX = startLocation.x - offset;
        const centerY = startLocation.y - offset;

        for (const [structureType, positions] of Object.entries(CoreStamp.structures)) {
            for (const rel of positions) {
                placed.push({
                    type: structureType as StructureConstant,
                    x: centerX - CoreStamp.center.x + rel.x,
                    y: centerY - CoreStamp.center.y + rel.y,
                    priority: rel.priority ?? priority.medium
                });
            }
        }

        return placed;
    }

    placeUpgraderLocation(room: Room) {

    }

    visualizePlanner(room: Room) {
        if (room.memory.basePlanner.stamps) {
            visulaizeStamps(room, room.memory.basePlanner.stamps)
        }

        if (room.memory.basePlanner.distanceTransform) {
            visualiseDT(room)
        }

        if (!!room.memory.basePlanner.startlocation) {
            room.visual.text(`${room.memory.basePlanner.startlocation.score}`,
                room.memory.basePlanner.startlocation.x,
                room.memory.basePlanner.startlocation.y,
                { ...defaultTextStyle, color: affirmingGreen })
        }
    }
}

