import { ResourceService } from "services/resource.service";
import { HaulerMemory } from "./hauling";
import { moveByPath, moveTo } from "screeps-cartographer";
import { PathCachingService } from "services/pathCaching.service";
import { roleContants } from "objectives/objectiveInterfaces";

export default class BasicCreep {
    private chants = new Map<roleContants, string[]>;
    pathCachingService: PathCachingService;

    constructor(pathCaching: PathCachingService) {
        this.chants.set(roleContants.HAULING, ['🚛 📡', '⛐', '📦📍✅']);
        this.chants.set(roleContants.MINING, ['⛏️', '⛰️💥']);
        this.chants.set(roleContants.BUILDING, ['🏢🏗️', '📏🏗🧱', '🚧🏗️']);
        this.chants.set(roleContants.PORTING, ['🚜', '🚢', '🌉']);
        this.chants.set(roleContants.RESERVING, ['👾', 'ε(´｡•᎑•`)っ 💕', '♨️']);
        this.chants.set(roleContants.UPGRADING, ['⚡🕹️', '📈⬆', '𝓤𝓹𝓰𝓻𝓪𝓭𝓮']);
        this.chants.set(roleContants.FASTFILLER, ['🏎️🍔', '🍕〽', '🍽️']);
        this.chants.set(roleContants.SCOUTING, ['🕵️‍♂️', '⛺', '🌲🔎🌲']);

        this.pathCachingService = pathCaching;
    }

    chanting(creep: Creep) {
        if (creep.ticksToLive != undefined && creep.ticksToLive % 17 === 0) {
            this.chant(creep);
        }
    }

    chant(creep: Creep) {
        const chant = this.getChant(creep.memory.role as roleContants)
        switch (creep.memory.role) {
            case (roleContants.HAULING):
                if (chant === undefined) return;
                creep.say(chant, true);
                break;
            case (roleContants.MINING):
                if (chant === undefined) return;
                creep.say(chant, true);
                break;
            case (roleContants.BUILDING):
                if (chant === undefined) return;
                creep.say(chant, true);
                break;
            case (roleContants.PORTING):
                if (chant === undefined) return;
                creep.say(chant, true);
                break;
            case (roleContants.RESERVING):
                if (chant === undefined) return;
                creep.say(chant, true);
                break;
            case (roleContants.UPGRADING):
                if (chant === undefined) return;
                creep.say(chant, true);
                break;
            case (roleContants.FASTFILLER):
                if (chant === undefined) return;
                creep.say(chant, true);
                break;
            case (roleContants.SCOUTING):
                if (chant === undefined) return;
                creep.say(chant, true);
                break;
        }
    }

    private getChant(role: roleContants) {
        const chant = this.chants.get(role);
        if (chant != undefined) {
            const selection = Math.random() * ((chant.length + 1) - 1) - 1;
            return chant[parseInt(selection.toString())]
        }
        return
    }


    getEnergy(creep: Creep, memory: HaulerMemory | MaintainerMemory, energyManager: ResourceService) {
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
    private helpCache = new Map<string, {
        containers: StructureContainer[];
        creeps: Creep[];
        tick: number;
    }>();

    // If low on e, takes e out of a container. And if I have enough I share with the creeps around me.
    helpAFriend(creep: Creep, memory: CreepMemory) {
        const roomName = creep.room.name;
        let cached = this.helpCache.get(roomName);

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
            this.helpCache.set(roomName, cached);
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

    getAwayFromStructure(creep: Creep, struc: Structure) {
        if (struc === undefined) return
        if (creep.pos.inRangeTo(struc.pos.x, struc.pos.y, 1)) {
            moveTo(creep, new RoomPosition(25, 25, creep.room.name))
        }
    }

    creepPathMove(creep: Creep, target: AnyCreep | AnyStructure | Source | ConstructionSite | StructureController) {
        if (creep.pos.inRangeTo(target.pos.x, target.pos.y, 1)) {
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
            creep.memory.pathKey = this.pathCachingService.getOrCreatePath(creep.pos, target.pos)
        }
    }

    doTransfer(creep: Creep, energyManager: ResourceService) {
        const transfer = (target: Creep | AnyStoreStructure, memory: HaulerMemory) => {
            // At target - do transfer
            creep.transfer(target, RESOURCE_ENERGY);
            energyManager.cleanTasks(creep);
            this.getAwayFromStructure(creep, target as Structure);

            // Clean up memory
            if (memory.pathKey) delete memory.pathKey;
            delete memory.target;
            creep.memory = memory;
        }
        this.getInTargetRange(creep, transfer,
            1
        )
    }

    getInTargetRange(creep: Creep, doInRange: Function, range: number) {
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
            memory.pathKey = this.pathCachingService.getOrCreatePath(creep.pos, target.pos);
        }

        if (creep.pos.getRangeTo(target.pos.x, target.pos.y) <= range) {
            doInRange(target, memory)
        } else {
            // Move using cached path
            this.creepPathMove(creep, target)
        }
    }
}
