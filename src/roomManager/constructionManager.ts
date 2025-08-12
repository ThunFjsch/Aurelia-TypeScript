export type RCL = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type StructureAmount = Partial<Record<StructureConstant, number>>;

type RCLAvailableStructures = Record<number, StructureAmount>;

const rclAvailableStructures: RCLAvailableStructures = {
    1: {
        [STRUCTURE_SPAWN]: 1,
    },
    2: {
        [STRUCTURE_EXTENSION]: 5,
        [STRUCTURE_CONTAINER]: 5,
    },
    3: {
        [STRUCTURE_EXTENSION]: 10,
        [STRUCTURE_CONTAINER]: 5,
        [STRUCTURE_TOWER]: 1,
        [STRUCTURE_ROAD]: 30
    },
    4: {
        [STRUCTURE_EXTENSION]: 20,
        [STRUCTURE_CONTAINER]: 5,
        [STRUCTURE_TOWER]: 1,
        [STRUCTURE_STORAGE]: 1,
        [STRUCTURE_ROAD]: 50,
    },
    5: {
        [STRUCTURE_EXTENSION]: 30,
        [STRUCTURE_CONTAINER]: 5,
        [STRUCTURE_TOWER]: 2,
        [STRUCTURE_STORAGE]: 1,
        [STRUCTURE_ROAD]: 0,
        [STRUCTURE_RAMPART]: Infinity
    },
    6: {
        [STRUCTURE_EXTENSION]: 40,
        [STRUCTURE_CONTAINER]: 5,
        [STRUCTURE_TOWER]: 2,
        [STRUCTURE_STORAGE]: 1,
        [STRUCTURE_ROAD]: 300,
        [STRUCTURE_RAMPART]: Infinity,
        [STRUCTURE_EXTRACTOR]: 1,
        [STRUCTURE_LAB]: 3,
        [STRUCTURE_TERMINAL]: 1
    },
    7: {
        [STRUCTURE_EXTENSION]: 50,
        [STRUCTURE_CONTAINER]: 5,
        [STRUCTURE_TOWER]: 3,
        [STRUCTURE_STORAGE]: 1,
        [STRUCTURE_ROAD]: 300,
        [STRUCTURE_RAMPART]: Infinity,
        [STRUCTURE_EXTRACTOR]: 1,
        [STRUCTURE_LAB]: 6,
        [STRUCTURE_TERMINAL]: 1,
        [STRUCTURE_FACTORY]: 1
    },
    8: {
        [STRUCTURE_EXTENSION]: 60,
        [STRUCTURE_CONTAINER]: 5,
        [STRUCTURE_TOWER]: 6,
        [STRUCTURE_STORAGE]: 1,
        [STRUCTURE_ROAD]: 300,
        [STRUCTURE_RAMPART]: Infinity,
        [STRUCTURE_EXTRACTOR]: 1,
        [STRUCTURE_LAB]: 10,
        [STRUCTURE_TERMINAL]: 1,
        [STRUCTURE_FACTORY]: 1,
        [STRUCTURE_OBSERVER]: 1,
        [STRUCTURE_POWER_SPAWN]: 1,
        [STRUCTURE_NUKER]: 1
    }
}

export function constructionManager(room: Room) {
    if (room.memory.constructionOffice === undefined) return;

    const controller = room.controller;
    if (!controller) return;

    const rcl = controller.level as RCL;

    if (room.memory.constructionOffice.lastJob < rcl && room.memory.constructionOffice.finished && room.memory.constructionOffice.plans.length === 0) {
        // createConstructionPlan(room, rcl);
    }
    else if (room.memory.constructionOffice.lastJob === rcl && room.memory.constructionOffice.finished == false && room.memory.constructionOffice.plans.length === 0) {
        room.memory.constructionOffice.finished = true;
    }
    else if (room.memory.constructionOffice.lastJob === rcl && room.memory.constructionOffice.finished == false && room.memory.constructionOffice.plans.length > 0) {
        const cSites = room.find(FIND_CONSTRUCTION_SITES);
        if (cSites != undefined && cSites.length === 0) {
            const nextPlan = room.memory.constructionOffice.plans[0]
            const build = room.createConstructionSite(nextPlan.x, nextPlan.y, nextPlan.type as BuildableStructureConstant)
            if (build === ERR_INVALID_TARGET || build === ERR_RCL_NOT_ENOUGH) {
                room.memory.constructionOffice.plans.shift()
            }
        }
    } else if (room.memory.constructionOffice.finished && room.memory.constructionOffice.lastJob === rcl) {
        if(Game.time % 1000 === 0){
            checkForFinish(room, rcl);
        }
    }
}

