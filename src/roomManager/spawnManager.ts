import {
    BuildingObjective, ExpansionObjective, HaulingObjective,
    InvaderCoreObjective, InvaderDefenceObjective, MaintenanceObjective,
    MiningObjective, Objective, ReserveObjective, roleContants,
    ScoutingObjective, UpgradeObjective,
    WallRepairObjective
} from "objectives/objectiveInterfaces";
import { E_FOR_BUILDER, E_FOR_UPGRADER, EconomyService } from "services/economy.service";
import { Point, Priority, priority } from "utils/sharedTypes";
import { createCreepBody, generateBody, generateName, getWorkParts } from "./spawn-helper";
import { HaulerMemory } from "creeps/hauling";
import { UpgraderMemory } from "creeps/upgrading";
import { CoreKillerMemory } from "creeps/coreKiller";
import { inflate } from "zlib";

interface SpawnAction {
    readonly role: roleContants;
    readonly priority: number;
    canHandle: (objectives: Objective[], room: Room, context: SpawnContext) => boolean;
    execute: (objectives: Objective[], room: Room, context: SpawnContext) => any;
}

interface SpawnContext {
    spawn: StructureSpawn;
    creeps: Creep[];
    creepsByRole: { [role: string]: Creep[] };
    creepsByHomeAndRole: { [key: string]: Creep[] };
    containers: any[]; // Cache room.memory.containers
}

export class SpawnManager {
    private economyService: EconomyService;

    constructor(EconomyService: EconomyService) {
        this.economyService = EconomyService;
    }

