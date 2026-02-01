import BasicCreep from "./creepHelper";

export interface UpgraderMemory extends CreepMemory {
    controllerId: string;
    spawnedRcl: number;
    gotToController?: Boolean;
}

export class Upgrader extends BasicCreep{
    run(creep: Creep) {
        const memory = creep.memory as UpgraderMemory
        const controller: StructureController = Game.getObjectById(memory.controllerId) as StructureController;
        const shouldWork = creep.store.energy > 0;

        this.helpAFriend(creep, memory)

        // if( creep.room.memory.constructionOffice.finished === false){
        //     creep.suicide()
        // }
        if(memory.gotToController === undefined){
            memory.gotToController = false;
        }
        if(!memory.gotToController){
            this.creepPathMove(creep, controller)
        }

        if (creep.pos.getRangeTo(controller.pos.x, controller.pos.y) <= 2 && memory.gotToController === false) {
            if (shouldWork) creep.upgradeController(controller);
            memory.gotToController = true;
        }if (creep.pos.getRangeTo(controller.pos.x, controller.pos.y) < 3 && memory.gotToController === true) {
            if (shouldWork) creep.upgradeController(controller);
        } else {
            if (shouldWork) creep.upgradeController(controller);
            this.creepPathMove(creep, controller)
        }
    }
}
