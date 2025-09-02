import { roleContants } from "objectives/objectiveInterfaces";
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
    fastfiller: FastFilling;
    scouting: Scouting;
    reserving: Reserving;
    porting: Porting;
    coreKiller: CoreKiller;
    blinkie: Blinkie;
    claimer: Claimer;
    pioneer: Pioneer;
    constructor(objectiveManager: ObjectiveManager){
        this.mining = new Miner();
        this.hauling = new Hauling();
        this.upgrading = new Upgrader();
        this.building = new Building();
        this.maintaining = new Maintaining(objectiveManager);
        this.fastfiller = new FastFilling();
        this.scouting = new Scouting();
        this.reserving = new Reserving();
        this.porting = new Porting();
        this.coreKiller = new CoreKiller();
        this.blinkie = new Blinkie();
        this.claimer = new Claimer();
        this.pioneer = new Pioneer();
        // this.wallRepairer= new WallRepairer();
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
