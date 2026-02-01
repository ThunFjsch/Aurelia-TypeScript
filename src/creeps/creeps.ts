import { Miner } from "./mining";
import { Hauling } from "./hauling";
import { Upgrader } from "./upgrading";
import { ResourceService } from "services/resource.service";
import { Building } from "./building";
import { Maintaining } from "./maintaining";
import { ObjectiveManager } from "objectives/objectiveManager";
import { FastFilling } from "./fastFilling";
import { Scouting } from "./scouting";
import { Reserving } from "./reserving";
import { Porting } from "./porting";
import { CoreKiller } from "./coreKiller";
import { Blinkie } from "./blinkie";
import { Claimer } from "./claimer";
import { Pioneer } from "./pioneer";
import { PathCachingService } from "services/pathCaching.service";
import { WallRepair } from "./wallrepair";
import { RemoteBuilding } from "./remoteBuilding";

class Roles {
  mining: Miner;
  hauling: Hauling;
  upgrading: Upgrader;
  building: Building;
  maintaining: Maintaining;
  fastfiller: FastFilling;
  scouting: Scouting;
  reserving: Reserving;
  porting: Porting;
  coreKiller: CoreKiller;
  blinkie: Blinkie;
  claimer: Claimer;
  pioneer: Pioneer;
  remoteBuilding: RemoteBuilding;
  wallrepair: WallRepair;
  constructor(objectiveManager: ObjectiveManager, pathCaching: PathCachingService) {
    this.mining = new Miner(pathCaching);
    this.hauling = new Hauling(pathCaching);
    this.upgrading = new Upgrader(pathCaching);
    this.building = new Building(pathCaching);
    this.maintaining = new Maintaining(objectiveManager, pathCaching);
    this.fastfiller = new FastFilling(pathCaching);
    this.scouting = new Scouting(pathCaching);
    this.reserving = new Reserving(pathCaching);
    this.porting = new Porting(pathCaching);
    this.coreKiller = new CoreKiller(pathCaching);
    this.blinkie = new Blinkie(pathCaching);
    this.claimer = new Claimer(pathCaching);
    this.pioneer = new Pioneer(pathCaching);
    this.remoteBuilding = new RemoteBuilding(pathCaching);
    this.wallrepair = new WallRepair(objectiveManager, pathCaching);
  }
}

// Cache the Roles instance to avoid recreating it every tick
let cachedRoles: Roles | null = null;
let cachedObjectiveManager: ObjectiveManager | null = null;
let cachedPathCaching: PathCachingService | null = null;

export function runRole(
  creep: Creep,
  energyManager: ResourceService,
  objectiveManager: ObjectiveManager,
  pathCaching: PathCachingService
) {
  // Only recreate Roles if dependencies changed
  if (!cachedRoles || cachedObjectiveManager !== objectiveManager || cachedPathCaching !== pathCaching) {
    cachedRoles = new Roles(objectiveManager, pathCaching);
    cachedObjectiveManager = objectiveManager;
    cachedPathCaching = pathCaching;
  }

  const roles: any = cachedRoles;
  const role: string = creep.memory.role;
  if (roles[role] != undefined) {
    roles[role].run(creep, energyManager);
    roles[role].chanting(creep);
    roles[role].checkForFastFillerSpot(creep);
  }
  // else { creep.suicide() }
}
