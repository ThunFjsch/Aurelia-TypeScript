import {
    BuildingObjective,
    HaulingObjective,
    InvaderCoreObjective,
    MaintenanceObjective,
    MiningObjective,
    Objective,
    ReserveObjective,
    roleContants,
    ScoutingObjective,
    UpgradeObjective
} from "objectives/objectiveInterfaces";
import { E_FOR_BUILDER, E_FOR_UPGRADER, EconomyService } from "services/economy.service";
import { Point, Priority, priority } from "utils/sharedTypes";
import { createCreepBody, generateBody, generateName, getWorkParts } from "./spawn-helper";
import { HaulerMemory } from "creeps/hauling";
import { UpgraderMemory } from "creeps/upgrading";
import { CoreKillerMemory } from "creeps/coreKiller";

interface SpawnAction {
    readonly name: string;
    readonly priority: number;
    canHandle: (objectives: Objective[], room: Room, creeps: Creep[]) => boolean;
    execute: (objectives: Objective[], room: Room, creeps: Creep[]) => any;
}

export class SpawnManager {
    private economyService: EconomyService;

    constructor(EconomyService: EconomyService) {
        this.economyService = EconomyService
    }

    // All spawn logic in one place, organized by priority
    private spawnActions: SpawnAction[] = [
        {
            name: "hauler",
            priority: priority.low,
            canHandle: (objectives: Objective[], room: Room, creeps: Creep[]) => objectives.some(obj => obj.type === roleContants.HAULING),
            execute: (objectives: Objective[], room: Room, creeps: Creep[]) => {
                const haulingObjs = objectives.filter(obj => obj.type === roleContants.HAULING) as HaulingObjective[];
                return this.spawnHauler(haulingObjs, room, objectives, creeps);
            }
        },
        {
            name: "miner",
            priority: priority.high,
            canHandle: (objectives: Objective[], room: Room, creeps: Creep[]) => objectives.some(obj => obj.type === roleContants.MINING),
            execute: (objectives: Objective[], room: Room, creeps: Creep[]) => {
                const miningObjs = objectives.filter(obj => obj.type === roleContants.MINING && obj.home === room.name) as MiningObjective[];
                return this.spawnMiner(miningObjs, room);
            }
        },
        {
            name: "scout",
            priority: priority.severe,
            canHandle: (objectives: Objective[], room: Room, creeps: Creep[]) => objectives.some(obj => obj.type === roleContants.SCOUTING),
            execute: (objectives: Objective[], room: Room, creeps: Creep[]) => {
                const scoutObj = objectives.find(obj => obj.type === roleContants.SCOUTING) as ScoutingObjective;
                return this.spawnScout(scoutObj, room, creeps);
            }
        },
        {
            name: "porter",
            priority: priority.medium,
            canHandle: (objectives: Objective[], room: Room, creeps: Creep[]) => true, // Porter has its own internal logic
            execute: (objectives: Objective[], room: Room, creeps: Creep[]) => {
                return this.spawnPorter(room, creeps);
            }
        },
        {
            name: "fastFiller",
            priority: priority.low,
            canHandle: (objectives: Objective[], room: Room, creeps: Creep[]) => true, // FastFiller has its own internal logic
            execute: (objectives: Objective[], room: Room, creeps: Creep[]) => {
                return this.spawnFastFiller(room, creeps);
            }
        },
        {
            name: "reserver",
            priority: priority.medium,
            canHandle: (objectives: Objective[], room: Room, creeps: Creep[]) => objectives.some(obj => obj.type === roleContants.RESERVING),
            execute: (objectives: Objective[], room: Room, creeps: Creep[]) => {
                const reserveObj = objectives.find(obj => obj.type === roleContants.RESERVING) as ReserveObjective;
                return this.spawnReserver(reserveObj, room, creeps);
            }
        },
        {
            name: roleContants.CORE_KILLER,
            priority: priority.severe,
            canHandle: (objectives: Objective[], room: Room, creeps: Creep[]) => objectives.some(obj => obj.type === roleContants.CORE_KILLER),
            execute: (objectives: Objective[], room: Room, creeps: Creep[]) => {
                const coreKillObj = objectives.filter(obj => obj.type === roleContants.CORE_KILLER && obj.home === room.name) as InvaderCoreObjective[];
                return this.spawnCoreKiller(coreKillObj, room, creeps);
            }
        },
        {
            name: "builder",
            priority: priority.low,
            canHandle: (objectives: Objective[], room: Room, creeps: Creep[]) => objectives.some(obj => obj.type === roleContants.BUILDING),
            execute: (objectives: Objective[], room: Room, creeps: Creep[]) => {
                const buildingObjs = objectives.filter(obj => obj.type === roleContants.BUILDING) as BuildingObjective[];
                return this.spawnBuilder(buildingObjs, room, objectives);
            }
        },
        {
            name: "maintainer",
            priority: priority.medium,
            canHandle: (objectives: Objective[], room: Room, creeps: Creep[]) => objectives.some(obj => obj.type === roleContants.MAINTAINING),
            execute: (objectives: Objective[], room: Room, creeps: Creep[]) => {
                const maintenanceObjs = objectives.filter(obj => obj.type === roleContants.MAINTAINING) as MaintenanceObjective[];
                return this.spawnMaintainer(maintenanceObjs, room, creeps);
            }
        },
        {
            name: "upgrader",
            priority: priority.veryLow,
            canHandle: (objectives: Objective[], room: Room, creeps: Creep[]) => objectives.some(obj => obj.type === roleContants.UPGRADING),
            execute: (objectives: Objective[], room: Room, creeps: Creep[]) => {
                const upgradeObjs = objectives.filter(obj => obj.type === roleContants.UPGRADING) as UpgradeObjective[];
                return this.spawnUpgrader(objectives, upgradeObjs, room);
            }
        }
    ].sort((a, b) => b.priority - a.priority);

