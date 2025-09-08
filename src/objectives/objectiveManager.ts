import { Priority, priority } from "utils/sharedTypes";
import { Objective, MiningObjective, HaulingObjective, UpgradeObjective, roleContants, BuildingObjective, MaintenanceObjective, ScoutingObjective, ReserveObjective, InvaderCoreObjective, InvaderDefenceObjective, ExpansionObjective } from "./objectiveInterfaces";
import { E_FOR_MAINTAINER, EconomyService, HAULER_MULTIPLIER } from "services/economy.service";
import { PathingService } from "services/pathing.service";
import { getCurrentConstruction } from "roomManager/constructionManager";
import { ScoutingService } from "services/scouting.service";
import { InvaderExpert, InvaderInformation } from "strategists/invaderExpert";
import { getWorkParts } from "roomManager/spawn-helper";

const economy = new EconomyService();
const invaderExpert = new InvaderExpert()

export class ObjectiveManager {
    objectives: Objective[];
    scoutingService: ScoutingService;
    pathing = new PathingService();

    constructor(ScoutingService: ScoutingService) {
        this.objectives = []
        this.scoutingService = ScoutingService
    }

    // Adds mining Objectives to the Objectives list
    private createMiningObjectives(room: Room, objectives: Objective[]): void {
        if (Memory.respawn) return;
        if (Memory.sourceInfo === undefined || Memory.sourceInfo.length === 0) return;
        // TODO: Make this smarter. Only run it ones.
        if (Memory.sourceInfo.length > 1) Memory.sourceInfo = Memory.sourceInfo.sort((a, b) => (a?.distance ?? 1) - (b?.distance ?? 1))

        for (let [index, source] of Memory.sourceInfo.entries()) {
            // Updates the objective info of the state diveates from the sourceInfo
            if(source === null || index === null) continue;
            if (this.objectives.find(obj => obj != undefined && obj.id === source.id) != undefined) {
                this.objectives.map(objective => {
                    if (objective.id === source.id && objective.type === roleContants.MINING) {
                        const sourceObject = Game.getObjectById(source.id);
                        let isMy = sourceObject?.room.controller?.reservation?.username === 'ThunFisch';
                        if (!isMy) isMy = sourceObject?.room.controller?.my ?? false;
                        if ((objective as MiningObjective).my != isMy && sourceObject != null) {
                            const UpdatedSourceInfo = this.scoutingService.addSource(room, sourceObject);
                            if (UpdatedSourceInfo != undefined) {
                                const newObjective = this.creatingMineObjective(room, UpdatedSourceInfo);
                                if (newObjective != undefined) {
                                    (objective as MiningObjective).my = isMy;
                                    (objective as MiningObjective).maxIncome = newObjective.maxIncome;
                                    (objective as MiningObjective).energyPerTick = newObjective.energyPerTick;
                                    (objective as MiningObjective).maxHaulerParts = newObjective.maxHaulerParts;
                                    (objective as MiningObjective).maxWorkParts = newObjective.maxWorkParts;
                                    (objective as MiningObjective).path = newObjective.path;
                                    (objective as MiningObjective).pathDistance = newObjective.pathDistance;

                                    source.my = isMy;
                                    source.ePerTick = UpdatedSourceInfo.ePerTick;
                                    source.maxHaulerParts = UpdatedSourceInfo.maxHaulerParts;
                                    source.maxWorkParts = UpdatedSourceInfo.maxWorkParts;
                                    source.maxIncome = UpdatedSourceInfo.maxIncome
                                    source.path = UpdatedSourceInfo.path;
                                    source.distance = UpdatedSourceInfo.distance;

                                }
                            }
                        }
                    }
                })
                continue;
            } else{
                // TODO: Make the constrains of the amount of objectives defined by spawn time utilisation and cpu available to the room.
                const haulerObjective = objectives.find(o => o.type === roleContants.HAULING && o.home === room.name) as HaulingObjective;

                const amountOfMiningObj = objectives.filter(objective => objective.home === room.name && objective.type === roleContants.MINING).length;
                // 150 workparts are a total of 300 parts. So I want to limit the Spawntime of this objective to max out at 300 from the total of 500
                if (amountOfMiningObj < 11 ) {
                    const objective = this.creatingMineObjective(room, source)
                    if (objective === undefined) continue;
                    this.objectives.push(objective);
                };
                // this.objectives.filter(objective => objective.home === room.name && objective.type === roleContants.MINING).pop()
                continue

            }
        }
    }

