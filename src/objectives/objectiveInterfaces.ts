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
  my: boolean;
}

export interface HaulingObjective extends BaseObjective {
  type: roleContants.HAULING;
  capacityRequired: number;
  currParts: number;
}

export interface UpgradeObjective extends BaseObjective {
  type: roleContants.UPGRADING;
  controllerId: Id<StructureController>;
  netEnergyIncome: number;
  path: RoomPosition[];
}

export interface BuildingObjective extends BaseObjective {
  type: roleContants.BUILDING;
  path?: RoomPosition[];
  targetId: string;
  progress: number;
  progressTotal: number;
}

export interface MaintenanceObjective extends BaseObjective {
  type: roleContants.MAINTAINING;
  toRepair: string[];
  maxWorkParts: number;
  hitsOverLifeTime: number;
}

export interface ScoutingObjective extends BaseObjective {
  type: roleContants.SCOUTING;
  toScout: ScoutPlan[];
}

export interface ReserveObjective extends BaseObjective {
  type: roleContants.RESERVING;
  toReserve: string[];
}

export interface InvaderCoreObjective extends BaseObjective {
  type: roleContants.CORE_KILLER;
  attackParts: number;
}

export interface InvaderDefenceObjective extends BaseObjective {
  type: roleContants.INVADER_DEFENCE;
  threatLevel: string;
  invader: Creep[];
}

export interface ExpansionObjective extends BaseObjective {
  type: roleContants.EXPANSIONEER;
}

export interface WallRepairObjective extends BaseObjective {
  type: roleContants.WALLREPAIRER;
  maxWorkParts: number;
}

export type Objective =
  | MiningObjective
  | HaulingObjective
  | UpgradeObjective
  | BuildingObjective
  | MaintenanceObjective
  | ScoutingObjective
  | ReserveObjective
  | InvaderCoreObjective
  | InvaderDefenceObjective
  | ExpansionObjective
  | WallRepairObjective
  | RemoteBuildingObjective;

export type ObjectiveType =
  | roleContants.MINING
  | roleContants.HAULING
  | roleContants.UPGRADING
  | roleContants.BUILDING
  | roleContants.MAINTAINING
  | roleContants.SCOUTING
  | roleContants.RESERVING
  | roleContants.PORTING
  | roleContants.CORE_KILLER
  | roleContants.INVADER_DEFENCE
  | roleContants.EXPANSIONEER
  | roleContants.WALLREPAIRER
  | roleContants.REMOTE_BUILDING;

export enum roleContants {
  MINING = "mining",
  HAULING = "hauling",
  UPGRADING = "upgrading",
  BUILDING = "building",
  MAINTAINING = "maintaining",
  FASTFILLER = "fastfiller",
  SCOUTING = "scouting",
  RESERVING = "reserving",
  PORTING = "porting",
  CORE_KILLER = "coreKiller",
  INVADER_DEFENCE = "invaderDefence",
  BLINKIE = "blinkie",
  EXPANSIONEER = "expansioneer",
  CLAIMER = "claimer",
  PIONEER = "pioneer",
  WALLREPAIRER = "wallrepair",
  REMOTE_BUILDING = "remoteBuilding"
}

export interface RemoteBuildingObjective extends BaseObjective {
  type: roleContants.REMOTE_BUILDING;
  targetRoom: string;
  containerPhase: boolean;
}