    run(objectives: Objective[], room: Room, creeps: Creep[]) {
        // Group objectives by priority
        const objectivesByPriority = this.groupObjectivesByPriority(objectives);

        // Process each priority level
        for (let currentPrio = priority.severe; currentPrio <= priority.veryLow; currentPrio++) {
            const currentObjectives = objectivesByPriority.get(currentPrio) || [];

            if (currentObjectives.length === 0) continue;

            // Try each spawn action for this priority level
            for (const action of this.spawnActions) {
                if (action.canHandle(currentObjectives, room, creeps)) {
                    const result = action.execute(objectives.filter(o => o.home === room.name), room, creeps);
                    if (result !== undefined && creeps.filter(c => c.memory.role === roleContants.HAULING && c.memory.home === room.name).length > 3) {
                        return; // Successfully spawned something, exit
                    }
                }
            }
        }
    }

    // === SPAWN LOGIC METHODS ===
    // All the actual spawning logic is now contained within this class

    private spawnHauler(objectives: HaulingObjective[], room: Room, allObjectives: Objective[], creeps: Creep[]) {
        if(creeps.find(c => c.memory.role === roleContants.MINING) === undefined) return;
        let retValue = undefined
        objectives.forEach(objective => {
            let currCarry = 0;
            for (const index in Game.creeps) {
                const creep = Game.creeps[index]
                const memory = Memory.creeps[creep.name]
                if (memory.role === roleContants.HAULING && memory.home === objective.home) currCarry += getWorkParts([creep], CARRY);
            }
            if (currCarry < objective.maxHaulerParts) {
                const body = createCreepBody(objective, room, currCarry, objective.maxHaulerParts)
                const memory: CreepMemory = {
                    home: room.name,
                    role: roleContants.HAULING,
                    working: false
                }
                const spawn = room.find(FIND_MY_SPAWNS)[0];
                if (spawn.spawning === null) {
                    retValue = spawn.spawnCreep(body, generateName(roleContants.HAULING), { memory })
                } else {
                    retValue = undefined;
                }
            }
        })
        return retValue
    }

