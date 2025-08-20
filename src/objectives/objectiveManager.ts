import { Priority, priority } from "utils/sharedTypes";
import { Objective, MiningObjective, HaulingObjective, UpgradeObjective, roleContants, BuildingObjective, MaintenanceObjective, ScoutingObjective, ReserveObjective } from "./objectiveInterfaces";
import { E_FOR_MAINTAINER, EconomyService, HAULER_MULTIPLIER } from "services/economy.service";
import { PathingService } from "services/pathing.service";
import { getCurrentConstruction } from "roomManager/constructionManager";
import { ScoutingService } from "services/scouting.service";

const pathing = new PathingService();
const economy = new EconomyService()

export class ObjectiveManager {
    objectives: Objective[];
    scoutingService: ScoutingService;

    constructor(ScoutingService: ScoutingService) {
        this.objectives = []
        this.scoutingService = ScoutingService
    }

    // Adds mining Objectives to the Objectives list
    private createMiningObjectives(room: Room): void {
        if (Memory.respawn) return;
        if (Memory.sourceInfo === undefined || Memory.sourceInfo.length === 0) return;
        // TODO: Make this smarter. Only run it ones.
        if (Memory.sourceInfo.length > 1) Memory.sourceInfo = Memory.sourceInfo.sort((a, b) => (b.maxIncome ?? 0) - (a.maxIncome ?? 0))

        for (let [index, source] of Memory.sourceInfo.entries()) {
            // Updates the objective info of the state diveates from the sourceInfo
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
            };


            // TODO: Make the constrains of the amount of objectives defined by spawn time utilisation and cpu available to the room.
            const amountOfMiningObj = this.objectives.filter(objective => objective.home === room.name && objective.type === roleContants.MINING).length
            if (amountOfMiningObj > 8) continue;

            const objective = this.creatingMineObjective(room, source)
            if (objective === undefined) continue;
            this.objectives.push(objective);
        }
    }

    private creatingMineObjective(room: Room, source: SourceInfo) {

        if (source.ePerTick === undefined || source.maxWorkParts === undefined || source.maxHaulerParts === undefined || source.maxIncome === undefined) return;
        let objective: MiningObjective | undefined = undefined;
        let prio: Priority = priority.high
        if (source.roomName != room.name) {
            prio = priority.low;
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
    private getHaulObjectives(room: Room, list: Objective[]) {
        let haulerCapacity = 0
        list.filter(objective => objective.home === room.name)
            .map(objective => {
                haulerCapacity += (objective.maxHaulerParts);
            })
        if (haulerCapacity === 0) return;
        const currentHaulObjective = this.objectives.find(objective => objective.type === roleContants.HAULING && objective.target === room.name);
        if (currentHaulObjective != undefined) {
            this.objectives.map(objective => {
                if (objective.home === room.name && objective.type === roleContants.HAULING && objective.target === room.name) {
                    objective = this.createHaulObjective(room, haulerCapacity * HAULER_MULTIPLIER);
                }
            })
        } else if (room.memory.isOwned) {
            this.objectives.push(this.createHaulObjective(room, haulerCapacity * HAULER_MULTIPLIER))
        }
    }

    private createHaulObjective(room: Room, haulerCapacity: number): HaulingObjective {
        return {
            id: `${room.name} ${roleContants.HAULING}`,
            capacityRequired: haulerCapacity * CARRY_CAPACITY,
            maxHaulerParts: haulerCapacity,
            home: room.name,
            target: room.name,
            priority: priority.medium,
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
        const route = pathing.findPath(room.find(FIND_MY_SPAWNS)[0].pos, controller.pos)
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
            priority: priority.low,
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
        const route = pathing.findPath(room.find(FIND_MY_SPAWNS)[0].pos, cSite.pos)
        if (route === undefined) return
        const energyPerTick = economy.getCurrentRoomIncome(room, this.getRoomObjectives(room));

        return {
            home: room.name,
            id: `${roleContants.BUILDING} ${room.name}`,
            maxIncome: -(energyPerTick - ((energyPerTick / 6) * 2)),
            target: room.name,
            targetId: cSite.id,
            progress: cSite.progress,
            progressTotal: cSite.progressTotal,
            type: roleContants.BUILDING,
            priority: priority.high,
            maxHaulerParts: energyPerTick * (route.cost / CARRY_CAPACITY),
            path: route.path,
            distance: route.cost
        }
    }

    private getMaintenanceObjective(room: Room) {
        const toRepair = room.find(FIND_STRUCTURES).filter(structure => structure.hits < structure.hitsMax && structure.structureType != STRUCTURE_WALL && structure.structureType != STRUCTURE_RAMPART);
        let hitsToRepair = 0;
        let totalHits = 0;
        let ids: string[] = []
        if (toRepair.length === 0) return;
        toRepair.forEach(structure => {
            hitsToRepair += structure.hitsMax - structure.hits;
            totalHits += structure.hitsMax;
            ids.push(structure.id)
        });
        const hitsOverLifeTime = totalHits / CREEP_LIFE_TIME;
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
        const expendeture = 4
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
            priority: priority.high,
            target: '',
            toScout: room.memory.scoutPlan,
            type: roleContants.SCOUTING
        }
    }

    private getReserverObjective(room: Room) {
        if (room.energyCapacityAvailable >= 650) {
            const miningObjectives = this.objectives.filter(objective => objective != undefined && objective.type === roleContants.MINING)
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
            priority: priority.medium,
            target: "multiple",
            toReserve: remotes,
            type: roleContants.RESERVING
        }
    }

    syncRoomObjectives(room: Room): void {
        this.createMiningObjectives(room);
        this.getUpgradeObjectives(room);
        this.getHaulObjectives(room, this.objectives);
        this.getConstructionObjectives(room);
        this.getMaintenanceObjective(room);
        this.getScoutObjective(room);
        this.getReserverObjective(room);
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