    // Pre-sorted spawn actions
    private spawnActions: SpawnAction[] = [
        {
            role: roleContants.SCOUTING,
            priority: priority.severe,
            canHandle: (objectives: Objective[], room: Room, ctx: SpawnContext) =>
                objectives.some(obj => obj.type === roleContants.SCOUTING && obj.home === room.name),
            execute: (objectives: Objective[], room: Room, ctx: SpawnContext) => {
                const scoutObj = objectives.find(obj => obj.type === roleContants.SCOUTING && obj.home === room.name) as ScoutingObjective;
                return this.spawnScout(scoutObj, room, ctx);
            }
        },
        {
            role: roleContants.RESERVING,
            priority: priority.severe,
            canHandle: (objectives: Objective[], room: Room, ctx: SpawnContext) =>
                objectives.some(obj => obj.type === roleContants.RESERVING && obj.home === room.name),
            execute: (objectives: Objective[], room: Room, ctx: SpawnContext) => {
                const reserveObj = objectives.find(obj => obj.type === roleContants.RESERVING && obj.home === room.name) as ReserveObjective;
                return this.spawnReserver(reserveObj, room, ctx);
            }
        },
        {
            role: roleContants.CORE_KILLER,
            priority: priority.severe,
            canHandle: (objectives: Objective[], room: Room, ctx: SpawnContext) =>
                objectives.some(obj => obj.type === roleContants.CORE_KILLER && obj.home === room.name),
            execute: (objectives: Objective[], room: Room, ctx: SpawnContext) => {
                const coreKillObj = objectives.filter(obj => obj.type === roleContants.CORE_KILLER && obj.home === room.name) as InvaderCoreObjective[];
                return this.spawnCoreKiller(coreKillObj, room, ctx);
            }
        },
        {
            role: roleContants.BLINKIE,
            priority: priority.severe,
            canHandle: (objectives: Objective[], room: Room, ctx: SpawnContext) =>
                objectives.some(obj => obj.type === roleContants.INVADER_DEFENCE && obj.home === room.name),
            execute: (objectives: Objective[], room: Room, ctx: SpawnContext) => {
                const defenceObjs = objectives.filter(obj => obj.type === roleContants.INVADER_DEFENCE && obj.home === room.name) as InvaderDefenceObjective[];
                return this.spawnInvaderDefender(defenceObjs, room, ctx);
            }
        },
        {
            role: roleContants.MINING,
            priority: priority.high,
            canHandle: (objectives: Objective[], room: Room, ctx: SpawnContext) =>
                objectives.some(obj => obj.type === roleContants.MINING && obj.home === room.name),
            execute: (objectives: Objective[], room: Room, ctx: SpawnContext) => {
                const miningObjs = objectives.filter(obj => obj.type === roleContants.MINING && obj.home === room.name) as MiningObjective[];
                return this.spawnMiner(miningObjs, room, ctx);
            }
        },
        {
            role: roleContants.FASTFILLER,
            priority: priority.severe,
            canHandle: (objectives: Objective[], room: Room, ctx: SpawnContext) => true,
            execute: (objectives: Objective[], room: Room, ctx: SpawnContext) => {
                return this.spawnFastFiller(room, ctx);
            }
        },
        {
            role: roleContants.PORTING,
            priority: priority.high,
            canHandle: (objectives: Objective[], room: Room, ctx: SpawnContext) => true,
            execute: (objectives: Objective[], room: Room, ctx: SpawnContext) => {
                return this.spawnPorter(room, ctx, objectives)
            }
        },
        {
            role: roleContants.MAINTAINING,
            priority: priority.medium,
            canHandle: (objectives: Objective[], room: Room, ctx: SpawnContext) =>
                objectives.some(obj => obj.type === roleContants.MAINTAINING && obj.home === room.name),
            execute: (objectives: Objective[], room: Room, ctx: SpawnContext) => {
                const maintenanceObjs = objectives.filter(obj => obj.type === roleContants.MAINTAINING && obj.home === room.name) as MaintenanceObjective[];
                return this.spawnMaintainer(maintenanceObjs, room, ctx);
            }
        },
        {
            role: roleContants.WALLREPAIRER,
            priority: priority.high,
            canHandle: (objectives: Objective[], room: Room, ctx: SpawnContext) =>
                objectives.some(obj => obj.type === roleContants.WALLREPAIRER && obj.home === room.name),
            execute: (objectives: Objective[], room: Room, ctx: SpawnContext) => {
                const maintenanceObjs = objectives.filter(obj => obj.type === roleContants.WALLREPAIRER && obj.home === room.name) as WallRepairObjective[];
                return this.spawnWallRepair(maintenanceObjs, room, ctx);
            }
        },
        {
            role: roleContants.EXPANSIONEER,
            priority: priority.medium,
            canHandle: (objectives: Objective[], room: Room, ctx: SpawnContext) =>
                objectives.some(obj => obj.type === roleContants.EXPANSIONEER && obj.home === room.name),
            execute: (objectives: Objective[], room: Room, ctx: SpawnContext) => {
                const expansions = objectives.filter(obj => obj.type === roleContants.EXPANSIONEER && obj.home === room.name) as ExpansionObjective[];
                return this.spawnExpansionPioneer(expansions, room, ctx);
            }
        },
        {
            role: roleContants.HAULING,
            priority: priority.high,
            canHandle: (objectives: Objective[], room: Room, ctx: SpawnContext) =>
                objectives.some(obj => obj.type === roleContants.HAULING && obj.home === room.name),
            execute: (objectives: Objective[], room: Room, ctx: SpawnContext) => {
                const haulingObjs = objectives.filter(obj => obj.type === roleContants.HAULING && obj.home === room.name) as HaulingObjective[];
                return this.spawnHauler(haulingObjs, room, ctx);
            }
        },
        {
            role: roleContants.BUILDING,
            priority: priority.low,
            canHandle: (objectives: Objective[], room: Room, ctx: SpawnContext) =>
                objectives.some(obj => obj.type === roleContants.BUILDING && obj.home === room.name),
            execute: (objectives: Objective[], room: Room, ctx: SpawnContext) => {
                const buildingObjs = objectives.filter(obj => obj.type === roleContants.BUILDING && obj.home === room.name) as BuildingObjective[];
                return this.spawnBuilder(buildingObjs, room, objectives, ctx);
            }
        },
        {
            role: roleContants.UPGRADING,
            priority: priority.veryLow,
            canHandle: (objectives: Objective[], room: Room, ctx: SpawnContext) =>
                objectives.some(obj => obj.type === roleContants.UPGRADING && obj.home === room.name),
            execute: (objectives: Objective[], room: Room, ctx: SpawnContext) => {
                const upgradeObjs = objectives.filter(obj => obj.type === roleContants.UPGRADING && obj.home === room.name) as UpgradeObjective[];
                return this.spawnUpgrader(objectives, upgradeObjs, room, ctx);
            }
        }
    ];

