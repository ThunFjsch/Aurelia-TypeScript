import { priority } from "utils/sharedTypes";
import { Objective, MiningObjective, HaulingObjective, UpgradeObjective, roleContants } from "./objectiveInterfaces";
import { EconomyService } from "services/economy.service";
import { PathingService } from "services/pathing.service";

const pathing = new PathingService();
const economy = new EconomyService()

export class ObjectiveManager {
    objectives: Objective[];
    objectCounter = 0;

    constructor() {
        this.objectives = []
        this.objectCounter = ++this.objectCounter;
        console.log(this.objectCounter)
    }

    // Adds mining Objectives to the Objectives list
    private createMiningObjectives(room: Room): void {
        if (Memory.respawn) return;
        for (const [index, source] of Memory.sourceInfo.entries()) {
            if (this.objectives.find(obj => obj.id === source.id) != undefined) continue;

            let objective: MiningObjective | undefined = undefined;
            if (source.roomName === room.name) {
                objective = {
                    id: source.id,
                    sourceId: source.id,
                    priority: priority.high,
                    home: room.name,
                    target: room.name,
                    spots: source.spots,
                    pathDistance: source.distance ?? Infinity,
                    energyPerTick: source.ePerTick,
                    maxIncome: source.maxIncome,
                    maxWorkParts: source.maxWorkParts,
                    requiredWorkParts: source.maxWorkParts,
                    maxHaulerParts: source.maxHaulerParts,
                    distance: source.distance,
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
                    objective = this.createHaulObjective(room, haulerCapacity);
                }
            })
        }
        if (room.memory.isOwned) {
            this.objectives.push(this.createHaulObjective(room, haulerCapacity))
        }
    }

    private createHaulObjective(room: Room, haulerCapacity: number): HaulingObjective {
        return {
            id: `${room.name} ${roleContants.HAULING}`,
            capacityRequired: haulerCapacity,
            maxHaulerParts: haulerCapacity ,
            home: room.name,
            target: room.name,
            priority: priority.medium,
            type: roleContants.HAULING,
            maxIncome: 0
        }
    }

    private getUpgradeObjectives(room: Room) {
        const objective = this.objectives.find(objective => objective.home === room.name && objective.type === roleContants.UPGRADING);
        const controller = room.controller;
        if (controller === undefined) return;
        if (objective != undefined) {
            this.objectives.map(objective => {
                if (objective.home === room.name && objective.type === roleContants.UPGRADING && objective.target === room.name) {
                    const newObjective = this.createUpgradingObjective(room, controller);
                    if (newObjective != undefined) {
                        objective = newObjective
                    }
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
        const energyPerTick = economy.getCurrentRoomIncome(room);

        return {
            controllerId: controller.id,
            home: room.name,
            id: `${roleContants.UPGRADING} ${room.name}`,
            maxIncome: 0,
            target: room.name,
            type: roleContants.UPGRADING,
            priority: priority.medium,
            netEnergyIncome: energyPerTick,
            maxHaulerParts: energyPerTick * (route.cost / CARRY_CAPACITY),
            path: route.path,
            distance:route.cost
        }
    }

    syncRoomObjectives(room: Room): void {
        this.createMiningObjectives(room);
        this.getUpgradeObjectives(room);
        this.getHaulObjectives(room, this.objectives    );
        // plus others;
    }

    getRoomObjectives(room: Room) {
        return this.objectives.filter(objective => objective.home === room.name)
    }

    getRoomHaulCapacity(room: Room){
        return (this.objectives.filter(objective => objective.type === roleContants.HAULING && objective.home === room.name)[0] as HaulingObjective).maxHaulerParts
    }
}
