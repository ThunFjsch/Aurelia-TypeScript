import { ResourceService } from "services/resource.service";
import { HaulerMemory } from "./hauling";
import { moveByPath, moveTo } from "screeps-cartographer";
import { PathCachingService } from "services/pathCaching.service";
import { roleContants } from "objectives/objectiveInterfaces";
import { memoize } from "lodash";

export default class BasicCreep {
    private chants = new Map<roleContants, string[]>();
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
            memory.target = energyManager.assignToTask(creep, 'withdrawl');
            memory.take = 'withdrawl';
        }
        if (!memory.target) {
            memory.target = energyManager.assignToTask(creep, 'pickup');
            memory.take = 'pickup';
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

    private helpCache = new Map<string, {
        containers: StructureContainer[];
        creeps: Creep[];
        tick: number;
    }>();

    helpAFriend(creep: Creep, memory: CreepMemory) {
        const roomName = creep.room.name;
        let cached = this.helpCache.get(roomName);

        if (!cached || Game.time - cached.tick > 15) {
            const containers = creep.room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_CONTAINER &&
                    creep.pos.inRangeTo(s, 1)
            }) as StructureContainer[];

            const creeps = creep.room.find(FIND_MY_CREEPS, {
                filter: c => c.memory.role === memory.role && creep.pos.inRangeTo(c, 1)
            });

            cached = { containers, creeps, tick: Game.time };
            this.helpCache.set(roomName, cached);
        }

        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) > creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
            for (const container of cached.containers) {
                if (container.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                    creep.withdraw(container, RESOURCE_ENERGY);
                    break;
                }
            }
        }

        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            for (const otherCreep of cached.creeps) {
                if (creep.name === otherCreep.name) continue;

                const otherEnergy = otherCreep.store.getUsedCapacity(RESOURCE_ENERGY);
                const otherCapacity = otherCreep.store.getCapacity();

                if (otherEnergy < (otherCapacity - 20)) {
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
                moveTo(creep, target, { reusePath: 50, avoidCreeps: true, maxOps: 10000, avoidObstacleStructures: false})
                if (Memory?.pathCacheMeta != undefined && Memory?.pathCacheMeta[creep.memory?.pathKey] != undefined){
                    delete Memory?.pathCacheMeta[creep.memory?.pathKey]
                    delete creep.memory.pathKey;
                } else{
                    delete creep.memory.pathKey;
                }
                moveTo(creep, target, { reusePath: 50, avoidCreeps: true, maxOps: 10000, avoidObstacleStructures: false});
            }
        } else {
            creep.memory.pathKey = this.pathCachingService.getOrCreatePath(creep.pos, target.pos);
        }
    }

    doTransfer(creep: Creep, energyManager: ResourceService) {
        const transfer = (target: Creep | AnyStoreStructure, memory: HaulerMemory) => {
            creep.transfer(target, RESOURCE_ENERGY);
            energyManager.cleanTasks(creep);
            this.getAwayFromStructure(creep, target as Structure);

            if (memory.pathKey) delete memory.pathKey;
            delete memory.target;
        };
        if(transfer === undefined || transfer === null){
            this.getInTargetRange(creep, Game.rooms[creep.memory.home].find(FIND_MY_SPAWNS)[0] as any, 5);
        } else{

            this.getInTargetRange(creep, transfer, 1);
        }
    }

    getInTargetRange(
        creep: Creep,
        doInRange: (target: any, memory: any) => void,
        range: number
    ) {
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
        const route = Game.map.findRoute(fromRoom, toRoom);
        if (route === ERR_NO_PATH || route.length === 0) return null;

        const firstStep = route[0];
        const exitDir = firstStep.exit;

        // Get exit positions in current room
        const exits = Game.rooms[fromRoom]?.find(exitDir);
        if (!exits || exits.length === 0) return null;

        // Return middle exit or a random one
        return exits[Math.floor(exits.length / 2)];
    }
}