    run(objectives: Objective[], room: Room, creeps: Creep[]) {
        // Early exit if no spawn
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        if (!spawn || spawn.spawning) return;


        // Create context with cached data
        const context: SpawnContext = this.createSpawnContext(spawn, creeps, room);

        let parts = 0;
        for(const name in Game.creeps){
            if(Game.creeps[name] != undefined && Game.creeps[name].memory.home === room.name)
                parts += Game.creeps[name].body.length
        }
        if(parts > 500) return;
        // Group objectives by priority
        const objectivesByPriority = this.groupObjectivesByPriority(objectives);

        // Process each priority level
        for (let currentPrio = priority.severe; currentPrio <= priority.veryLow; currentPrio++) {
            const currentObjectives = objectivesByPriority.get(currentPrio) || [];
            if (currentObjectives.length === 0) continue;

            // Try each spawn action for this priority level
            for (const action of this.spawnActions) {
                if (action.canHandle(currentObjectives, room, context)) {
                    const result = action.execute(
                        objectives.filter(o => o.home === room.name),
                        room,
                        context
                    );
                    if (result !== undefined && result !== -3 && result !== -10 && result !== -6) {
                        return; // Successfully spawned something
                    }
                }
            }
        }
    }

    private createSpawnContext(spawn: StructureSpawn, creeps: Creep[], room: Room): SpawnContext {
        // Group creeps by role once
        const creepsByRole: { [role: string]: Creep[] } = {};
        const creepsByHomeAndRole: { [key: string]: Creep[] } = {};

        for (const creep of creeps) {
            const role = creep.memory.role;
            const home = creep.memory.home;

            if (!creepsByRole[role]) creepsByRole[role] = [];
            creepsByRole[role].push(creep);

            const key = `${home}-${role}`;
            if (!creepsByHomeAndRole[key]) creepsByHomeAndRole[key] = [];
            creepsByHomeAndRole[key].push(creep);
        }

        return {
            spawn,
            creeps,
            creepsByRole,
            creepsByHomeAndRole,
            containers: room.memory.containers || []
        };
    }

    // === SPAWN LOGIC METHODS ===
    // All the actual spawning logic is now contained within this class

    private spawnPorter(room: Room, ctx: SpawnContext, objectives: Objective[]) {
        if (room.storage === undefined) return
        let returnValue = undefined
        const rcl = room.controller?.level ?? 0;
        const storage = room.storage;
        const porter = ctx.creepsByHomeAndRole[`${room.name}-${roleContants.PORTING}`]??[];
        let workParts = 0;
        if (porter.length??0 > 0) {
            workParts = getWorkParts(porter, CARRY);
        }
        let dis = 0;

        objectives.forEach(o => {
            if(o.type === roleContants.BUILDING || o.type === roleContants.UPGRADING){
                dis += o.distance;
            }
        })
        ctx.containers.forEach(c => {
            if(c.type === roleContants.FASTFILLER){
                const container = Game.getObjectById(c.id) as StructureContainer;
                if(container != undefined){
                    dis += ctx.spawn.pos.getRangeTo(container.pos.x, container.pos.y);
                }

            }
        })
        const requiredWorkParts = this.economyService.requiredHaulerParts(this.economyService.getCurrentRoomIncome(room, objectives), 20);
        let creepAmount = rcl;
        if(rcl < 4){
            creepAmount = creepAmount/2
        }
        if (rcl >= 4 && storage != undefined && workParts < requiredWorkParts && (porter.length??0) < 5) {
            const neededParts = (requiredWorkParts - workParts);
            const body = generateBody([CARRY, CARRY, MOVE],
                BODYPART_COST[CARRY] + BODYPART_COST[CARRY] + BODYPART_COST[MOVE],
                room.energyAvailable, neededParts, 2);
            const memory: HaulerMemory = {
                home: room.name,
                role: roleContants.PORTING,
                take: "withdrawl",
                onRoute: false,
                homeSpawn: ctx.spawn.id
            }
            const spawn = room.find(FIND_MY_SPAWNS)[0]
            if (!spawn.spawning) {
                returnValue = spawn.spawnCreep(body, generateName(roleContants.PORTING), { memory })
            }
        }
        return returnValue;
    }