    private spawnMiner(objectives: MiningObjective[], room: Room) {
        let returnValue = undefined;
        objectives.filter(o => o != undefined).sort((a, b) => b.distance - a.distance)
            .forEach(objective => {
                let assignedCreeps: Creep[] = [];
                for (const index in Game.creeps) {
                    const creep = Game.creeps[index]
                    const memory = Memory.creeps[creep.name] as MinerMemory
                    if (memory.role === objective.type && memory.sourceId === objective.sourceId) assignedCreeps.push(creep);
                }

                let currWorkParts = 0;
                if (assignedCreeps.length > 0) {
                    currWorkParts = getWorkParts(assignedCreeps, WORK);
                }

                let coord: Point | undefined = undefined
                room.memory.containers.forEach(container => {
                    if (container.source === objective.sourceId && container.fastFillerSpots != undefined) {
                        coord = container.fastFillerSpots[0]
                    }
                })
                if (coord != undefined && objective.spots > 1) {
                    objective.spots = 1
                }

                if (objective.maxWorkParts > currWorkParts && objective.spots > assignedCreeps.length) {
                    const body = createCreepBody(objective, room, currWorkParts, objective.maxWorkParts)
                    if (objective.path === undefined) return;
                    const memory: MinerMemory = {
                        home: room.name,
                        role: roleContants.MINING,
                        sourceId: objective.sourceId,
                        route: objective.path,
                        working: false,
                        containerPos: coord,
                        targetRoom: objective.target
                    }
                    returnValue = room.find(FIND_MY_SPAWNS)[0].spawnCreep(body, generateName(roleContants.MINING), { memory })
                }
            })
        return returnValue;
    }

    private spawnScout(objective: ScoutingObjective, room: Room, creeps: Creep[]) {
        if (creeps.filter(c => c.memory.role === roleContants.HAULING && c.memory.home === room.name).length === 0) return
        let returnValue = undefined;
        if (room.memory.scoutPlan === undefined) return;
        const scout = creeps.find(creep => creep.memory.role === roleContants.SCOUTING && creep.memory.home === room.name);
        if (scout != undefined) return;
        let totalTime = 0;
        let numberOfRooms = 0
        objective.toScout.forEach(room => {
            if ((room.lastVisit ?? 0) === 0) {
                totalTime += 0
            } else {
                totalTime += Game.time - (room.lastVisit ?? 0)
            }
            numberOfRooms++;
        })
        const avg = totalTime / numberOfRooms;
        if (avg < 10000) {
            const body = [MOVE];
            const memory: ScoutMemory = {
                home: room.name,
                role: roleContants.SCOUTING,
                currIndex: 0,
                route: objective.toScout,
            }
            const spawn = room.find(FIND_MY_SPAWNS)[0]
            if (!spawn.spawning) {
                returnValue = spawn.spawnCreep(body, generateName(roleContants.SCOUTING), { memory })
                console.log(returnValue)
            }
        }
        return returnValue;
    }

    private spawnPorter(room: Room, creeps: Creep[]) {
        if (room.storage === undefined) return
        let returnValue = undefined
        const rcl = room.controller?.level ?? 0;
        const storage = room.find(FIND_MY_STRUCTURES).filter(struc => struc.structureType === STRUCTURE_STORAGE)[0];
        const porter = creeps.filter(creep => creep.memory.role === roleContants.PORTING);
        let workParts = 0;
        if (porter.length > 0) {
            workParts = getWorkParts(porter, CARRY);
        }
        // TODO: Better way to determine the amount of Workparts
        const requiredWorkParts = 30;
        let creepAmount = rcl;
        if(rcl < 4){
            creepAmount = creepAmount/2
        }
        if (rcl >= 4 && storage != undefined && workParts < requiredWorkParts && porter.length < 5) {
            const neededParts = (requiredWorkParts - workParts);
            const body = generateBody([CARRY, CARRY, MOVE],
                BODYPART_COST[CARRY] + BODYPART_COST[CARRY] + BODYPART_COST[MOVE],
                room.energyAvailable, neededParts, 2);
            const memory: HaulerMemory = {
                home: room.name,
                role: roleContants.PORTING,
                take: "withdrawl",
            }
            const spawn = room.find(FIND_MY_SPAWNS)[0]
            if (!spawn.spawning) {
                returnValue = spawn.spawnCreep(body, generateName(roleContants.PORTING), { memory })
            }
        }
        return returnValue;
    }

