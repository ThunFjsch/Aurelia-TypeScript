import { ResourceService } from "services/resource.service";
import { HaulerMemory } from "./hauling";
import { moveByPath, moveTo } from "screeps-cartographer";
import { PathCachingService } from "services/pathCaching.service";

export function getEnergy(creep: Creep, memory: HaulerMemory | MaintainerMemory, energyManager: ResourceService) {
    if (memory.target === undefined) {
        memory.target = energyManager.assignToTask(creep, 'withdrawl')
        memory.take = "withdrawl"
    }
    if (memory.target === undefined) {
        memory.target = energyManager.assignToTask(creep, 'pickup')
        memory.take = "pickup"
    }

    const target = Game.getObjectById(memory.target) as Resource | Structure;
    if (target === null || target === undefined) {
        delete memory.target;
        creep.memory = memory;
        return
    } else {
        if (creep.pos.getRangeTo(target.pos.x, target.pos.y) === 1) {
            if (memory.take === "pickup") creep.pickup(target as Resource);
            if (memory.take === "withdrawl") creep.withdraw(target as Structure, RESOURCE_ENERGY)
            energyManager.cleanTasks(creep)
            delete memory.target;
            creep.memory = memory;
            return
        } else {
            moveTo(creep, target, { reusePath: 50, maxOps: 10000, avoidCreeps: true })
        }
    }
}

// Cache per room, update every 5 ticks
const helpCache = new Map<string, {
    containers: StructureContainer[];
    creeps: Creep[];
    tick: number;
}>();

// If low on e, takes e out of a container. And if I have enough I share with the creeps around me.
export function helpAFriend(creep: Creep, memory: CreepMemory) {
    const roomName = creep.room.name;
    let cached = helpCache.get(roomName);

    if (!cached || Game.time - cached.tick > 5) {
        // Only find containers near creep positions (within range 3)
        const containers = creep.room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER &&
                    creep.pos.inRangeTo(s, 1)
        }) as StructureContainer[];

        cached = {
            containers,
            creeps: creep.room.find(FIND_MY_CREEPS, {
                filter: c => c.memory.role === memory.role &&
                           creep.pos.inRangeTo(c, 1)
            }),
            tick: Game.time
        };
        helpCache.set(roomName, cached);
    }

    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) > creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
        const containers = cached.containers
        for (let container of containers as StructureContainer[]) {
            if (creep.pos.inRangeTo(container.pos.x, container.pos.y, 1) && container.store.getUsedCapacity(RESOURCE_ENERGY) != 0) {
                creep.withdraw(container, RESOURCE_ENERGY)
                break;
            }
        }
    }
    if (creep.store.getCapacity(RESOURCE_ENERGY) > 0) {
        const creeps = cached.creeps
        for (let upgrader of creeps) {
            if (creep.name === upgrader.name) continue;
            if (creep.pos.inRangeTo(upgrader.pos.x, upgrader.pos.y, 1) && upgrader.store.getUsedCapacity(RESOURCE_ENERGY) < (upgrader.store.getCapacity() - 20)
                && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {

                creep.transfer(upgrader, RESOURCE_ENERGY, (creep.store.getUsedCapacity(RESOURCE_ENERGY) / 2));
                break;
            }
        }
    }
}

export function getAwayFromStructure(creep: Creep, struc: Structure) {
    if (struc === undefined) return
    if (creep.pos.inRangeTo(struc.pos.x, struc.pos.y, 1)) {
        moveTo(creep, new RoomPosition(25, 25, creep.room.name))
    }
}

export function creepPathMove(creep: Creep, target: AnyCreep | AnyStructure | Source | ConstructionSite, pathCaching: PathCachingService) {
    if(creep.pos.inRangeTo(target.pos.x, target.pos.y, 2)){
        creep.move(creep.pos.getDirectionTo(target.pos.x, target.pos.y));
        return
    }

    // Move using cached path
    if (creep.memory.pathKey) {
        const moveResult = moveByPath(creep, creep.memory.pathKey);
        // console.log(`Move result for ${creep.name}: ${moveResult}`);

        // If path is blocked or invalid, fallback to moveTo
        if (moveResult === -2 || moveResult === ERR_INVALID_ARGS) {
            // console.log(`Path ${creep.memory.pathKey} failed, using moveTo fallback`);
            delete creep.memory.pathKey; // Remove invalid path key
            moveTo(creep, target, { reusePath: 50, avoidCreeps: true, maxOps: 2000 });
        }
    } else {
        creep.memory.pathKey = pathCaching.getOrCreatePath(creep.pos, target.pos)
    }
}

export function doTransfer(creep: Creep, energyManager: ResourceService, pathCaching: PathCachingService) {
    const transfer = (target: Creep | AnyStoreStructure, memory: HaulerMemory) => {
        // At target - do transfer
        creep.transfer(target, RESOURCE_ENERGY);
        energyManager.cleanTasks(creep);
        getAwayFromStructure(creep, target as Structure);

        // Clean up memory
        if (memory.pathKey) delete memory.pathKey;
        delete memory.target;
        creep.memory = memory;
    }
    getInTargetRange(creep, transfer,
        pathCaching,
        1
    )
}

export function getInTargetRange(creep: Creep, doInRange: Function, pathCaching: PathCachingService, range: number) {
    const memory = creep.memory as BuilderMemory | HaulerMemory | MaintainerMemory | ReservMemory | ClaimerMemory
    if (memory === undefined || memory.target === undefined) return;
    const target = Game.getObjectById(memory.target) as Creep | AnyStructure;

    if (target === null) {
        delete memory.target;
        delete memory.pathKey;
        creep.memory = memory;
        return;
    }

    // Generate or get cached path
    if (memory.pathKey === undefined) {
        memory.pathKey = pathCaching.getOrCreatePath(creep.pos, target.pos);
    }

    if (creep.pos.getRangeTo(target.pos.x, target.pos.y) <= range) {
        doInRange(target, memory)
    } else {
        // Move using cached path
        creepPathMove(creep, target, pathCaching)
    }
}
