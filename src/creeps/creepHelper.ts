import { ResourceService } from "services/resource.service";
import { HaulerMemory } from "./hauling";
import { moveByPath, moveTo } from "screeps-cartographer";
import { PathCachingService } from "services/pathCaching.service";
import { roleContants } from "objectives/objectiveInterfaces";
import memHack from "utils/memhack";
import { contains } from "lodash";

// Global cache that persists between ticks
interface RoomCache {
  spawns: StructureSpawn[];
  extensions: StructureExtension[];
  towers: StructureTower[];
  containers: StructureContainer[];
  creeps: Creep[];
  tick: number;
}

interface SpawnCache {
  spawn: StructureSpawn | null;
  tick: number;
}

export default class BasicCreep {
  private chants = new Map<roleContants, string[]>();
  pathCachingService: PathCachingService;

  // Caching structures
  private roomCache = new Map<string, RoomCache>();
  private spawnCache = new Map<string, SpawnCache>();
  private helpCache = new Map<
    string,
    {
      creeps: Creep[];
      tick: number;
    }
  >();

  // Store pre-sorted data from main loop
  private creepsByRoom: Map<string, Creep[]> | null = null;

  constructor(pathCaching: PathCachingService) {
    this.chants.set(roleContants.HAULING, ["🚛 📡", "⛐", "📦📍✅"]);
    this.chants.set(roleContants.MINING, ["⛏️", "⛰️💥"]);
    this.chants.set(roleContants.BUILDING, ["🏢🏗️", "📏🏗🧱", "🚧🏗️"]);
    this.chants.set(roleContants.PORTING, ["🚜", "🚢", "🌉"]);
    this.chants.set(roleContants.RESERVING, ["👾", "ε(´｡•᎑•`)っ 💕", "♨️"]);
    this.chants.set(roleContants.UPGRADING, ["⚡🕹️", "📈⬆", "𝓤𝓹𝓰𝓻𝓪𝓭𝓮"]);
    this.chants.set(roleContants.FASTFILLER, ["🏎️🍔", "🍕〽", "🍽️"]);
    this.chants.set(roleContants.SCOUTING, ["🕵️‍♂️", "⛺", "🌲🔎🌲"]);

    this.pathCachingService = pathCaching;
  }

  /**
   * Called from main loop to provide pre-sorted creep data
   */
  setCreepsByRoom(creepsByRoom: Map<string, Creep[]>): void {
    this.creepsByRoom = creepsByRoom;
  }

  /**
   * Get room structures with caching
   */
  private getRoomStructures(room: Room): RoomCache {
    let cached = this.roomCache.get(room.name);

    if (!cached || Game.time - cached.tick > 10) {
      cached = {
        spawns: room.find(FIND_MY_SPAWNS),
        extensions: room.find(FIND_MY_STRUCTURES, {
          filter: s => s.structureType === STRUCTURE_EXTENSION
        }) as StructureExtension[],
        towers: room.find(FIND_MY_STRUCTURES, {
          filter: s => s.structureType === STRUCTURE_TOWER
        }) as StructureTower[],
        containers: room.find(FIND_STRUCTURES, {
          filter: s => s.structureType === STRUCTURE_CONTAINER
        }) as StructureContainer[],
        creeps: room.find(FIND_MY_CREEPS),
        tick: Game.time
      };
      this.roomCache.set(room.name, cached);
    }

    return cached;
  }

  /**
   * Get home spawn with long-term caching (spawns rarely change)
   */
  public getHomeSpawn(roomName: string): StructureSpawn | null {
    let cached = this.spawnCache.get(roomName);

    if (!cached || Game.time - cached.tick > 100) {
      const room = Game.rooms[roomName];
      const spawns = room?.find(FIND_MY_SPAWNS);
      cached = {
        spawn: spawns?.[0] ?? null,
        tick: Game.time
      };
      this.spawnCache.set(roomName, cached);
    }

    return cached.spawn;
  }

  /**
   * Get creeps in room - uses pre-sorted data from main if available
   */
  private getCreepsInRoom(roomName: string): Creep[] {
    // Use pre-sorted data if available
    if (this.creepsByRoom) {
      return this.creepsByRoom.get(roomName) || [];
    }

    // Fallback to cached find
    return this.getRoomStructures(Game.rooms[roomName])?.creeps || [];
  }

  chanting(creep: Creep) {
    if (creep.ticksToLive !== undefined && creep.ticksToLive % 17 === 0) {
      const chant = this.getChant(creep.memory.role as roleContants);
      if (chant !== undefined) {
        creep.say(chant, true);
      }
    }
  }

  private getChant(role: roleContants): string | undefined {
    const chants = this.chants.get(role);
    if (!chants || chants.length === 0) return;
    const index = Math.floor(Math.random() * chants.length);
    return chants[index];
  }

  getEnergy(creep: Creep, memory: HaulerMemory | MaintainerMemory, energyManager: ResourceService) {
    if (!memory.target) {
      memory.target = energyManager.assignToTask(creep, "withdrawl");
    }
    if (!memory.target) {
      memory.target = energyManager.assignToTask(creep, "pickup");
      memory.take = "pickup";
    }

    const target = Game.getObjectById(memory.target!) as Resource | Structure | null;
    if (!target) {
      delete memory.target;
      return;
    }

    if (creep.pos.getRangeTo(target) === 1) {
      if (memory.take === "pickup") creep.pickup(target as Resource);
      else if (memory.take === "withdrawl") creep.withdraw(target as Structure, RESOURCE_ENERGY);

      energyManager.cleanTasks(creep);
      delete memory.target;
      return;
    }

    moveTo(creep, target, { reusePath: 50, maxOps: 10000, avoidCreeps: true });
  }

