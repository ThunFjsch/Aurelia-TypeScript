import { BuildingObjective, HaulingObjective, MaintenanceObjective, MiningObjective, Objective, roleContants, UpgradeObjective } from "objectives/objectiveInterfaces";
import { EconomyService } from "services/economy.service";
import { priority } from "utils/sharedTypes";
import { SpawnHauler } from "./spawn/hauler";
import { SpawnMiner } from "./spawn/miner";
import { SpawnUpgrader } from "./spawn/upgrader";
import { SpawnBuiilder } from "./spawn/builder";
import { SpawnMaintainer } from "./spawn/maintenance";
import { SpawnFastFiller } from "./spawn/fastFiller";

const eco = new EconomyService();
const spawnMiner = new SpawnMiner();
const spawnHauler = new SpawnHauler(eco);
const spawnUpgrader = new SpawnUpgrader(eco);
const spawnBuilder = new SpawnBuiilder(eco)
const spawnMaintainer = new SpawnMaintainer();
const spawnFiller = new SpawnFastFiller()

export class SpawnManager {
    run(objectives: Objective[], room: Room, creeps: Creep[]) {
        const unsorted = objectives;
        for (let currentPrio = priority.severe; currentPrio <= priority.low; currentPrio++) {
            let retValue = undefined
            const haul = objectives.filter(objective => objective.priority === currentPrio && objective.type === roleContants.HAULING)
            if (haul.length > 0) retValue = spawnHauler.checkHaulObj(haul as HaulingObjective[], room, unsorted, creeps)

            const miners = objectives.filter(objective => objective.priority === currentPrio && objective.type === roleContants.MINING);
            if (miners.length > 0 && retValue === undefined) retValue = spawnMiner.checkMiningObj(miners as MiningObjective[], room)

            if(retValue === undefined) retValue = spawnFiller.checkFastFiller(room, creeps);

            const build = objectives.filter(objective => objective.priority === currentPrio && objective.type === roleContants.BUILDING);
            if (build.length > 0 && retValue === undefined) retValue = spawnBuilder.checkBuildObj(build as BuildingObjective[], room, objectives)

            const maintenance = objectives.filter(objective => objective.priority === currentPrio && objective.type === roleContants.MAINTAINING);
            if (maintenance.length > 0 && retValue === undefined) retValue = spawnMaintainer.checkMaintenanceObj(maintenance as MaintenanceObjective[], room, creeps)

            const upgrade = objectives.filter(objective => objective.priority === currentPrio && objective.type === roleContants.UPGRADING);
            if (upgrade.length > 0 && retValue === undefined) retValue = spawnUpgrader.checkUpgradeObj(objectives, upgrade as UpgradeObjective[], room)
        }
    }
}