    private spawnScout(objective: ScoutingObjective, room: Room, ctx: SpawnContext) {
        if (ctx.creepsByRole[roleContants.HAULING]?.filter(c => c.memory.home === room.name).length === 0) return
        let returnValue = undefined;
        if (room.memory.scoutPlan === undefined) return;
        const scout = ctx.creepsByRole[roleContants.SCOUTING]?.find(creep => creep.memory.role === roleContants.SCOUTING && creep.memory.home === room.name);
        if (scout != undefined) return;
        let totalTime = 0;
        let numberOfRooms = 0
        objective.toScout.forEach(room => {
            if (room != null && (room.lastVisit ?? 0) === 0) {
                totalTime += 0
            } else {
                totalTime += Game.time - (room?.lastVisit ?? 0)
            }
            numberOfRooms++;
        })
        const avg = totalTime / numberOfRooms;
        if (true) {
            const body = [MOVE];
            const memory: ScoutMemory = {
                home: room.name,
                role: roleContants.SCOUTING,
                currIndex: 0,
                route: objective.toScout,
                homeSpawn: ctx.spawn.id,
            }
            if (!ctx.spawn.spawning) {
                returnValue = ctx.spawn.spawnCreep(body, generateName(roleContants.SCOUTING), { memory })
            }
        }
        return returnValue;
    }

    private spawnFastFiller(room: Room, ctx: SpawnContext) {
        let retValue = undefined;
        if (ctx.creepsByRole[roleContants.HAULING]?.filter(c => c.memory.home === room.name).length < 3) return
        ctx.containers?.forEach(container => {
            if (container != undefined && container.type === roleContants.FASTFILLER && container.fastFillerSpots != undefined) {
                for (let spot of container.fastFillerSpots) {
                    if (!ctx.creepsByRole[roleContants.FASTFILLER]?.find(creep => creep.memory.role === roleContants.FASTFILLER && (creep.memory as FastFillerMemory).pos.x === spot.x && (creep.memory as FastFillerMemory).pos.y === spot.y)) {
                        let direction = undefined
                        let body = [CARRY, CARRY, CARRY, MOVE];
                        if(ctx.spawn.pos.inRangeTo(spot.x, spot.y, 1)){
                            direction = [ctx.spawn.pos.getDirectionTo(spot.x, spot.y) as DirectionConstant];
                            body = [CARRY, CARRY, CARRY]
                        }
                        const memory: FastFillerMemory = {
                            home: room.name,
                            role: roleContants.FASTFILLER,
                            working: false,
                            pos: spot,
                            supply: container.id,
                            homeSpawn: ctx.spawn.id
                        }
                        if (!ctx.spawn.spawning) {
                            retValue = ctx.spawn.spawnCreep(body, generateName(roleContants.FASTFILLER), { memory, directions: direction})
                        }
                    }
                }
            }
        })
        return retValue
    }