function checkForFinish(room: Room, rcl: RCL) {
    const structures = room.find(FIND_STRUCTURES);
    const currentStructures: StructureAmount = getCurrentStructures(structures);
    const remainingStructure = getRemainingStructure(rcl, currentStructures);
    const memory = room.memory
    for (let index in remainingStructure) {
        let remaining = remainingStructure[index as StructureConstant]?.valueOf() ?? 0;
        if (0 < remaining) {
            if(memory.basePlanner.stamps === undefined){
                memory.basePlanner.stamps = []
            }
            for(let stamp of memory.basePlanner.stamps){
                if(stamp.type != index) continue;
                const structures = room.lookAt(stamp.x, stamp.y).find(look => look.structure?.structureType === index && look.structure?.structureType === stamp.type);
                if (remaining > 0 && structures === undefined) {
                    console.log("stamp" +JSON.stringify(stamp))
                    memory.constructionOffice.plans.push(stamp);
                    remaining--;
                }
            }
        }
    }
    if (memory.constructionOffice.plans.length > 0) {
        room.memory.constructionOffice.finished = false;
        room.memory.constructionOffice.plans = memory.constructionOffice.plans;
        room.memory.constructionOffice.lastJob = rcl;
    }
}

function createConstructionPlan(room: Room, rcl: RCL) {
    const memory = room.memory;
    const structures = room.find(FIND_STRUCTURES);
    const currentStructures: StructureAmount = getCurrentStructures(structures);
    const remainingStructures = getRemainingStructure(rcl, currentStructures);

    for(let constant in remainingStructures){
        console.log(Game.cpu.getUsed())
        const structure = remainingStructures[constant as StructureConstant]?.valueOf() ?? 0
        const buildTo = currentStructures[constant as StructureConstant]?.valueOf() ?? 0

        if(memory.basePlanner.stamps === undefined) return;
        const structureStamp = memory.basePlanner.stamps.filter(stamp => stamp.type === constant as StructureConstant)
        for(let i = 0; i < structure; i++){
            memory.constructionOffice.plans.push(structureStamp[buildTo + i]);
        }
    }

    room.memory.constructionOffice.finished = false;
    room.memory.constructionOffice.plans = memory.constructionOffice.plans;
    room.memory.constructionOffice.lastJob = rcl;
}

function getCurrentStructures(structures: AnyStructure[]) {
    return {
        spawn: filterForStructure(structures, STRUCTURE_SPAWN),
        tower: filterForStructure(structures, STRUCTURE_TOWER),
        extension: filterForStructure(structures, STRUCTURE_EXTENSION),
        container: filterForStructure(structures, STRUCTURE_CONTAINER),
        rampart: filterForStructure(structures, STRUCTURE_RAMPART) + filterForStructure(structures, STRUCTURE_WALL),
        terminal: filterForStructure(structures, STRUCTURE_TERMINAL),
        lab: filterForStructure(structures, STRUCTURE_LAB),
        road: filterForStructure(structures, STRUCTURE_ROAD),
        storagge: filterForStructure(structures, STRUCTURE_STORAGE),
        extractor: filterForStructure(structures, STRUCTURE_EXTRACTOR),
        factory:filterForStructure(structures, STRUCTURE_FACTORY),
        observer: filterForStructure(structures, STRUCTURE_OBSERVER),
        nuker: filterForStructure(structures, STRUCTURE_NUKER),
        powerSpawn: filterForStructure(structures, STRUCTURE_POWER_SPAWN),
    };
}

function getRemainingStructure(rcl: number, currentStructures: StructureAmount) {
    const rclStructs = rclAvailableStructures[rcl];

    const remainingStructure: StructureAmount = {
        spawn: (rclStructs[STRUCTURE_SPAWN] ?? 0) - (currentStructures.spawn ?? 0),
        storage: (rclStructs[STRUCTURE_STORAGE] ?? 0) - (currentStructures.storage ?? 0),
        extension: (rclStructs[STRUCTURE_EXTENSION] ?? 0) - (currentStructures.extension ?? 0),
        container: (rclStructs[STRUCTURE_CONTAINER] ?? 0) - (currentStructures.container ?? 0),
        tower: (rclStructs[STRUCTURE_TOWER] ?? 0) - (currentStructures.tower ?? 0),
        rampart: (rclStructs[STRUCTURE_RAMPART] ?? 0) - (currentStructures.rampart ?? 0),
        terminal: (rclStructs[STRUCTURE_TERMINAL] ?? 0) - (currentStructures.terminal ?? 0),
        lab: (rclStructs[STRUCTURE_LAB] ?? 0) - (currentStructures.lab ?? 0),
        road: (rclStructs[STRUCTURE_ROAD] ?? 0) - (currentStructures.road ?? 0),
        extractor: (rclStructs[STRUCTURE_EXTRACTOR] ?? 0) - (currentStructures.extractor ?? 0),
        factory:(rclStructs[STRUCTURE_EXTRACTOR] ?? 0) - (currentStructures.extractor ?? 0),
        observer: (rclStructs[STRUCTURE_OBSERVER] ?? 0) - (currentStructures.observer ?? 0),
        nuker: (rclStructs[STRUCTURE_NUKER] ?? 0) - (currentStructures.nuker ?? 0),
        powerSpawn: (rclStructs[STRUCTURE_POWER_SPAWN] ?? 0) - (currentStructures.powerSpawn?? 0),
    };

    return remainingStructure
}

function filterForStructure(structures: AnyStructure[], constant: StructureConstant) {
    return structures.filter(structure => structure.structureType === constant).length
}

export function getCurrentConstruction(room: Room) {
    const cSite = room.find(FIND_CONSTRUCTION_SITES)[0]
    if (cSite === undefined) return undefined
    return cSite.id
}