    private creatingMineObjective(room: Room, source: SourceInfo) {
        if (source.ePerTick === undefined || source.maxWorkParts === undefined || source.maxHaulerParts === undefined || source.maxIncome === undefined) return;
        let objective: MiningObjective | undefined = undefined;
        let prio: Priority = priority.high
        if (source.roomName != room.name) {
            prio = priority.medium;
        }
        if (source.home === room.name) {
            objective = {
                id: source.id,
                my: source.my ?? false,
                sourceId: source.id,
                priority: prio,
                home: room.name,
                target: source.roomName,
                spots: source.spots,
                pathDistance: source.distance ?? Infinity,
                energyPerTick: source.ePerTick,
                maxIncome: source.maxIncome,
                maxWorkParts: source.maxWorkParts,
                requiredWorkParts: source.maxWorkParts,
                maxHaulerParts: source.maxHaulerParts,
                distance: source.distance ?? 0,
                path: source.path,
                type: roleContants.MINING
            }
        }
        return objective;
    }

    // Adds and updates the Hauling Objective
    private getHaulObjectives(room: Room, list: Objective[], creeps: Creep[]) {
        let haulerCapacity = 0
        list.filter(objective => objective.home === room.name && objective.type != roleContants.HAULING)
            .map(objective => {
                haulerCapacity += (objective.maxHaulerParts);
            })
        if (haulerCapacity === 0) return;
        const currentHaulObjective = this.objectives.find(objective => objective.type === roleContants.HAULING && objective.target === room.name);
        if (currentHaulObjective != undefined) {
            this.objectives.map(objective => {
                if (objective.home === room.name && objective.type === roleContants.HAULING && objective.target === room.name) {
                    const newHaul = this.createHaulObjective(room, haulerCapacity * HAULER_MULTIPLIER, creeps);
                    objective.priority = newHaul.priority;
                    objective.maxHaulerParts = newHaul.maxHaulerParts;
                    objective.currParts = newHaul.currParts
                }
            })
        } else if (room.memory.isOwned) {
            this.objectives.push(this.createHaulObjective(room, haulerCapacity * HAULER_MULTIPLIER, creeps))
        }
    }

    private createHaulObjective(room: Room, haulerCapacity: number, creeps: Creep[]): HaulingObjective {
        const income = economy.getCurrentRoomIncome(room, this.objectives);
        let currCarry = 0;
        for (const creep of creeps) {
            const memory = Memory.creeps[creep.name]
            if (memory.role === roleContants.HAULING && memory.home === room.name) currCarry += getWorkParts([creep], CARRY);
        }

        let dis = 0;
        this.objectives.forEach(objective => {
            let hasCreeps = 0;
            creeps.forEach(creep => {
                if (creep.memory.role === objective.type && creep.memory.home === objective.home && (creep.memory as MinerMemory).sourceId === objective.id) {
                    hasCreeps++;
                }
            })

            if (objective.distance && hasCreeps > 0) dis += objective.distance
        })
        let currentReq = economy.requiredHaulerParts(income, dis);
        if (currentReq >= haulerCapacity) {
            currentReq = haulerCapacity
        }
        let prio: Priority = priority.high;
        if (currCarry > haulerCapacity / 16) {
            prio = priority.low
        }
        if (currCarry > haulerCapacity) {
            prio = priority.veryLow
        }
        return {
            id: `${room.name} ${roleContants.HAULING}`,
            capacityRequired: haulerCapacity * CARRY_CAPACITY,
            maxHaulerParts: haulerCapacity,
            currParts: currCarry,
            home: room.name,
            target: room.name,
            priority: prio,
            type: roleContants.HAULING,
            maxIncome: 0,
            distance: 0
        }
    }

    private getUpgradeObjectives(room: Room) {
        const objective = this.objectives.find(objective => objective.home === room.name && objective.type === roleContants.UPGRADING);
        const controller = room.controller;
        if (controller === undefined) return;
        if (objective != undefined) {
            this.objectives.map(objective => {
                if (objective.home === room.name && objective.type === roleContants.UPGRADING && objective.target === room.name) {
                    const energyPerTick = economy.getCurrentRoomIncome(room, this.getRoomObjectives(room));
                    objective.netEnergyIncome = economy.getCurrentRoomIncome(room, this.getRoomObjectives(room));
                    objective.maxHaulerParts = energyPerTick * (objective.distance / CARRY_CAPACITY);
                }
            })
        } else {
            const newObjective = this.createUpgradingObjective(room, controller);
            if (newObjective != undefined) {
                this.objectives.push(newObjective)
            }
        }
    }