    private spawnHauler(objectives: HaulingObjective[], room: Room, ctx: SpawnContext) {
        if (!ctx.creepsByHomeAndRole[`${room.name}-${roleContants.MINING}`]) return;
        let retValue = undefined
        objectives.forEach(objective => {
            let currCarry = 0;
            for (const index in Game.creeps) {
                const creep = Game.creeps[index]
                const memory = Memory.creeps[creep.name]
                if (memory.role === roleContants.HAULING && memory.home === objective.home) currCarry += getWorkParts([creep], CARRY);
            }
            const maxHaulerPartsPerRoom = 150;
            if (objective.currParts < objective.maxHaulerParts && objective.currParts < maxHaulerPartsPerRoom) {
                const body = createCreepBody(objective, room, objective.currParts, objective.maxHaulerParts);
                const memory: CreepMemory = {
                    home: room.name,
                    role: roleContants.HAULING,
                    working: false,
                    homeSpawn: ctx.spawn.id
                }
                if (ctx.spawn.spawning === null) {
                    retValue = ctx.spawn.spawnCreep(body, generateName(roleContants.HAULING), { memory })
                } else {
                    retValue = undefined;
                }
            }
        })
        return retValue
    }

    private spawnMiner(objectives: MiningObjective[], room: Room, ctx: SpawnContext) {
        let returnValue = undefined;
        objectives.sort((a, b) => (b.distance??Infinity) - (a.distance??Infinity))
            .forEach(objective => {
                let assignedCreeps: Creep[] = ctx.creepsByHomeAndRole[`${room.name}-${roleContants.MINING}`]?.filter(c=> (c.memory as MinerMemory).sourceId === objective.sourceId)??[]
                let currWorkParts = 0;
                if (assignedCreeps.length > 0) {
                    currWorkParts = getWorkParts(assignedCreeps, WORK);
                }

                let coord: Point | undefined = undefined
                ctx.containers.forEach(container => {
                    if (container.source === objective.sourceId && container.fastFillerSpots != undefined) {
                        coord = container.fastFillerSpots[0]
                    }
                })
                if (coord != undefined && objective.spots > 1) {
                    objective.spots = 1
                }

                if (objective.maxWorkParts > currWorkParts && objective.spots - assignedCreeps.length > 0) {
                    const body = createCreepBody(objective, room, currWorkParts, objective.maxWorkParts)
                    if (objective.path === undefined) return;
                    const memory: MinerMemory = {
                        home: room.name,
                        role: roleContants.MINING,
                        sourceId: objective.sourceId,
                        route: objective.path,
                        working: false,
                        containerPos: coord,
                        targetRoom: objective.target,
                        homeSpawn: ctx.spawn.id
                    }
                    returnValue = ctx.spawn.spawnCreep(body, generateName(roleContants.MINING), { memory })
                }
            })
        return returnValue;
    }

    private spawnExpansionPioneer(expansions: ExpansionObjective[], room: Room, ctx: SpawnContext) {
        let returnValue: any = undefined
        expansions.forEach(expansion => {
            const expRoom = Game.rooms[expansion.target];
            const claimer = ctx.creepsByRole[roleContants.CLAIMER];
            if ((expRoom === undefined || !expRoom.controller?.my) && !claimer) {
                returnValue = this.spawnClaimer(room, expansion.target, ctx);
            } else if (returnValue === undefined) {
                const pioneers = ctx.creeps.filter(c => c.memory.role === roleContants.PIONEER);
                if (pioneers.length < 4) {
                    returnValue = this.spawnPioneer(room, expansion.target, ctx)
                }
            }
        })
        return returnValue;
    }

    private spawnPioneer(room: Room, target: string, ctx: SpawnContext) {
        const body = [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE];
        const name = generateName(roleContants.PIONEER);
        const memory: ClaimerMemory = {
            home: room.name,
            role: roleContants.PIONEER,
            target,
            homeSpawn: ctx.spawn.id
        }

        return ctx.spawn.spawnCreep(body, name, { memory })
    }

    private spawnClaimer(room: Room, target: string, ctx: SpawnContext) {
        const body = [CLAIM, MOVE];
        const name = generateName(roleContants.CLAIMER)
        const memory: ClaimerMemory = {
            home: room.name,
            role: roleContants.CLAIMER,
            target,
            homeSpawn: ctx.spawn.id
        }

        return ctx.spawn.spawnCreep(body, name, { memory })
    }

