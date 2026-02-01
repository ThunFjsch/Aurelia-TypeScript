import { priority, Point, Priority } from "utils/sharedTypes";
import { PlacedStructure, RemoteRoomInfrastructure, RoadPriority } from "./planner-interfaces";
// import { RoadUtilizationService } from "./road-utilization.service";
import { getCurrentConstruction } from "roomManager/constructionManager";
import { PathingService } from "services/pathing.service";

const pathingService = new PathingService();

export class Infrastructure {
  placeResourceInfrastructure(room: Room) {
    const terrain = room.getTerrain();
    let roads = this.getRoadNetwork(room);
    const placed: PlacedStructure[] = [];

    for (const source of room.find(FIND_SOURCES)) {
      const pos = this.findAdjacentWalkableTile(source.pos, terrain);
      if (!pos) continue;

      placed.push({ type: STRUCTURE_CONTAINER, x: pos.x, y: pos.y, priority: priority.high, requiredRCL: 2 });
      placed.push(...this.connectToRoadNetwork(room, pos, roads, 2));
    }

    roads = this.getRoadNetwork(room);

    const mineral = room.find(FIND_MINERALS)[0];
    if (mineral) {
      placed.push({
        type: STRUCTURE_EXTRACTOR,
        x: mineral.pos.x,
        y: mineral.pos.y,
        priority: priority.high,
        requiredRCL: 6
      });
      const container = this.findAdjacentWalkableTile(mineral.pos, terrain);
      if (container) placed.push(...this.connectToRoadNetwork(room, container, roads, 2));
    }

    room.memory.basePlanner.stamps = (room.memory.basePlanner.stamps || []).concat(placed);

    // Update road priorities based on utilization
    // RoadUtilizationService.updateRoadsWithPriority(room);
  }

  private getRoadNetwork(room: Room): RoomPosition[] {
    return (room.memory.basePlanner.stamps || [])
      .filter(s => s.type === STRUCTURE_ROAD)
      .map(s => new RoomPosition(s.x, s.y, room.name));
  }