    private spawnFastFiller(room: Room, creeps: Creep[]) {
        let retValue = undefined;
        if (creeps.filter(c => c.memory.role === roleContants.HAULING && c.memory.home === room.name).length < 3) return
        room.memory.containers.forEach(container => {
            if (container.type === roleContants.FASTFILLER && container.fastFillerSpots != undefined) {
                for (let spot of container.fastFillerSpots) {
                    if (!creeps.find(creep => creep.memory.role === roleContants.FASTFILLER && (creep.memory as FastFillerMemory).pos.x === spot.x && (creep.memory as FastFillerMemory).pos.y === spot.y)) {
                        const spawn = room.find(FIND_MY_SPAWNS)[0]
                        let direction = undefined
                        let body = [CARRY, CARRY, CARRY, MOVE];
                        if(spawn.pos.inRangeTo(spot.x, spot.y, 1)){
                            direction = [spawn.pos.getDirectionTo(spot.x, spot.y) as DirectionConstant];
                            body = [CARRY, CARRY, CARRY]
                        }
                        const memory: FastFillerMemory = {
                            home: room.name,
                            role: roleContants.FASTFILLER,
                            working: false,
                            pos: spot,
                            supply: container.id
                        }
                        if (!spawn.spawning) {
                            retValue = spawn.spawnCreep(body, generateName(roleContants.FASTFILLER), { memory, directions: direction})
                        }
                    }
                }
            }
        })
        return retValue
    }

    private spawnReserver(objective: ReserveObjective, room: Room, creeps: Creep[]) {
        for (let reserv of objective.toReserve) {
            const hasReserv = creeps.find(creep => creep.memory.role === roleContants.RESERVING &&
                creep.memory.home === room.name &&
                (creep.memory as ReservMemory).target === reserv);
            if (hasReserv != undefined) continue;
            const mem: ReservMemory = {
                home: room.name,
                role: roleContants.RESERVING,
                target: reserv
            }
            if (room.energyAvailable < 650) return undefined;
            let body = [CLAIM, MOVE];
            if (room.storage && room.energyAvailable >= 1250) {
                body = [CLAIM, CLAIM, MOVE]
            }
            return room.find(FIND_MY_SPAWNS)[0].spawnCreep(
                body,
                `${roleContants.RESERVING} ${reserv}`,
                { memory: mem }
            )
        }
        return undefined
    }

    private spawnBuilder(objectives: BuildingObjective[], room: Room, allObjectives: Objective[]) {
        let retValue = undefined;
        objectives.forEach(objective => {
            let currWork = 0;
            for (const index in Game.creeps) {
                const creep = Game.creeps[index]
                const memory = Memory.creeps[creep.name]
                if (memory.role === roleContants.BUILDING && memory.home === objective.home) currWork += getWorkParts([creep], WORK);
            }
            const currNeed = this.economyService.getCurrentRoomIncome(room, allObjectives) / E_FOR_BUILDER;
            if (currWork < currNeed) {
                const body = createCreepBody(objective, room, currWork, currNeed);
                const memory: BuilderMemory = {
                    home: room.name,
                    role: roleContants.BUILDING,
                    working: false,
                    target: objective.targetId,
                    route: objective.path ?? [],
                    done: false
                }
                const spawn = room.find(FIND_MY_SPAWNS)[0]
                if (!spawn.spawning) {
                    retValue = spawn.spawnCreep(body, generateName(roleContants.BUILDING), { memory })
                }
            }
        })
        return retValue
    }

