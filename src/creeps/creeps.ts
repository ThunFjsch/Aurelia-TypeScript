import { roleContants } from "objectives/objectiveInterfaces";
import { Miner } from "./mining";
import { Hauling } from "./hauling";
import { Upgrader } from "./upgrading";
import { ResourceService } from "services/resource.service";

export function runCreeps(){
    Object.entries(Game.creeps).forEach((creep) => {
        creep
    })
}

class Roles {
    mining: Miner;
    hauling: Hauling;
    upgrading: Upgrader;
    constructor(){
        this.mining = new Miner();
        this.hauling = new Hauling();
        this.upgrading = new Upgrader();
        // this.builder = new Builder();
        // this.maintainer= new Maintainer();
        // this.wallRepairer= new WallRepairer();
        // this.claimer = new Claimer();
        // this.fighter = new Fighter();
        // this.healer = new Healer();
        // this.rangedFighter = new FighterRanged();
        // this.scout = new Scout(ScoutInfo);
    }
};

export function runRole(creep: Creep, energyManager: ResourceService){
        const roles: any = new Roles();
        const role: string = creep.memory.role;
        if(roles[role] != undefined){
            roles[role].run(creep, energyManager);
        }
        // else { creep.suicide() }
    }
