
type RCL = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type StructureAmount = Partial<Record<StructureConstant, number>>;

type RCLAvailableStructures = Record<number, StructureAmount>;

const rclAvailableStructures:RCLAvailableStructures = {
    1: {
        [STRUCTURE_SPAWN]: 1,
    },
    2: {
        [STRUCTURE_EXTENSION]: 5,
        [STRUCTURE_CONTAINER]: 4,
    },
    3: {
        [STRUCTURE_EXTENSION]: 10,
        [STRUCTURE_CONTAINER]: 4,
        [STRUCTURE_TOWER]: 1,
    },
    4: {
        [STRUCTURE_EXTENSION]: 20,
        [STRUCTURE_CONTAINER]: 5,
        [STRUCTURE_TOWER]: 1,
        [STRUCTURE_STORAGE]: 1,
        [STRUCTURE_ROAD]: Infinity
    },
    5: {
        [STRUCTURE_EXTENSION]: 30,
        [STRUCTURE_CONTAINER]: 5,
        [STRUCTURE_TOWER]: 2,
        [STRUCTURE_STORAGE]: 1,
        [STRUCTURE_ROAD]: Infinity,
        [STRUCTURE_RAMPART]: Infinity
    },
    6: {
        [STRUCTURE_EXTENSION]: 40,
        [STRUCTURE_CONTAINER]: 5,
        [STRUCTURE_TOWER]: 2,
        [STRUCTURE_STORAGE]: 1,
        [STRUCTURE_ROAD]: Infinity,
        [STRUCTURE_RAMPART]: Infinity,
        [STRUCTURE_EXTRACTOR]: 1,
        [STRUCTURE_LAB]: 3,
        [STRUCTURE_TERMINAL]:1
    },
    7: {
        [STRUCTURE_EXTENSION]: 50,
        [STRUCTURE_CONTAINER]: 5,
        [STRUCTURE_TOWER]: 3,
        [STRUCTURE_STORAGE]: 1,
        [STRUCTURE_ROAD]: Infinity,
        [STRUCTURE_RAMPART]: Infinity,
        [STRUCTURE_EXTRACTOR]: 1,
        [STRUCTURE_LAB]: 6,
        [STRUCTURE_TERMINAL]:1,
        [STRUCTURE_FACTORY]: 1
    },
    8: {
        [STRUCTURE_EXTENSION]: 60,
        [STRUCTURE_CONTAINER]: 5,
        [STRUCTURE_TOWER]: 6,
        [STRUCTURE_STORAGE]: 1,
        [STRUCTURE_ROAD]: Infinity,
        [STRUCTURE_RAMPART]: Infinity,
        [STRUCTURE_EXTRACTOR]: 1,
        [STRUCTURE_LAB]: 10,
        [STRUCTURE_TERMINAL]:1,
        [STRUCTURE_FACTORY]: 1,
        [STRUCTURE_OBSERVER]: 1,
        [STRUCTURE_POWER_SPAWN]: 1,
        [STRUCTURE_NUKER]: 1
    }
}

function foo(){

            // let plannedCSites = []
            // if(basePlanner.stamps === undefined) continue;

            // const rcl: number | undefined = room.controller?.level;
            // if(rcl != undefined){

            //     rclAvailableStructures[rcl]
            // }

}
