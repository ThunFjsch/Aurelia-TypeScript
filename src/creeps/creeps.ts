import { roleContants } from "objectives/objectiveInterfaces";
import { Miner } from "./mining";
import { Hauling } from "./hauling";
import { Upgrader } from "./upgrading";
import { ResourceService } from "services/resource.service";
import { Building } from "./building";
import { Maintaining } from "./maintaining";
import { ObjectiveManager } from "objectives/objectiveManager";
import { FastFilling } from "./fastFilling";

export function runCreeps(){
    Object.entries(Game.creeps).forEach((creep) => {
        creep
    })
}

class Roles {
    mining: Miner;
    hauling: Hauling;
    upgrading: Upgrader;
    building: Building;
    maintaining: Maintaining;
    fastfiller: FastFilling
    constructor(objectiveManager: ObjectiveManager){
        this.mining = new Miner();
        this.hauling = new Hauling();
        this.upgrading = new Upgrader();
        this.building = new Building();
        this.maintaining = new Maintaining(objectiveManager);
        this.fastfiller = new FastFilling();
        // this.wallRepairer= new WallRepairer();
        // this.claimer = new Claimer();
        // this.fighter = new Fighter();
        // this.healer = new Healer();
        // this.rangedFighter = new FighterRanged();
        // this.scout = new Scout(ScoutInfo);
    }
};

export function runRole(creep: Creep, energyManager: ResourceService, objectiveManager: ObjectiveManager){
        const roles: any = new Roles(objectiveManager);
        const role: string = creep.memory.role;
        if(roles[role] != undefined){
            roles[role].run(creep, energyManager);
        }
        // else { creep.suicide() }
    }