    private createUpgradingObjective(room: Room, controller: StructureController): UpgradeObjective | undefined {
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        if(spawn === undefined) return;
        const route = this.pathing.findPath(spawn.pos, controller.pos)
        if (route === undefined) return
        const energyPerTick = economy.getCurrentRoomIncome(room, this.getRoomObjectives(room));
        const maxHaulerParts = energyPerTick * (route.cost / CARRY_CAPACITY)
        const eToSpawnHaulers = (maxHaulerParts * (room.memory.hasRoads ? 75 : 100)) / CREEP_LIFE_TIME;
        return {
            controllerId: controller.id,
            home: room.name,
            id: `${roleContants.UPGRADING} ${room.name}`,
            maxIncome: -eToSpawnHaulers,
            target: room.name,
            type: roleContants.UPGRADING,
            priority: priority.medium,
            netEnergyIncome: energyPerTick,
            maxHaulerParts: maxHaulerParts,
            path: route.path,
            distance: route.cost
        }
    }

    private getConstructionObjectives(room: Room) {
        if (room.memory.constructionOffice === undefined) return;
        const objective = this.objectives.find(objective => objective != undefined && objective.home === room.name && objective.type === roleContants.BUILDING);
        if (room.memory.constructionOffice.finished) {
            for (const index in this.objectives) {
                const objective = this.objectives[index]
                if (objective.home === room.name && objective.type === roleContants.BUILDING) {
                    delete this.objectives[index]
                }
            }
        }
        const currentSite = getCurrentConstruction(room)
        if (currentSite === undefined) return;
        const cSite = Game.getObjectById(currentSite)
        if (cSite === null) return;
        if (objective != undefined) {
            this.objectives.map(objective => {
                if (objective.home === room.name && objective.type === roleContants.BUILDING && objective.target === room.name) {
                    objective.targetId = cSite.id;
                    objective.progress = cSite.progress;
                    objective.progressTotal = cSite.progressTotal;
                }
            })
        } else {
            const newObjective = this.createBuildingObjective(room, cSite);
            if (newObjective != undefined) {
                this.objectives.push(newObjective)
            }
        }
    }

    private createBuildingObjective(room: Room, cSite: ConstructionSite): BuildingObjective | undefined {
        const spawn = room.find(FIND_MY_SPAWNS)[0]
        if(spawn === undefined) return;
        const route = this.pathing.findPath(spawn.pos, cSite.pos)
        if (route === undefined) return
        const energyPerTick = economy.getCurrentRoomIncome(room, this.getRoomObjectives(room));

        return {
            home: room.name,
            id: `${roleContants.BUILDING} ${room.name}`,
            maxIncome: -energyPerTick + 1,
            target: room.name,
            targetId: cSite.id,
            progress: cSite.progress,
            progressTotal: cSite.progressTotal,
            type: roleContants.BUILDING,
            priority: priority.medium,
            maxHaulerParts: energyPerTick * (route.cost / CARRY_CAPACITY),
            path: route.path,
            distance: route.cost
        }
    }

    private getMaintenanceObjective(room: Room) {
        const toRepair = room.find(FIND_STRUCTURES).filter(structure => structure.hits < (structure.hitsMax / 2) && structure.structureType != STRUCTURE_WALL && structure.structureType != STRUCTURE_RAMPART);
        let hitsToRepair = 0;
        let totalHits = 0;
        let ids: string[] = []
        if (toRepair.length === 0) return;
        toRepair.sort((a, b) => a.hits - b.hits)
        toRepair.forEach(structure => {
            hitsToRepair += structure.hitsMax - structure.hits;
            totalHits += structure.hitsMax;
            ids.push(structure.id)
        });
        const hitsOverLifeTime = hitsToRepair / CREEP_LIFE_TIME;
        const currentObjective = this.objectives.find(objective => objective != undefined && objective.type === roleContants.MAINTAINING && objective.home === room.name)
        if (currentObjective != undefined) {
            this.objectives.map(objective => {
                if (objective.home === room.name && objective.type === roleContants.MAINTAINING && objective.target === room.name) {
                    objective.hitsOverLifeTime = hitsOverLifeTime;
                    objective.toRepair = ids;
                }
            })
        } else {
            const newObjective = this.createMaintainanceObjective(room, ids, hitsOverLifeTime);
            if (newObjective != undefined) {
                this.objectives.push(newObjective)
            }
        }
    }

