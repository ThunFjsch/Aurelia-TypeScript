import { Objective } from "objectives/objectiveInterfaces";

export interface InvaderInformation {
    room: string;
    invader: Creep[];
    core: StructureInvaderCore[]
}

export class InvaderExpert {
    detectNPC(room: Room, remotes: Objective[]): InvaderInformation[] {
        let finished: string[] = [];
        let info = [this.createHostileInformation(room)];
        for(let remote of remotes){
            if(finished.find(name => name === remote.target)) continue;
            const remoteRoom = Game.rooms[remote.target];
            if(remoteRoom != undefined){
                info.push(this.createHostileInformation(remoteRoom))
            }
        }

        return info;
    }

    createHostileInformation(room: Room): InvaderInformation{
        return {
            room: room.name,
            core: this.findCore(room),
            invader: this.findInvader(room)
        }
    }

    private findCore(room: Room) {
        return room.find(FIND_HOSTILE_STRUCTURES).filter(structure => structure.structureType === STRUCTURE_INVADER_CORE) as StructureInvaderCore[]
    }

    private findInvader(room: Room): Creep[] {
        return room.find(FIND_HOSTILE_CREEPS).filter(creep => creep.owner.username === "Invader");
    }

    private findSourceKeeper() {

    }
}
