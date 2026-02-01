import BasicCreep from "./creepHelper";
import { moveTo } from "screeps-cartographer";
import { getCurrentConstruction } from "roomManager/constructionManager";
import { PathCachingService } from "services/pathCaching.service";

export interface RemoteBuilderMemory extends CreepMemory {
  targetRoom: string;
  target?: Id<ConstructionSite | Structure>;
  isRepairing?: boolean;
  done?: boolean;
  reached?: boolean
}

export class RemoteBuilding extends BasicCreep {
  constructor(pathCaching: PathCachingService) {
    super(pathCaching);
  }

  run(creep: Creep) {
    const memory = creep.memory as RemoteBuilderMemory;

    // If not in target room, move there
    if (memory.reached === undefined) memory.reached = false;
        if (creep.room.name != memory.targetRoom && !memory.reached) {
            const exitPos = this.getExitToRoom(creep.room.name, memory.targetRoom);
            if(exitPos != undefined && exitPos.x != undefined && exitPos.y != undefined)
                creep.moveTo(exitPos.x, exitPos.y);
        } else{
          memory.reached = true
        }

    if(creep.room.name === memory.targetRoom && creep.room.memory.constructionOffice.finished){
      creep.suicide();
    }

    // Find construction target in remote room
    if (memory.target === undefined) {
      const targetId = getCurrentConstruction(creep.room, creep);
      memory.target = targetId?.id;
      memory.isRepairing = false;
      creep.memory = memory;

      // If no construction AND remote infrastructure is complete, return to home room
      const remoteRoom = Game.rooms[memory.targetRoom];
      const remoteOffice = remoteRoom?.memory.constructionOffice;

      if (
        !targetId &&
        (remoteOffice?.finished || !remoteOffice?.plans || remoteOffice.plans.length === 0)
      ) {
        memory.done = true;
        creep.memory = memory;
        return;
      }
    }

    const target = Game.getObjectById(memory.target!);
    if (target === null) {
      memory.target = undefined;
      creep.memory = memory;
      return;
    }

    if (creep.pos.x === target.pos.x && creep.pos.y === target.pos.y) {
      moveTo(creep, new RoomPosition(32, 33, creep.room.name));
      return;
    }

    this.helpAFriend(creep, memory);

    const doInRange = (target: ConstructionSite | Structure) => {
      if (memory.isRepairing && target instanceof Structure) {
        creep.repair(target);
      } else if (target instanceof ConstructionSite) {
        creep.build(target);
      }
    };

    if (creep.store.energy === 0) {
      memory.working = false;
    } else {
      memory.working = true;
    }

    this.getInTargetRange(creep, doInRange, 1);
  }

  chanting(creep: Creep) {
    const memory = creep.memory as RemoteBuilderMemory;
    if (memory.working) {
      creep.say("🏗️ Remote");
    } else {
      creep.say("🔋 Remote");
    }
  }
}