    private spawnMaintainer(objectives: MaintenanceObjective[], room: Room, creeps: Creep[]) {
        let retValue = undefined;
        const objective = objectives.find(objective => objective.home === room.name)
        if (objective != undefined) {
            const assignedCreeps = creeps.filter(creep => creep.memory.role === roleContants.MAINTAINING && creep.memory.home === room.name)
            const workParts = getWorkParts(assignedCreeps, WORK);
            if (workParts < objective.maxWorkParts) {
                const spawn = room.find(FIND_MY_SPAWNS)[0];
                const body = createCreepBody(objective, room, workParts, objective.maxWorkParts)
                const memory: MaintainerMemory = {
                    home: room.name,
                    role: roleContants.MAINTAINING,
                    target: objective.toRepair[0],
                    working: false,
                    repairTarget: undefined,
                    take: "pickup"
                }
                retValue = spawn.spawnCreep(body, generateName(roleContants.MAINTAINING), { memory });
            }
        }

        return retValue;
    }

    private spawnUpgrader(allObjectives: Objective[], objectives: UpgradeObjective[], room: Room) {
        if(room.memory.constructionOffice.finished === false) return
        let maxIncome = 0;
        allObjectives.forEach(objective => maxIncome += objective.maxIncome)
        let retValue = undefined
        objectives.forEach(objective => {
            let currWork = 0;
            for (const index in Game.creeps) {
                const creep = Game.creeps[index]
                const memory = Memory.creeps[creep.name]
                if (memory.role === roleContants.UPGRADING && memory.home === objective.home) currWork += getWorkParts([creep], WORK);
            }
            const income = this.economyService.getCurrentRoomIncome(room, allObjectives);
            const currNeed = income / E_FOR_UPGRADER;
            if (currWork < currNeed && income > (maxIncome / 3)) {
                const body = createCreepBody(objective, room, currWork, currNeed)
                const memory: UpgraderMemory = {
                    home: room.name,
                    role: roleContants.UPGRADING,
                    working: false,
                    controllerId: objective.controllerId,
                    spawnedRcl: room.controller?.level??1
                }
                const name = generateName(roleContants.UPGRADING);
                retValue = room.find(FIND_MY_SPAWNS)[0].spawnCreep(body, name, { memory })
            }
        })
        return retValue
    }

    private spawnCoreKiller(objectives: InvaderCoreObjective[], room: Room, creeps: Creep[]) {
        let retValue = undefined;
        objectives.forEach(o => {
            if (!creeps.find(c => c.memory.role === roleContants.CORE_KILLER && (c.memory as CoreKillerMemory).target === o.id)) {
                const cost = (o.attackParts * BODYPART_COST[ATTACK]) + (o.attackParts * BODYPART_COST[MOVE]);
                if (cost < room.energyAvailable) {
                    const body = generateBody([ATTACK, MOVE], 150, room.energyAvailable, o.attackParts)
                    const memory: CoreKillerMemory = {
                        home: room.name,
                        role: roleContants.CORE_KILLER,
                        target: o.id
                    }
                    const name = generateName(roleContants.CORE_KILLER);
                    retValue = room.find(FIND_MY_SPAWNS)[0].spawnCreep(body, name, { memory })
                }
            }
        })
        return retValue;
    }

    // Helper methods
    private groupObjectivesByPriority(objectives: Objective[]): Map<Priority, Objective[]> {
        const grouped = new Map<Priority, Objective[]>();

        for (const objective of objectives) {
            if (!objective) continue;

            if (!grouped.has(objective.priority as Priority)) {
                grouped.set(objective.priority as Priority, []);
            }
            grouped.get(objective.priority as Priority)!.push(objective);
        }

        return grouped;
    }
}