  helpAFriend(creep: Creep, memory: CreepMemory) {
    const containers = creep.room.find(FIND_STRUCTURES, {
      filter: s => s.structureType === STRUCTURE_CONTAINER && creep.pos.inRangeTo(s, 1)
    }) as StructureContainer[];

    const droppedEnergy = creep.room.find(FIND_DROPPED_RESOURCES, {
      filter: r => r.resourceType === RESOURCE_ENERGY && creep.pos.inRangeTo(r, 1)
    });

    const creeps = creep.room.find(FIND_MY_CREEPS, {
      filter: c => c.memory.role === memory.role && creep.pos.inRangeTo(c, 1)
    });

    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) > creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
      // Pick up dropped energy first (it decays, so priority)
      for (const resource of droppedEnergy) {
        if (resource.amount > 0) {
          creep.pickup(resource);
          break;
        }
      }

      // Then try containers
      for (const container of containers) {
        if (container.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
          creep.withdraw(container, RESOURCE_ENERGY);
          break;
        }
      }
    }

    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
      for (const otherCreep of creeps) {
        if (creep.name === otherCreep.name) continue;
        const otherEnergy = otherCreep.store.getUsedCapacity(RESOURCE_ENERGY);
        const otherCapacity = otherCreep.store.getCapacity();
        if (otherEnergy < otherCapacity - 20) {
          const amount = Math.floor(creep.store.getUsedCapacity(RESOURCE_ENERGY) / 2);
          creep.transfer(otherCreep, RESOURCE_ENERGY, amount);
          break;
        }
      }
    }
  }

  getAwayFromStructure(creep: Creep, structure: Structure) {
    if (structure && creep.pos.inRangeTo(structure, 1)) {
      moveTo(creep, new RoomPosition(25, 25, creep.room.name));
    }
  }

  creepPathMove(creep: Creep, target: AnyCreep | AnyStructure | Source | ConstructionSite | StructureController) {
    if (creep.pos.inRangeTo(target, 1)) {
      creep.move(creep.pos.getDirectionTo(target.pos));
      return;
    }

    if (creep.memory.pathKey) {
      const moveResult = moveByPath(creep, creep.memory.pathKey);
      if (moveResult != OK) {
        moveTo(creep, target, { reusePath: 50, avoidCreeps: true, maxOps: 20000, avoidObstacleStructures: false });
        if (Memory?.pathCacheMeta != undefined && Memory?.pathCacheMeta[creep.memory?.pathKey] != undefined) {
          delete Memory?.pathCacheMeta[creep.memory?.pathKey];
          delete creep.memory.pathKey;
        } else {
          delete creep.memory.pathKey;
        }
        moveTo(creep, target, { reusePath: 50, avoidCreeps: true, maxOps: 20000, avoidObstacleStructures: false });
      }
    } else {
      creep.memory.pathKey = this.pathCachingService.getOrCreatePath(creep.pos, target.pos);
    }
  }

  checkForFastFillerSpot(creep: Creep){
    if(creep.room.memory.containers != undefined && creep.memory.role !== roleContants.FASTFILLER){
      const fillers = creep.room.memory.containers.filter(c => c.type === roleContants.FASTFILLER)
      for(const filler of fillers){
        if(filler.fastFillerSpots != undefined && filler.fastFillerSpots.find(s => s.x === creep.pos.x && s.y === creep.pos.y)){
          creep.moveTo(creep.room.controller?? new RoomPosition(0,0, creep.room.name))
        }
      }
    }
  }

  doTransfer(creep: Creep, energyManager: ResourceService) {
    const transfer = (target: Creep | AnyStoreStructure, memory: HaulerMemory) => {
      const temp = creep.transfer(target, RESOURCE_ENERGY);
      if (temp === OK) {
        if (memory.pathKey) delete memory.pathKey;
        delete memory.target;
        energyManager.cleanTasks(creep);
        // this.getAwayFromStructure(creep, target as Structure);
      }
      return temp;
    };

    this.getInTargetRange(creep, transfer, 1);
  }

  getInTargetRange(creep: Creep, doInRange: (target: any, memory: any) => void, range: number) {
    const memory = creep.memory as BuilderMemory | HaulerMemory | MaintainerMemory | ReservMemory | ClaimerMemory;
    if (!memory || !memory.target) return;

    const target = Game.getObjectById(memory.target) as Creep | AnyStoreStructure | null;
    if (!target) {
      delete memory.target;
      delete memory.pathKey;
      return;
    }

    if (creep.pos.getRangeTo(target.pos) <= range) {
      doInRange(target, memory);
    } else {
      this.creepPathMove(creep, target);
    }
  }

  getExitToRoom(fromRoom: string, toRoom: string): RoomPosition | null {
    const exitDir = Game.map.findExit(fromRoom, toRoom);
    if (exitDir === ERR_NO_PATH) return null;
    const exit = Game.rooms[fromRoom].find(exitDir as ExitConstant);
    return exit[0] || null;
  }

  moveToRoom(creep: Creep, targetRoomName: string): void {
    const exitPos = this.getExitToRoom(creep.room.name, targetRoomName);
    if (exitPos) {
      moveTo(creep, exitPos, { maxOps: 20000, avoidCreeps: true });
    }
  }
}
