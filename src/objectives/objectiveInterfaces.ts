export interface BaseObjective {
    id: string;
    type: ObjectiveType;
    home: string;
    target: string;
    priority: number;
    maxHaulerParts: number;
    maxIncome: number;
}

export interface MiningObjective extends BaseObjective {
    type: roleContants.MINING;
    sourceId: Id<Source>;
    pathDistance: number;
    requiredWorkParts: number;
    energyPerTick: number;
    maxWorkParts: number;
    distance?: number;
    spots: number;
    path?: RoomPosition[];
}

export interface HaulingObjective extends BaseObjective {
    type: roleContants.HAULING;
    capacityRequired: number;
}

export interface UpgradeObjective extends BaseObjective {
    type: roleContants.UPGRADING;
    controllerId: Id<StructureController>;
    netEnergyIncome: number;
}

// ... other objective types for defense, claiming, expansion, etc.

export type Objective = MiningObjective | HaulingObjective | UpgradeObjective;
export type ObjectiveType = roleContants.MINING | roleContants.HAULING | roleContants.UPGRADING

export enum roleContants {
    MINING = 'mining',
    HAULING = 'hauling',
    UPGRADING = 'upgrading'
}
