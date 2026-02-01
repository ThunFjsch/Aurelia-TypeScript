export type PlacedStructure = {
  type: StructureConstant;
  x: number;
  y: number;
  priority?: number;
  requiredRCL?: number;
  roadPriority?: RoadPriority;
};

export interface ScoredPoint {
  x: number;
  y: number;
  score: number;
}

export interface RemoteRoomInfrastructure {
  roomName: string;
  originRoom: string;
  requiredRCL: number;
}

export enum RoadPriority {
  CRITICAL = 1, // Spawn to sources/controller
  HIGH = 2, // Core structure connections
  MEDIUM = 3, // Extensions and supporting structures
  LOW = 4, // Cosmetic and late-game structures
  REMOTE = 5 // Remote room connections
}