    private spawnReserver(objective: ReserveObjective, room: Room, ctx: SpawnContext) {
        if (objective === undefined) return;
        for (let reserv of objective.toReserve) {
            const hasReserv = ctx.creeps.find(creep => creep.name === `${roleContants.RESERVING} ${reserv}`);
            if (hasReserv != undefined) continue;
            const mem: ReservMemory = {
                home: room.name,
                role: roleContants.RESERVING,
                targetRoom: reserv,
                homeSpawn: ctx.spawn.id
            }
            if (room.energyAvailable < 650) return undefined;
            let body = [CLAIM, MOVE];
            if (room.storage && room.energyAvailable >= 1250) {
                body = [CLAIM, CLAIM, MOVE, MOVE]
            }
            const retValue = ctx.spawn.spawnCreep(
                body,
                `${roleContants.RESERVING} ${reserv}`,
                { memory: mem }
            )
            return retValue;
        }
        return undefined
    }

    private spawnBuilder(objectives: BuildingObjective[], room: Room, allObjectives: Objective[], ctx: SpawnContext) {
        let retValue = undefined;
        objectives.forEach(objective => {
            let currWork = 0;
            for (const index in Game.creeps) {
                const creep = Game.creeps[index]
                const memory = Memory.creeps[creep.name]
                if (memory.role === roleContants.BUILDING && memory.home === objective.home) currWork += getWorkParts([creep], WORK);
            }
            let currNeed = this.economyService.getCurrentRoomIncome(room, allObjectives) / E_FOR_BUILDER;
            if (currWork < currNeed) {
                const body = createCreepBody(objective, room, currWork, currNeed);
                const memory: BuilderMemory = {
                    home: room.name,
                    role: roleContants.BUILDING,
                    working: false,
                    target: objective.targetId as Id<StructureRampart>,
                    done: false,
                    homeSpawn: ctx.spawn.id
                }
                if (!ctx.spawn.spawning) {
                    retValue = ctx.spawn.spawnCreep(body, generateName(roleContants.BUILDING), { memory })
                }
            }
        })
        return retValue
    }

    private spawnMaintainer(objectives: MaintenanceObjective[], room: Room, ctx: SpawnContext) {
        let retValue = undefined;
        const objective = objectives.find(objective => objective.home === room.name)
        if (objective != undefined) {
            const assignedCreeps = ctx.creeps.filter(creep => creep.memory.role === roleContants.MAINTAINING && creep.memory.home === room.name)
            const workParts = getWorkParts(assignedCreeps, WORK);
            if (workParts < objective.maxWorkParts) {
                const body = createCreepBody(objective, room, workParts, objective.maxWorkParts)
                const memory: MaintainerMemory = {
                    home: room.name,
                    role: roleContants.MAINTAINING,
                    target: objective.toRepair[0],
                    working: false,
                    repairTarget: undefined,
                    take: "pickup",
                    homeSpawn: ctx.spawn.id
                }
                retValue = ctx.spawn.spawnCreep(body, generateName(roleContants.MAINTAINING), { memory });
            }
        }

        return retValue;
    }

     private spawnWallRepair(objectives: WallRepairObjective[], room: Room, ctx: SpawnContext) {
        let retValue = undefined;
        const objective = objectives.find(objective => objective.home === room.name)
        if (objective != undefined) {
            const assignedCreeps = ctx.creeps.filter(creep => creep.memory.role === roleContants.WALLREPAIRER && creep.memory.home === room.name)
            const workParts = getWorkParts(assignedCreeps, WORK);
            if (workParts < objective.maxWorkParts) {
                const body = createCreepBody(objective, room, workParts, objective.maxWorkParts)
                const memory: WallRepairMemory = {
                    home: room.name,
                    role: roleContants.WALLREPAIRER,
                    target: room.name,
                    repairTarget: undefined,
                    take: "pickup",
                    homeSpawn: ctx.spawn.id
                }
                retValue = ctx.spawn.spawnCreep(body, generateName(roleContants.WALLREPAIRER), { memory });
            }
        }

        return retValue;
    }

