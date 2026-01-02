import { ResourceService, ResRole } from "services/resource.service";
import BasicCreep from "./creepHelper";

export interface HaulerMemory extends CreepMemory {
    target?: any;
    take: ResRole;
    onRoute: boolean;
}

export class Hauling extends BasicCreep {
    run(creep: Creep, energyManager: ResourceService) {
        let memory = creep.memory as HaulerMemory;
        let needsMemoryUpdate = false;

        if (creep.store.energy < (creep.store.getCapacity() / 3) + 1) {
            this.getEnergy(creep, memory, energyManager);
        } else {
            if (!memory.target) {
                const newTarget = energyManager.assignToTask(creep, "transfer");
                if (newTarget) {
                    memory.target = newTarget;
                    memory.onRoute = true;
                    needsMemoryUpdate = true;
                } else{
                    // Use cached spawn ID instead of finding it every tick
                    const spawn = Game.getObjectById(memory.homeSpawn) as StructureSpawn | null;
                    if (spawn) {
                        if (creep.pos.getRangeTo(spawn.pos) <= 5) {
                        } else {
                            this.creepPathMove(creep, spawn);
                        }
                    }
                }
            } else {
                const spawn = Game.getObjectById(memory.homeSpawn)
                if(creep.memory.home != creep.room.name && spawn != undefined){
                    this.creepPathMove(creep, spawn as AnyStructure)
                } else{
                    this.doTransfer(creep, energyManager);
                }
            }
        }

        if (needsMemoryUpdate) {
            creep.memory = memory;
        }
    }

}
