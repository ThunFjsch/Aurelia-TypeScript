export interface BaseObjective {
    id: string;
    type: ObjectiveType;
    home: string;
    target: string;
    priority: number;
    maxHaulerParts: number;
    maxIncome: number;
    distance: number;
}

export interface MiningObjective extends BaseObjective {
    type: roleContants.MINING;
    sourceId: Id<Source>;
    pathDistance: number;
    requiredWorkParts: number;
    energyPerTick: number;
    maxWorkParts: number;
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
    path: RoomPosition[]
}

export interface BuildingObjective extends BaseObjective{
    type: roleContants.BUILDING;
    path?: RoomPosition[];
    targetId: string;
    progress: number;
    progressTotal:number;
}

export interface MaintenanceObjective extends BaseObjective{
    type:roleContants.MAINTAINING;
    toRepair: string[];
    maxWorkParts: number;
    hitsOverLifeTime: number;
}

// ... other objective types for defense, claiming, expansion, etc.

export type Objective = MiningObjective | HaulingObjective | UpgradeObjective | BuildingObjective | MaintenanceObjective;
export type ObjectiveType = roleContants.MINING | roleContants.HAULING | roleContants.UPGRADING | roleContants.BUILDING | roleContants.MAINTAINING

export enum roleContants {
    MINING = 'mining',
    HAULING = 'hauling',
    UPGRADING = 'upgrading',
    BUILDING = 'building',
    MAINTAINING = 'maintaining',
    FASTFILLER = "fastfiller"
}
