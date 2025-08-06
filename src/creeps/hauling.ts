import { roleContants } from "objectives/objectiveInterfaces";

interface HaulerMemory extends CreepMemory {
    target?: any
}

export class Hauling {
    run(creep: Creep) {
        let memory = creep.memory as HaulerMemory
        if (creep.store.energy < (creep.store.getCapacity() / 2)) {
            if (memory.target === undefined) {
                memory.target = creep.room.find(FIND_DROPPED_RESOURCES).filter(res => res.resourceType === RESOURCE_ENERGY)[0];
                creep.memory = memory
            }
            const target = Game.getObjectById(memory.target.id) as Resource;
            if (target === null) { delete memory.target; creep.memory = memory }
            if (creep.pos.getRangeTo(target.pos.x, target.pos.y) <= 1) {
                creep.pickup(target);
                delete memory.target;
                creep.memory = memory;
                return
            }
            if (memory.target != undefined) {
                creep.moveTo(target.pos.x, target.pos.y)
            }
        } else {
            if (memory.target === undefined) {
                const structure = creep.room.find(FIND_MY_STRUCTURES).filter(struc => (struc.structureType === STRUCTURE_SPAWN || struc.structureType === STRUCTURE_EXTENSION) && struc.store.energy < struc.store.getCapacity(RESOURCE_ENERGY))

                if (structure.length > 0) {
                    memory.target = structure[0];
                    creep.memory = memory;
                } else {
                    const upgrader = creep.room.find(FIND_MY_CREEPS).filter(creep => creep.memory.role === roleContants.UPGRADING && creep.store.energy < (2 / creep.store.getCapacity(RESOURCE_ENERGY)))
                    if (upgrader.length > 0) {
                        memory.target = upgrader[0];
                        creep.memory = memory;
                    }
                }
            } else {
                const target = Game.getObjectById(memory.target.id) as StructureSpawn | Creep;
                if (target === null) {
                    delete memory.target;
                    creep.memory = memory
                    return
                }

                if (target.store.energy >= target.store.getCapacity(RESOURCE_ENERGY)) {
                    delete memory.target;
                    creep.memory = memory;
                    return;
                }

                if (creep.pos.getRangeTo(target.pos.x, target.pos.y) <= 1) {
                    creep.transfer(target, RESOURCE_ENERGY);
                    delete memory.target;
                    creep.memory = memory;
                }

                creep.moveTo(target.pos.x, target.pos.y)
            }
        }
    }
}