  connectToRoadNetwork(room: Room, from: Point, roads: RoomPosition[], requiredRCL: number = 5): PlacedStructure[] {
    const fromPos = new RoomPosition(from.x, from.y, room.name);

    // Find the best connecting road (closest by path)
    const target = fromPos.findClosestByPath(roads);
    if (!target) return [];

    const path = pathingService.findPath(fromPos, target);
    if (path === undefined) return [];

    return path.path.map(p => ({
      type: STRUCTURE_ROAD,
      x: p.x,
      y: p.y,
      requiredRCL: requiredRCL
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
    const road = this.connectToRoadNetwork(room, center, this.getRoadNetwork(room), 3);

    const placed: PlacedStructure[] = [
      { type: STRUCTURE_CONTAINER, x: center.x, y: center.y, priority: priority.high, requiredRCL: 3 },
      ...road
    ];

    room.memory.basePlanner.stamps = (room.memory.basePlanner.stamps || []).concat(placed);
  }

  placeRemoteRoomInfrastructure(remoteRoom: Room, originRoom: Room): boolean {
    if (!originRoom.memory.constructionOffice.finished) {
      return false;
    }

    const terrain = remoteRoom.getTerrain();
    const placed: PlacedStructure[] = [];

    for (const source of remoteRoom.find(FIND_SOURCES)) {
      const pos = this.findAdjacentWalkableTile(source.pos, terrain);
      if (!pos) continue;
      const container = { type: STRUCTURE_CONTAINER, x: pos.x, y: pos.y, priority: priority.high, requiredRCL: 1 }
      placed.push(container);

      const originPos = originRoom.find(FIND_MY_SPAWNS)[0].pos;
      if (originPos) {
        const path = pathingService.findPath(new RoomPosition(pos.x, pos.y, remoteRoom.name), originPos);

        if(path === undefined) return false;

        const roadStructures = [];
        let checkedRooms = []
        for(const pos of path.path){
          if(pos.roomName != remoteRoom.name){
            const otherRoom = Game.rooms[pos.roomName];
            if(otherRoom.memory.basePlanner != undefined && otherRoom.memory.basePlanner.stamps != undefined && checkedRooms.find(s => s === pos.roomName) === undefined){
              console.log(pos.roomName)
              const temp = this.connectToRoadNetwork(otherRoom, new RoomPosition(pos.x, pos.y, pos.roomName), (otherRoom.memory.basePlanner.stamps.filter(s => s.type === STRUCTURE_ROAD).map(r => new RoomPosition(r.x, r.y, pos.roomName))?? []), 2)
              if(temp.length != 0){
                otherRoom.memory.basePlanner.stamps.push(...temp)
                checkedRooms.push(pos.roomName);
                continue
              } else{
                otherRoom.memory.basePlanner = { startlocation: {x: 0, y: 0, score: 99}}
                otherRoom.memory.basePlanner.startlocation = {x: 0, y: 0, score: 99}
                otherRoom.memory.basePlanner.stamps = [];
                otherRoom.memory.basePlanner.stamps?.push({
                  type: STRUCTURE_ROAD,
                  x: pos.x,
                  y: pos.y,
                  priority: priority.high, // Remote roads are high priority for hauler efficiency
                  roadPriority: RoadPriority.REMOTE,
                  requiredRCL: 2
                })
              }
            } else if(checkedRooms.find(s => s === pos.roomName) === undefined){
              otherRoom.memory.basePlanner = { startlocation: {x: 0, y: 0, score: 99}}
              otherRoom.memory.basePlanner.startlocation = {x: 0, y: 0, score: 99}
              otherRoom.memory.basePlanner.stamps = [];
              otherRoom.memory.basePlanner.stamps?.push({
                type: STRUCTURE_ROAD,
                x: pos.x,
                y: pos.y,
                priority: priority.high, // Remote roads are high priority for hauler efficiency
                roadPriority: RoadPriority.REMOTE,
                requiredRCL: 2
              })
            }
          }else if(placed.length > 2){
            placed.push(...this.connectToRoadNetwork(remoteRoom, container, placed.filter(s => s.type === STRUCTURE_ROAD).map(r => new RoomPosition(r.x, r.y, pos.roomName))?? [], 2));
            continue;
          } else{
            roadStructures.push({
            type: STRUCTURE_ROAD,
            x: pos.x,
            y: pos.y,
            priority: priority.high, // Remote roads are high priority for hauler efficiency
            roadPriority: RoadPriority.REMOTE,
            requiredRCL: 2
          })
          }
        }

        placed.push(...roadStructures);
      }
    }

    if (!remoteRoom.memory.basePlanner) {
      remoteRoom.memory.basePlanner = { startlocation: { x: 0, y: 0, score: 0 }, stamps: [] };
    }

    remoteRoom.memory.basePlanner.stamps = (remoteRoom.memory.basePlanner.stamps || []).concat(placed);

    const remoteInfra: RemoteRoomInfrastructure = {
      roomName: remoteRoom.name,
      originRoom: originRoom.name,
      requiredRCL: 3
    };

    if (!originRoom.memory.remoteRooms) {
      originRoom.memory.remoteRooms = [];
    }

    const existingIndex =
      originRoom.memory.remoteRooms?.findIndex((r: RemoteRoomInfrastructure) => r.roomName === remoteRoom.name) ?? -1;
    if (existingIndex >= 0) {
      originRoom.memory.remoteRooms![existingIndex] = remoteInfra;
    } else {
      originRoom.memory.remoteRooms!.push(remoteInfra);
    }

    return true;
  }

  maintainRemoteRoomInfrastructure(remoteRoom: Room, originRoom: Room): boolean {
    if (!originRoom.controller || originRoom.controller.level < 3 || !originRoom.memory.constructionOffice.finished) {
      return false;
    }
    const containers = remoteRoom.find(FIND_STRUCTURES).filter(s => s.structureType === STRUCTURE_CONTAINER);
    if (
      containers.length === 0 &&
      remoteRoom.memory != undefined &&
      remoteRoom.memory.basePlanner.stamps != undefined
    ) {
      if (remoteRoom.memory.constructionOffice === undefined) {
        remoteRoom.memory.constructionOffice = {
          finished: false,
          lastJob: 2,
          plans: remoteRoom.memory.basePlanner.stamps
        };
      }
    }
    if (remoteRoom.memory.constructionOffice.plans.length != 0) {
      const cSite = remoteRoom.find(FIND_MY_CONSTRUCTION_SITES)[0];
      if (cSite === undefined && remoteRoom) {
        const stamp = remoteRoom.memory.constructionOffice.plans[0];
        if (this.isPositionBlocked(remoteRoom, stamp.x, stamp.y)) {
          remoteRoom.memory.constructionOffice.plans.shift();
        }
        const res = remoteRoom.createConstructionSite(new RoomPosition(stamp.x, stamp.y, remoteRoom.name), stamp.type);
        if (res === ERR_INVALID_TARGET) {
          remoteRoom.memory.constructionOffice.plans.shift();
        }
      }
      remoteRoom.memory.constructionOffice.finished = false;
    } else {
      remoteRoom.memory.constructionOffice.finished = true;
    }

    return true;
  }

  private isPositionBlocked(room: Room, x: number, y: number): boolean {
    // Check terrain first (most efficient)
    const terrain = room.getTerrain();
    if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
      return true;
    }

    // Check for existing structures that would block construction
    const structures = room.lookForAt(LOOK_STRUCTURES, x, y);
    return structures.some(structure => structure.structureType === STRUCTURE_WALL);
  }
}