    private createMaintainanceObjective(room: Room, toRepair: string[], hitsOverLifeTime: number): MaintenanceObjective | undefined {
        // TODO: More dependent on income
        const expendeture = 2
        const maxParts = expendeture / E_FOR_MAINTAINER
        return {
            home: room.name,
            id: `${roleContants.MAINTAINING} ${room.name}`,
            maxIncome: -expendeture,
            target: room.name,
            type: roleContants.MAINTAINING,
            priority: priority.medium,
            maxHaulerParts: 0,
            toRepair: toRepair,
            distance: 0,
            maxWorkParts: maxParts,
            hitsOverLifeTime: hitsOverLifeTime
        }
    }

    private getScoutObjective(room: Room) {
        if (room.memory.scoutPlan === undefined) return;
        const currentObjective = this.objectives.find(objective => objective != undefined && objective.type === roleContants.SCOUTING && objective.home === room.name)
        if (currentObjective != undefined) {
            this.objectives.map(objective => {
                if (objective.home === room.name && objective.type === roleContants.SCOUTING && objective.target === room.name) {
                    if (room.memory.scoutPlan != undefined) {
                        objective.toScout = room.memory.scoutPlan;
                    }
                }
            })
        } else {
            const newObjective = this.createScoutingObjective(room);
            if (newObjective != undefined) {
                this.objectives.push(newObjective)
            }
        }
    }

    private createScoutingObjective(room: Room): ScoutingObjective | undefined {
        if (room.memory.scoutPlan === undefined) return;
        return {
            distance: 0,
            home: room.name,
            id: roleContants.MINING + room.name,
            maxHaulerParts: 0,
            maxIncome: 0,
            priority: priority.severe,
            target: '',
            toScout: room.memory.scoutPlan,
            type: roleContants.SCOUTING
        }
    }

    private getReserverObjective(room: Room) {
        if (room.energyCapacityAvailable >= 650) {
            const miningObjectives = this.objectives.filter(objective => objective != undefined && objective.type === roleContants.MINING && objective.home === room.name)
            let remotes: string[] = [];
            for (let objective of miningObjectives) {
                if (!remotes.find(remote => remote === objective.target && remote != room.name) && objective.target != room.name) {
                    remotes.push(objective.target)
                }
            }
            const currentObjective = this.objectives.find(objective => objective != undefined && objective.type === roleContants.RESERVING && objective.home === room.name)
            if (currentObjective != undefined) {
                this.objectives.map(objective => {
                    if (objective.home === room.name && objective.type === roleContants.RESERVING && objective.target === room.name) {
                        if (room.memory.scoutPlan != undefined) {
                            objective.toReserve = remotes;
                        }
                    }
                })
            } else {
                const newObjective = this.createReserveObjective(room, remotes);
                if (newObjective != undefined) {
                    this.objectives.push(newObjective)
                }
            }

        }
    }

    private createReserveObjective(room: Room, remotes: string[]): ReserveObjective {
        return {
            distance: 0,
            home: room.name,
            id: roleContants.RESERVING,
            maxHaulerParts: 0,
            maxIncome: 0,
            priority: priority.high,
            target: "multiple",
            toReserve: remotes,
            type: roleContants.RESERVING
        }
    }

    private createInvaderDefence(room: Room, infos: InvaderInformation[]) {
        for (let info of infos) {
            info.core.forEach(core => {
                if (!this.objectives.find(o => o != undefined && o.type === roleContants.CORE_KILLER && o.target === core.room.name)) {
                    this.objectives.push(this.createCoreDefence(room, core));
                } else{
                    if (info.core.length === 0) {
                    for (const index in this.objectives) {
                        const objective = this.objectives[index]
                        if (objective != undefined && objective.home === room.name && objective.type === roleContants.CORE_KILLER && info.room === objective.target) {
                            delete this.objectives[index]
                        }
                    }
                }
                }
            });
            if (info.invader.length === 0) continue;
            if (!this.objectives.find(o => o != undefined && o.type === roleContants.INVADER_DEFENCE && o.target === info.room)) {
                const threatLevel = invaderExpert.assessThreatLevel(info.invader);
                switch (threatLevel) {
                    case ("LOW"):
                        this.objectives.push(
                            this.createInvaderDefenceObjective(room, info.room, "LOW", info.invader)
                        )
                        break;
                    case ("MEDIUM"):
                        this.objectives.push(
                            this.createInvaderDefenceObjective(room, info.room, "MEDIUM", info.invader)
                        )
                        break;
                    case ("HIGH"):
                        this.objectives.push(
                            this.createInvaderDefenceObjective(room, info.room, "HIGH", info.invader)
                        )
                        break;
                    case ("CRITICAL"):
                        this.objectives.push(
                            this.createInvaderDefenceObjective(room, info.room, "CRITICAL", info.invader)
                        )
                        break;
                }
            } else {
                if (info.invader.length === 0) {
                    for (const index in this.objectives) {
                        const objective = this.objectives[index]
                        if (objective != undefined && objective.home === room.name && objective.type === roleContants.INVADER_DEFENCE && info.room === objective.target) {
                            delete this.objectives[index]
                        }
                    }
                }
            }
        }
    }

