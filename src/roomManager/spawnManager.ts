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
import { eStorageLimit } from "services/resource.service";

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
    containers: any[];
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
        const spawns = room.find(FIND_MY_SPAWNS);
        if (spawns.length === 0) return;

        // Check if any spawn is busy
        for (const s of spawns) {
            if (s.spawning) return;
        }

        const spawn = spawns[0];
        if (spawn.spawning) return;

        const context: SpawnContext = this.createSpawnContext(spawn, creeps, room);

        let parts = 0;
        for(const name in Game.creeps){
            if(Game.creeps[name] != undefined && Game.creeps[name].memory.home === room.name) {
                parts += Game.creeps[name].body.length;
            }
        }
        if(parts > 550) return;

        const objectivesByPriority = this.groupObjectivesByPriority(objectives);

        for (let currentPrio = priority.severe; currentPrio <= priority.veryLow; currentPrio++) {
            const currentObjectives = objectivesByPriority.get(currentPrio) || [];
            if (currentObjectives.length === 0) continue;

            for (const action of this.spawnActions) {
                if (action.canHandle(currentObjectives, room, context)) {
                    const result = action.execute(
                        objectives.filter(o => o.home === room.name),
                        room,
                        context
                    );

                    if (result !== undefined) {
                        return;
                    }
                }
            }
        }
    }

    private createSpawnContext(spawn: StructureSpawn, creeps: Creep[], room: Room): SpawnContext {
        const creepsByRole: { [role: string]: Creep[] } = {};

        for (const creep of creeps) {
            const role = creep.memory.role;
            const home = creep.memory.home;

            if (!creepsByRole[role]) creepsByRole[role] = [];
            creepsByRole[role].push(creep);
        }

        return {
            spawn,
            creeps,
            creepsByRole,
            containers: room.memory.containers || []
        };
    }

    /**
     * Reliable method to count creeps (alive + spawning)
     */
    private getCreepCount(room: Room, role: roleContants): number {
        let count = 0;

        // Count alive creeps
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            if (creep.memory.home === room.name && creep.memory.role === role) {
                count++;
            }
        }

        // Count spawning creeps
        const spawns = room.find(FIND_MY_SPAWNS);
        for (const spawn of spawns) {
            if (spawn.spawning) {
                const spawningName = spawn.spawning.name;
                if (Memory.creeps[spawningName]) {
                    const mem = Memory.creeps[spawningName];
                    if (mem.home === room.name && mem.role === role) {
                        count++;
                    }
                }
            }
        }

        return count;
    }

    /**
     * Get list of creeps of a specific role (alive only, for work part calculations)
     */
    private getCreepsOfRole(room: Room, role: roleContants): Creep[] {
        const creeps: Creep[] = [];
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            if (creep.memory.home === room.name && creep.memory.role === role) {
                creeps.push(creep);
            }
        }
        return creeps;
    }

    // === SPAWN LOGIC METHODS - ALL USING getCreepCount ===

    private spawnScout(objective: ScoutingObjective, room: Room, ctx: SpawnContext) {
        const haulerCount = this.getCreepCount(room, roleContants.HAULING);
        if (haulerCount === 0) return;

        if (room.memory.scoutPlan === undefined) return;

        const scoutCount = this.getCreepCount(room, roleContants.SCOUTING);
        if (scoutCount > 0) return;

        const body = [MOVE];
        const memory: ScoutMemory = {
            home: room.name,
            role: roleContants.SCOUTING,
            currIndex: 0,
            route: objective.toScout,
            homeSpawn: ctx.spawn.id,
        };

        if (!ctx.spawn.spawning) {
            return ctx.spawn.spawnCreep(body, generateName(roleContants.SCOUTING), { memory });
        }

        return undefined;
    }

    private spawnFastFiller(room: Room, ctx: SpawnContext) {
        const haulerCount = this.getCreepCount(room, roleContants.HAULING);
        if (haulerCount < 3) return;

        const fastFillers = this.getCreepsOfRole(room, roleContants.FASTFILLER);

        for (const container of (ctx.containers || [])) {
            if (container != undefined && container.type === roleContants.FASTFILLER && container.fastFillerSpots != undefined) {
                for (let spot of container.fastFillerSpots) {
                    const hasFastFiller = fastFillers.find(
                        creep => (creep.memory as FastFillerMemory).pos.x === spot.x &&
                        (creep.memory as FastFillerMemory).pos.y === spot.y
                    );

                    if (hasFastFiller) continue;

                    // Check if spawning a fastfiller for this spot
                    let spawningForSpot = false;
                    const spawns = room.find(FIND_MY_SPAWNS);
                    for (const spawn of spawns) {
                        if (spawn.spawning && Memory.creeps[spawn.spawning.name]) {
                            const mem = Memory.creeps[spawn.spawning.name] as FastFillerMemory;
                            if (mem.role === roleContants.FASTFILLER &&
                                mem.pos?.x === spot.x && mem.pos?.y === spot.y) {
                                spawningForSpot = true;
                                break;
                            }
                        }
                    }

                    if (spawningForSpot) continue;

                    let direction = undefined;
                    let body = [CARRY, CARRY, CARRY, MOVE];
                    if (ctx.spawn.pos.inRangeTo(spot.x, spot.y, 1)) {
                        direction = [ctx.spawn.pos.getDirectionTo(spot.x, spot.y) as DirectionConstant];
                        body = [CARRY, CARRY, CARRY];
                    }

                    const memory: FastFillerMemory = {
                        home: room.name,
                        role: roleContants.FASTFILLER,
                        working: false,
                        pos: spot,
                        supply: container.id,
                        homeSpawn: ctx.spawn.id
                    };

                    if (!ctx.spawn.spawning) {
                        return ctx.spawn.spawnCreep(body, generateName(roleContants.FASTFILLER), {
                            memory,
                            directions: direction
                        });
                    }
                }
            }
        }

        return undefined;
    }

    private spawnHauler(objectives: HaulingObjective[], room: Room, ctx: SpawnContext) {
        const minerCount = this.getCreepCount(room, roleContants.MINING);
        if (minerCount === 0) return;

        for (const objective of objectives) {
            let currCarry = 0;
            const haulers = this.getCreepsOfRole(room, roleContants.HAULING);
            for (const hauler of haulers) {
                currCarry += getWorkParts([hauler], CARRY);
            }

            const maxHaulerPartsPerRoom = 150;
            if (objective.currParts < objective.maxHaulerParts && objective.currParts < maxHaulerPartsPerRoom) {
                const body = createCreepBody(objective, room, objective.currParts, objective.maxHaulerParts);
                const memory: CreepMemory = {
                    home: room.name,
                    role: roleContants.HAULING,
                    working: false,
                    homeSpawn: ctx.spawn.id
                };

                if (ctx.spawn.spawning === null) {
                    return ctx.spawn.spawnCreep(body, generateName(roleContants.HAULING), { memory });
                }
            }
        }

        return undefined;
    }

    private spawnMiner(objectives: MiningObjective[], room: Room, ctx: SpawnContext) {
        // Sort by distance - CLOSEST first (ascending order)
        const sortedObjectives = objectives.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

        for (const objective of sortedObjectives) {
            // Get miners for this specific source
            const minersForSource = this.getCreepsOfRole(room, roleContants.MINING)
                .filter(c => (c.memory as MinerMemory).sourceId === objective.sourceId);

            let currWorkParts = 0;
            if (minersForSource.length > 0) {
                currWorkParts = getWorkParts(minersForSource, WORK);
            }

            let coord: Point | undefined = undefined;
            ctx.containers.forEach(container => {
                if (container.source === objective.sourceId && container.fastFillerSpots != undefined) {
                    coord = container.fastFillerSpots[0];
                }
            });

            // if (coord != undefined && objective.spots > 0) {
            //     objective.spots = 1;
            // }

            if (objective.maxWorkParts > currWorkParts && objective.spots > minersForSource.length) {
                const body = createCreepBody(objective, room, currWorkParts, objective.maxWorkParts);

                if (objective.path === undefined) continue;

                const memory: MinerMemory = {
                    home: room.name,
                    role: roleContants.MINING,
                    sourceId: objective.sourceId,
                    route: objective.path,
                    working: false,
                    containerPos: coord,
                    targetRoom: objective.target,
                    homeSpawn: ctx.spawn.id
                };

                return ctx.spawn.spawnCreep(body, generateName(roleContants.MINING), { memory });
            }
        }

        return undefined;
    }

    private spawnPorter(room: Room, ctx: SpawnContext, objectives: Objective[]) {
        if (room.storage === undefined) return;
        const rcl = room.controller?.level ?? 0;
        const storage = room.storage;
        if(storage.store.energy < (eStorageLimit[rcl] / 4)) return;

        const porters = this.getCreepsOfRole(room, roleContants.PORTING);
        let workParts = 0;
        if (porters.length > 0) {
            workParts = getWorkParts(porters, CARRY);
        }

        let dis = 0;
        objectives.forEach(o => {
            if(o.type === roleContants.BUILDING || o.type === roleContants.UPGRADING){
                dis += o.distance;
            }
        });

        ctx.containers.forEach(c => {
            if(c.type === roleContants.FASTFILLER){
                const container = Game.getObjectById(c.id) as StructureContainer;
                if(container != undefined){
                    dis += ctx.spawn.pos.getRangeTo(container.pos.x, container.pos.y);
                }
            }
        });

        const requiredWorkParts = this.economyService.requiredHaulerParts(
            this.economyService.getCurrentRoomIncome(room, objectives), 20
        );

        if (rcl >= 4 && storage != undefined && workParts < requiredWorkParts && porters.length < 5) {
            const neededParts = (requiredWorkParts - workParts);
            const body = generateBody(
                [CARRY, CARRY, MOVE],
                BODYPART_COST[CARRY] + BODYPART_COST[CARRY] + BODYPART_COST[MOVE],
                room.energyAvailable,
                neededParts,
                2
            );

            const memory: HaulerMemory = {
                home: room.name,
                role: roleContants.PORTING,
                take: "withdrawl",
                onRoute: false,
                homeSpawn: ctx.spawn.id
            };

            if (!ctx.spawn.spawning) {
                return ctx.spawn.spawnCreep(body, generateName(roleContants.PORTING), { memory });
            }
        }

        return undefined;
    }

    private spawnExpansionPioneer(expansions: ExpansionObjective[], room: Room, ctx: SpawnContext) {
        for (const expansion of expansions) {
            const expRoom = Game.rooms[expansion.target];
            const claimerCount = this.getCreepCount(room, roleContants.CLAIMER);

            if ((expRoom === undefined || !expRoom.controller?.my) && claimerCount === 0) {
                return this.spawnClaimer(room, expansion.target, ctx);
            } else {
                const pioneerCount = this.getCreepCount(room, roleContants.PIONEER);
                if (pioneerCount < 4) {
                    return this.spawnPioneer(room, expansion.target, ctx);
                }
            }
        }

        return undefined;
    }

    private spawnPioneer(room: Room, target: string, ctx: SpawnContext) {
        const body = [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE];
        const name = generateName(roleContants.PIONEER);
        const memory: ClaimerMemory = {
            home: room.name,
            role: roleContants.PIONEER,
            target,
            homeSpawn: ctx.spawn.id
        };

        return ctx.spawn.spawnCreep(body, name, { memory });
    }

    private spawnClaimer(room: Room, target: string, ctx: SpawnContext) {
        const body = [CLAIM, MOVE];
        const name = generateName(roleContants.CLAIMER);
        const memory: ClaimerMemory = {
            home: room.name,
            role: roleContants.CLAIMER,
            target,
            homeSpawn: ctx.spawn.id
        };

        return ctx.spawn.spawnCreep(body, name, { memory });
    }

    private spawnReserver(objective: ReserveObjective, room: Room, ctx: SpawnContext) {
        if (objective === undefined) return;

        for (let reserv of objective.toReserve) {
            // Check by name (your existing logic)
            const hasReserv = this.getCreepsOfRole(room, roleContants.RESERVING)
                .find(creep => creep.name === `${roleContants.RESERVING} ${reserv}`);
            if (hasReserv != undefined) continue;

            // Also check spawning
            const spawns = room.find(FIND_MY_SPAWNS);
            let spawningReserver = false;
            for (const spawn of spawns) {
                if (spawn.spawning && spawn.spawning.name === `${roleContants.RESERVING} ${reserv}`) {
                    spawningReserver = true;
                    break;
                }
            }
            if (spawningReserver) continue;

            const mem: ReservMemory = {
                home: room.name,
                role: roleContants.RESERVING,
                targetRoom: reserv,
                homeSpawn: ctx.spawn.id
            };

            if (room.energyAvailable < 650) return undefined;

            let body = [CLAIM, MOVE];
            if (room.storage && room.energyAvailable >= 1250) {
                body = [CLAIM, CLAIM, MOVE, MOVE];
            }

            return ctx.spawn.spawnCreep(body, `${roleContants.RESERVING} ${reserv}`, { memory: mem });
        }
        return undefined;
    }

    private spawnBuilder(objectives: BuildingObjective[], room: Room, allObjectives: Objective[], ctx: SpawnContext) {
        for (const objective of objectives) {
            const builders = this.getCreepsOfRole(room, roleContants.BUILDING);
            const currWork = getWorkParts(builders, WORK);

            let currNeed = this.economyService.getCurrentRoomIncome(room, allObjectives) / E_FOR_BUILDER;
            if (currWork < currNeed) {
                const body = createCreepBody(objective, room, currWork, currNeed);
                const memory: BuilderMemory = {
                    home: room.name,
                    spawn: ctx.spawn.id,
                    role: roleContants.BUILDING,
                    working: false,
                    target: objective.targetId as Id<StructureRampart>,
                    done: false,
                    homeSpawn: ctx.spawn.id
                };

                if (!ctx.spawn.spawning) {
                    return ctx.spawn.spawnCreep(body, generateName(roleContants.BUILDING), { memory });
                }
            }
        }

        return undefined;
    }

    private spawnMaintainer(objectives: MaintenanceObjective[], room: Room, ctx: SpawnContext) {
        const objective = objectives.find(objective => objective.home === room.name);
        if (objective != undefined) {
            const maintainers = this.getCreepsOfRole(room, roleContants.MAINTAINING);
            const workParts = getWorkParts(maintainers, WORK);

            if (workParts < objective.maxWorkParts) {
                const body = createCreepBody(objective, room, workParts, objective.maxWorkParts);
                const memory: MaintainerMemory = {
                    home: room.name,
                    role: roleContants.MAINTAINING,
                    target: objective.toRepair[0],
                    working: false,
                    repairTarget: undefined,
                    take: "pickup",
                    homeSpawn: ctx.spawn.id
                };
                return ctx.spawn.spawnCreep(body, generateName(roleContants.MAINTAINING), { memory });
            }
        }

        return undefined;
    }

    private spawnWallRepair(objectives: WallRepairObjective[], room: Room, ctx: SpawnContext) {
        const objective = objectives.find(objective => objective.home === room.name);
        if (objective != undefined) {
            const wallRepairers = this.getCreepsOfRole(room, roleContants.WALLREPAIRER);
            const workParts = getWorkParts(wallRepairers, WORK);

            if (workParts < objective.maxWorkParts) {
                const body = createCreepBody(objective, room, workParts, objective.maxWorkParts);
                const memory: WallRepairMemory = {
                    home: room.name,
                    role: roleContants.WALLREPAIRER,
                    target: room.name,
                    repairTarget: undefined,
                    take: "pickup",
                    homeSpawn: ctx.spawn.id
                };
                return ctx.spawn.spawnCreep(body, generateName(roleContants.WALLREPAIRER), { memory });
            }
        }

        return undefined;
    }

    private spawnUpgrader(allObjectives: Objective[], objectives: UpgradeObjective[], room: Room, ctx: SpawnContext) {
        let maxIncome = 0;
        let minusIncome = 0;
        allObjectives.forEach(objective => {
            if (objective.maxIncome < 0) {
                minusIncome += objective.maxIncome;
            }
            maxIncome += objective.maxIncome;
        });

        for (const objective of objectives) {
            const upgraders = this.getCreepsOfRole(room, roleContants.UPGRADING);
            const currWork = getWorkParts(upgraders, WORK);

            const income = this.economyService.getCurrentRoomIncome(room, allObjectives);
            let cost = E_FOR_UPGRADER;

            let currNeed = income / cost;
            if (currWork < currNeed && income > 16) {
                const body = createCreepBody(objective, room, currWork, currNeed);
                const memory: UpgraderMemory = {
                    home: room.name,
                    role: roleContants.UPGRADING,
                    working: false,
                    controllerId: objective.controllerId,
                    spawnedRcl: room.controller?.level ?? 1,
                    homeSpawn: ctx.spawn.id
                };
                const name = generateName(roleContants.UPGRADING);
                return ctx.spawn.spawnCreep(body, name, { memory });
            }
        }

        return undefined;
    }

    private spawnCoreKiller(objectives: InvaderCoreObjective[], room: Room, ctx: SpawnContext) {
        for (const o of objectives) {
            const coreKillers = this.getCreepsOfRole(room, roleContants.CORE_KILLER);
            const hasKiller = coreKillers.find(c => (c.memory as CoreKillerMemory).target === o.id);

            if (!hasKiller) {
                const cost = (o.attackParts * BODYPART_COST[ATTACK]) + (o.attackParts * BODYPART_COST[MOVE]);
                if (cost < room.energyAvailable) {
                    const body = generateBody([ATTACK, MOVE], 150, room.energyAvailable, o.attackParts);
                    const memory: CoreKillerMemory = {
                        home: room.name,
                        role: roleContants.CORE_KILLER,
                        target: o.id,
                        homeSpawn: ctx.spawn.id,
                        spawn: ctx.spawn.id
                    };
                    const name = generateName(roleContants.CORE_KILLER);
                    return ctx.spawn.spawnCreep(body, name, { memory });
                }
            }
        }
        return undefined;
    }

    private spawnInvaderDefender(objectives: InvaderDefenceObjective[], room: Room, ctx: SpawnContext) {
        for (const objective of objectives) {
            const defenderCount = this.getCreepCount(room, roleContants.BLINKIE);

            let requiredDefenders = 0;
            switch (objective.threatLevel) {
                case "LOW":
                    requiredDefenders = 3;
                    break;
                case "MEDIUM":
                    requiredDefenders = 3;
                    break;
                case "HIGH":
                    requiredDefenders = 4;
                    break;
                case "CRITICAL":
                    requiredDefenders = 5;
                    break;
            }

            if (defenderCount < requiredDefenders) {
                const result = this.spawnBlinkie(room, objective.target, ctx);
                if (result !== -6) {
                    return result;
                }
            }
        }

        return undefined;
    }

    private spawnBlinkie(room: Room, target: string, ctx: SpawnContext) {
        let body = [];
        if(room.energyAvailable < 600){
            body = [TOUGH,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK];
        } else {
            body = [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, HEAL, HEAL, HEAL];
        }
        const name = generateName(roleContants.INVADER_DEFENCE);
        const memory: BlinkieMemory = {
            home: room.name,
            role: roleContants.BLINKIE,
            target,
            homeSpawn: ctx.spawn.id
        };
        return ctx.spawn.spawnCreep(body, name, { memory });
    }

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
