import { getCurrentConstruction } from "roomManager/constructionManager";
import BasicCreep from "./creepHelper";
import { moveTo } from "screeps-cartographer";
import { PathCachingService } from "services/pathCaching.service";

export class Building extends BasicCreep {
  constructor(pathCaching: PathCachingService) {
    super(pathCaching);
  }

  run(creep: Creep) {
    const memory = creep.memory as BuilderMemory;
    let spawn = Game.getObjectById(memory.spawn);
    if (spawn === null) {
      spawn = Game.rooms[memory.home].find(FIND_MY_SPAWNS)[0];
    }

    if (memory.target === undefined || memory.target === null) {
      // First check for ramparts needing repair in current room
      const lowRampart = this.findLowRampart(creep.room);
      if (lowRampart) {
        memory.target = lowRampart.id;
        memory.isRepairing = true;
      } else {
        // Look for construction in current room first
        let target = getCurrentConstruction(Game.rooms[memory.home], creep);
        let targetRoom = creep.room.name;

        // // If no construction in current room, check related remote rooms
        if (target != null) {
          memory.target = target.id;
          memory.targetRoom = targetRoom;
          memory.isRepairing = false;
        }
        //   const homeRoom = Game.rooms[memory.home];
        //   if (homeRoom?.memory.remoteRooms) {
        //     for (const remoteInfo of homeRoom.memory.remoteRooms) {
        //       const remoteRoom = Game.rooms[remoteInfo.roomName];
        //       if (remoteRoom) {
        //         target = getCurrentConstruction(remoteRoom, creep);
        //         if (target) {
        //           targetRoom = remoteRoom.name;
        //           break;
        //         }
        //       }
        //     }
        //   }
        // }


      }

      creep.memory = memory;
      if (memory.done && creep.pos.inRangeTo(spawn.pos.x, spawn.pos.y, 1)) {
        spawn.recycleCreep(creep);
      } else if (memory.done) {
        this.creepPathMove(creep, spawn);
      }
      return;
    }

    const target = Game.getObjectById(memory.target);
    if (target === null) {
      memory.target = undefined;
      creep.memory = memory;
      return;
    }

    // Move to target room if different from current room
    if (memory.targetRoom && creep.room.name !== memory.targetRoom) {
      if (memory.targetRoom != creep.room.name) {
        this.moveToRoom(creep, memory.targetRoom);
        return;
      }
    }

    if (creep.pos.x === target.pos.x && creep.pos.y === target.pos.y) {
      moveTo(creep, new RoomPosition(32, 33, creep.room.name));
      return;
    }

    this.helpAFriend(creep, memory);

    const doInRange = (target: ConstructionSite | Structure) => {
      if (memory.isRepairing && target instanceof Structure) {
        const repairResult = creep.repair(target);
        // If rampart is at 3k HP, clear target to find next task
        if (target.hits >= 3000) {
          memory.target = undefined;
        }
      } else if (target instanceof ConstructionSite) {
        creep.build(target);
      }
    };

    if (creep.store.energy === 0) {
      memory.working = false;
    } else {
      memory.working = true;
    }

    this.getInTargetRange(creep, doInRange, 2);
  }

  // Find ramparts with less than 50000 HP
  private findLowRampart(room: Room): StructureRampart | undefined {
    const ramparts = room.find(FIND_STRUCTURES, {
      filter: s => s.structureType === STRUCTURE_RAMPART && s.hits < 50000
    }) as StructureRampart[];

    return ramparts[0]; // You can add sorting logic here if needed
  }
}