    private createCoreDefence(room: Room, core: StructureInvaderCore): InvaderCoreObjective {
        const attackParts = Math.ceil((core.hitsMax / ATTACK_POWER) / (CREEP_LIFE_TIME - 750))
        return {
            home: room.name,
            id: core.id,
            maxHaulerParts: 0,
            priority: priority.severe,
            target: core.room.name,
            type: roleContants.CORE_KILLER,
            distance: 0,
            maxIncome: 0,
            attackParts
        }
    }

    private createInvaderDefenceObjective(room: Room, roomName: string, threatLvl: string, invader: Creep[]): InvaderDefenceObjective {
        return {
            home: room.name,
            id: `${room.name}_${roleContants.INVADER_DEFENCE}`,
            maxHaulerParts: 0,
            priority: priority.severe,
            target: roomName,
            type: roleContants.INVADER_DEFENCE,
            distance: 0,
            maxIncome: 0,
            threatLevel: threatLvl,
            invader
        }
    }

    private getWallRepair(room: Room) {
        if ((room.controller?.level ?? 0) >= 5) {

        }
    }

    private getExpansionObjective(room: Room) {
        if (room.memory.expansion != undefined) {
            const expansionRoom = Game.rooms[room.memory.expansion];
            if (this.objectives.find(o => o.target === room.memory.expansion && o.type === roleContants.EXPANSIONEER) === undefined) {
                // if (expansionRoom === undefined) return;
                const objective = this.createExpansionObjective(room, room.memory.expansion);
                this.objectives.push(objective)
            } else {
                if (expansionRoom != undefined && expansionRoom.find(FIND_MY_SPAWNS)[0] != undefined) {
                    for (const index in this.objectives) {
                        const objective = this.objectives[index]
                        if (objective.home === room.name && objective.type === roleContants.EXPANSIONEER && room.memory.expansion === objective.target) {
                            delete this.objectives[index]
                        }
                    }
                }
            }
        }
    }

    private createExpansionObjective(room: Room, target: string): ExpansionObjective {
        return {
            home: room.name,
            target,
            id: `${room.name}_${target}`,
            distance: 0,
            maxHaulerParts: 0,
            maxIncome: 0,
            priority: priority.severe,
            type: roleContants.EXPANSIONEER
        }
    }

    syncRoomObjectives(room: Room, creeps: Creep[]): void {
        this.objectives = this.objectives.filter(o => o != undefined)
        const remotes = this.objectives.filter(o =>
            o.home === room.name && o.target != room.name && o.type === roleContants.MINING
        )
        const invaderInfo = invaderExpert.detectNPC(room, remotes)

        this.getUpgradeObjectives(room);
        this.getHaulObjectives(room, this.objectives, creeps);
        this.getConstructionObjectives(room);
        this.getMaintenanceObjective(room);
        this.getScoutObjective(room);
        this.createInvaderDefence(room, invaderInfo);
        this.getExpansionObjective(room);
        this.createMiningObjectives(room, this.objectives);
        this.getReserverObjective(room);

        this.objectives.filter(o => o != undefined).sort((a, b) => a.distance * a.priority - b.distance * a.priority)
        // plus others;
    }

    getRoomObjectives(room: Room) {
        return this.objectives.filter(objective => objective.home === room.name)
    }

    getRoomHaulCapacity(room: Room) {
        const objective = (this.objectives.filter(objective => objective.type === roleContants.HAULING && objective.home === room.name)[0] as HaulingObjective);
        if (objective != undefined) {
            return objective.maxHaulerParts
        }
        return 0
    }
}

type InvaderGroup = { room: string; invader: Creep[] }