    private spawnUpgrader(allObjectives: Objective[], objectives: UpgradeObjective[], room: Room, ctx: SpawnContext) {
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

            let cost = E_FOR_UPGRADER
            if ((room.controller?.level ?? 0) >= 4) {
                cost = E_FOR_UPGRADER
            }
            let currNeed = income / cost;
            if (currWork < currNeed && income > (maxIncome / 3)) {
                const body = createCreepBody(objective, room, currWork, currNeed);
                const memory: UpgraderMemory = {
                    home: room.name,
                    role: roleContants.UPGRADING,
                    working: false,
                    controllerId: objective.controllerId,
                    spawnedRcl: room.controller?.level ?? 1,
                    homeSpawn: ctx.spawn.id
                }
                const name = generateName(roleContants.UPGRADING);
                retValue = ctx.spawn.spawnCreep(body, name, { memory })
            }
        })
        return retValue
    }

    private spawnCoreKiller(objectives: InvaderCoreObjective[], room: Room, ctx: SpawnContext) {
        let retValue = undefined;
        objectives.forEach(o => {
            if (!ctx.creeps.find(c => c.memory.role === roleContants.CORE_KILLER && (c.memory as CoreKillerMemory).target === o.id)) {
                const cost = (o.attackParts * BODYPART_COST[ATTACK]) + (o.attackParts * BODYPART_COST[MOVE]);
                if (cost < room.energyAvailable) {
                    const body = generateBody([ATTACK, MOVE], 150, room.energyAvailable, o.attackParts);
                    const memory: CoreKillerMemory = {
                        home: room.name,
                        role: roleContants.CORE_KILLER,
                        target: o.id,
                        homeSpawn: ctx.spawn.id
                    }
                    const name = generateName(roleContants.CORE_KILLER);
                    retValue = ctx.spawn.spawnCreep(body, name, { memory })
                }
            }
        })
        return retValue;
    }

    private spawnInvaderDefender(objectives: InvaderDefenceObjective[], room: Room, ctx: SpawnContext) {
        let returnValue = undefined
        objectives.forEach(objective => {
            const defender = ctx.creeps.filter(c => (c.memory as BlinkieMemory).target && c.memory.role === roleContants.BLINKIE);
            switch (objective.threatLevel) {
                case ("LOW"):
                    if (defender.length < 3) {
                        returnValue = this.spawnBlinkie(room, objective.target, ctx)
                    }
                    break;
                case ("MEDIUM"):
                    if (defender.length < 3) {
                        returnValue = this.spawnBlinkie(room, objective.target, ctx)
                    }
                    break;
                case ("HIGH"):
                    if (defender.length < 4) {
                        returnValue = this.spawnBlinkie(room, objective.target, ctx)
                    }
                    break;
                case ("CRITICAL"):
                    if (defender.length < 5) {
                        returnValue = this.spawnBlinkie(room, objective.target, ctx)
                    }
                    break;
            }
        });
        if (returnValue === -6) {
            returnValue = undefined
        }
        return returnValue
    }

    private spawnBlinkie(room: Room, target: string, ctx: SpawnContext) {
        let body = []
        if(room.energyAvailable < 600){
            body = [TOUGH,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK]
        } else {
            body = [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, HEAL, HEAL, HEAL]
        }
        const name = generateName(roleContants.INVADER_DEFENCE)
        const memory: BlinkieMemory = {
            home: room.name,
            role: roleContants.BLINKIE,
            target,
            homeSpawn: ctx.spawn.id
        }
        return ctx.spawn.spawnCreep(body, name, { memory })
    }

    // Helper methods
    private groupObjectivesByPriority(objectives: Objective[]): Map<Priority, Objective[]> {
        const grouped = new Map<Priority, Objective[]>();

        for (const objective of objectives) {
            if (!objective) continue;
            const prio = objective.priority as Priority;

            if (!grouped.has(prio)) {
                grouped.set(prio, []);
            }
            grouped.get(prio)!.push(objective);
        }

        return grouped;
    }
}
