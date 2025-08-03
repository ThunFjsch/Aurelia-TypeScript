import { priority, Point } from "utils/sharedTypes";
import { PlacedStructure } from "./planner-interfaces";

export class Infrastructure {
    placeResourceInfrastructure(room: Room) {
        const terrain = room.getTerrain();
        const roads = this.getRoadNetwork(room);
        const placed: PlacedStructure[] = [];

        for (const source of room.find(FIND_SOURCES)) {
            const pos = this.findAdjacentWalkableTile(source.pos, terrain);
            if (!pos) continue;

            placed.push({ type: STRUCTURE_CONTAINER, x: pos.x, y: pos.y, priority: priority.high });
            placed.push(...this.connectToRoadNetwork(room, pos, roads));
        }

        const mineral = room.find(FIND_MINERALS)[0];
        if (mineral) {
            placed.push({ type: STRUCTURE_EXTRACTOR, x: mineral.pos.x, y: mineral.pos.y, priority: priority.high });
            const container = this.findAdjacentWalkableTile(mineral.pos, terrain);
            if (container) placed.push(...this.connectToRoadNetwork(room, container, roads));
        }

        room.memory.basePlanner.stamps = (room.memory.basePlanner.stamps || []).concat(placed);
    }

    private getRoadNetwork(room: Room): RoomPosition[] {
        return (room.memory.basePlanner.stamps || [])
            .filter(s => s.type === STRUCTURE_ROAD)
            .map(s => new RoomPosition(s.x, s.y, room.name));
    }

    connectToRoadNetwork(room: Room, from: Point, roads: RoomPosition[]): PlacedStructure[] {
        const fromPos = new RoomPosition(from.x, from.y, room.name);
        const target = roads.length ? fromPos.findClosestByRange(roads) : null;
        if (!target) return [];

        const path = room.findPath(fromPos, target, { range: 1, ignoreCreeps: true, ignoreRoads: true });

        return path.map(p => ({
            type: STRUCTURE_ROAD,
            x: p.x,
            y: p.y,
            priority: priority.low
        }));
    }

    private findAdjacentWalkableTile(pos: RoomPosition, terrain: RoomTerrain): Point | null {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const x = pos.x + dx;
                const y = pos.y + dy;
                if (x >= 0 && x < 50 && y >= 0 && y < 50 && terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                    return { x, y };
                }
            }
        }
        return null;
    }


    placeUpgraderContainer(room: Room, center: Point) {
        const road = this.connectToRoadNetwork(room, center, this.getRoadNetwork(room));

        const placed = [
            { type: STRUCTURE_CONTAINER, x: center.x, y: center.y, priority: priority.high },
            ...road
        ];

        room.memory.basePlanner.stamps = (room.memory.basePlanner.stamps || []).concat(placed);
    }
}
