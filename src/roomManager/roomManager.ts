export interface RoomManager{
    ownedRooms: string[]
}

export class RoomManager{
    constructor(){}

    run(){
        for(let index in Memory.myRooms){
            const roomName = Memory.myRooms[index];
            const room = Game.rooms[roomName];

            // if(room.memory){

            // }
        }
    }
}
