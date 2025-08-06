import { HaulingObjective, MiningObjective, Objective, roleContants, UpgradeObjective } from "objectives/objectiveInterfaces";
import { EconomyService } from "services/economy.service";
import { priority } from "utils/sharedTypes";
import { SpawnHauler } from "./hauler";
import { SpawnMiner } from "./miner";
import { SpawnUpgrader } from "./upgrader";

const eco = new EconomyService();
const spawnMiner = new SpawnMiner();
const spawnHauler = new SpawnHauler(eco);
const spawnUpgrader = new SpawnUpgrader(eco);

export class SpawnManager {
    run(objectives: Objective[], room: Room) {
        const unsorted = objectives;
        for (let currentPrio = priority.severe; currentPrio < priority.low; currentPrio++) {
            const haul = objectives.filter(objective => objective.priority === currentPrio && objective.type === roleContants.HAULING)
            if (haul.length > 0) spawnHauler.checkHaulObj(haul as HaulingObjective[], room, unsorted)

            const temp = objectives.filter(objective => objective.priority === currentPrio && objective.type === roleContants.MINING);
            if (temp.length > 0) spawnMiner.checkMiningObj(temp as MiningObjective[], room)

            const upgrade = objectives.filter(objective => objective.priority === currentPrio && objective.type === roleContants.UPGRADING);
            if (upgrade.length > 0) spawnUpgrader.checkUpgradeObj(upgrade as UpgradeObjective[], room)
        }
    }
}

