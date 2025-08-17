import { priority } from "utils/sharedTypes";
import { Objective, MiningObjective, HaulingObjective, UpgradeObjective, roleContants, BuildingObjective, MaintenanceObjective, ScoutingObjective } from "./objectiveInterfaces";
import { EconomyService, HAULER_MULTIPLIER } from "services/economy.service";
import { PathingService } from "services/pathing.service";
import { getCurrentConstruction } from "roomManager/constructionManager";

const pathing = new PathingService();
const economy = new EconomyService()

export class ObjectiveManager {
    objectives: Objective[];

    constructor() {
        this.objectives = []
    }

    // Adds mining Objectives to the Objectives list
    private createMiningObjectives(room: Room): void {
        if (Memory.respawn) return;
        for (const [index, source] of Memory.sourceInfo.entries()) {
            if (this.objectives.find(obj => obj.id === source.id) != undefined) continue;
            if(source.ePerTick === undefined || source.maxWorkParts === undefined || source.maxHaulerParts === undefined || source.maxIncome === undefined) return;
            let objective: MiningObjective | undefined = undefined;
            if (source.home === room.name) {
                objective = {
                    id: source.id,
                    sourceId: source.id,
                    priority: priority.high,
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

            if (objective === undefined) continue;
            this.objectives.push(objective);
        }
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
            priority: priority.medium,
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
        return {
            home: room.name,
            id: `${roleContants.MAINTAINING} ${room.name}`,
            maxIncome: -2,
            target: room.name,
            type: roleContants.MAINTAINING,
            priority: priority.medium,
            maxHaulerParts: 0,
            toRepair: toRepair,
            distance: 0,
            maxWorkParts: 2,
            hitsOverLifeTime: hitsOverLifeTime
        }
    }

    private getScoutObjective(room: Room) {
       if(room.memory.scoutPlan === undefined) return;
        const currentObjective = this.objectives.find(objective => objective != undefined && objective.type === roleContants.SCOUTING && objective.home === room.name)
        if (currentObjective != undefined) {
            this.objectives.map(objective => {
                if (objective.home === room.name && objective.type === roleContants.SCOUTING && objective.target === room.name) {
                    if(room.memory.scoutPlan != undefined){
                        objective.toScout = room.memory.scoutPlan;
                    }
                }
            })
        } else {
            const newObjective = this.createScoutingObjective(room);
            if(newObjective != undefined){
                this.objectives.push(newObjective)
            }
        }
    }

    private createScoutingObjective(room: Room): ScoutingObjective | undefined{
        if(room.memory.scoutPlan === undefined) return;
        return {
            distance: 0,
            home: room.name,
            id: roleContants.MINING+room.name,
            maxHaulerParts: 0,
            maxIncome: 0,
            priority: priority.high,
            target: '',
            toScout: room.memory.scoutPlan,
            type: roleContants.SCOUTING
        }
    }

    syncRoomObjectives(room: Room): void {
        this.createMiningObjectives(room);
        this.getUpgradeObjectives(room);
        this.getHaulObjectives(room, this.objectives);
        this.getConstructionObjectives(room);
        this.getMaintenanceObjective(room);
        this.getScoutObjective(room)
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
