import { ResourceService } from "services/resource.service";
import { HaulerMemory } from "./hauling";

export function getEnergy(creep: Creep, memory: HaulerMemory | MaintainerMemory, energyManager: ResourceService) {
    if (memory.target === undefined) {
        memory.target = energyManager.assignToTask(creep, 'pickup')
        memory.take = "pickup"
    }
    if (memory.target === undefined) {
        memory.target = energyManager.assignToTask(creep, 'withdrawl')
        memory.take = "withdrawl"
    } else {
        creep.memory = memory
    }
    const target = Game.getObjectById(memory.target) as Resource | Structure;
    if (target === null || target === undefined) {
        delete memory.target;
        creep.memory = memory;
        return
    } else {
        if (creep.pos.getRangeTo(target.pos.x, target.pos.y) <= 1) {
            if (memory.take === "pickup") creep.pickup(target as Resource);
            if (memory.take === "withdrawl") creep.withdraw(target as Structure, RESOURCE_ENERGY)
            energyManager.removeFromTask(creep, target)
            delete memory.target;
            creep.memory = memory;
            return
        } else {
            creep.moveTo(target.pos.x, target.pos.y)
        }
    }
}

// If low on e, takes e out of a container. And if I have enough I share with the creeps around me.
export function helpAFriend(creep: Creep, memory: CreepMemory) {
    if (creep.store.getCapacity() > creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
        const containers = creep.room.find(FIND_STRUCTURES).filter(structure => structure.structureType === STRUCTURE_CONTAINER)
        for (let container of containers as StructureContainer[]) {
            if (creep.pos.inRangeTo(container.pos.x, container.pos.y, 1) && container.store.getUsedCapacity(RESOURCE_ENERGY) <= container.store.getCapacity()) {
                creep.withdraw(container, RESOURCE_ENERGY)
                break;
            }
        }
    }
    if (creep.store.getCapacity(RESOURCE_ENERGY) > 0) {
        const creeps = creep.room.find(FIND_CREEPS).filter(creep => creep.memory.role === memory.role)
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
