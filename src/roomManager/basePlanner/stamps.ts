import { Point, priority } from "utils/sharedTypes";

// types for a construction stamp
export type StructureStamp = {
    [structureType in StructureConstant]?: { x: number; y: number, priority?: number }[];
};

export interface Stamp {
    center: Point;
    // the width and height is determind from the center position
    width: number;  // roads are ignored
    height: number  // roads are ignored
    structures: StructureStamp
}

export const CoreStamp: Stamp = {
    center: { x: 2, y: 2 },
    width: 1,
    height: 1,
    structures: {
        spawn: [{ x: 3, y: 3 }],
        road: [
            { x: 2, y: 2, priority: priority.low },
            { x: 1, y: 1, priority: priority.low },
            { x: 0, y: 2, priority: priority.low },
            { x: 2, y: 0, priority: priority.low },
            { x: 3, y: 0, priority: priority.low },
            { x: 4, y: 1, priority: priority.low },
            { x: 4, y: 2, priority: priority.low },
            { x: 4, y: 3, priority: priority.low },
            { x: 3, y: 4, priority: priority.low },
            { x: 2, y: 4, priority: priority.low },
            { x: 1, y: 4, priority: priority.low },
            { x: 0, y: 3, priority: priority.low }
        ],
        storage: [{ x: 2, y: 3 }],
        observer: [{ x: 3, y: 1 }],
        powerSpawn: [{ x: 3, y: 2 }],
        terminal: [{ x: 1, y: 2 }],
        nuker: [{ x: 1, y: 3 }],
        factory: [{ x: 2, y: 1 }]
    }
}

export const LabStamp: Stamp =
{
    center: { x: 3, y: 2 },
    width: 2,
    height: 1,
    structures: {
        lab: [
            {x:2,y:1, priority: priority.severe},
            {x:2,y:2, priority: priority.severe},
            {x:1,y:2, priority: priority.severe},
            {x:2,y:3, priority: priority.high},
            {x:3,y:2, priority: priority.high},
            {x:3,y:3, priority: priority.high},
            {x:4,y:1, priority: priority.medium},
            {x:4,y:2, priority: priority.medium},
            {x:5,y:2, priority: priority.medium},
            {x:4,y:3, priority: priority.medium}
        ],
        road:[
            {x:0,y:2, priority: priority.low},
            {x:1,y:1, priority: priority.low},
            {x:2,y:0, priority: priority.low},
            {x:3,y:1, priority: priority.low},
            {x:4,y:0, priority: priority.low},
            {x:5,y:1, priority: priority.low},
            {x:6,y:2, priority: priority.low},
            {x:5,y:3, priority: priority.low},
            {x:4,y:4, priority: priority.low},
            {x:3,y:4, priority: priority.low},
            {x:2,y:4, priority: priority.low},
            {x:1,y:3, priority: priority.low}
        ]
    }
}

export const FastFillerStamp: Stamp = {
    center: { x: 3, y: 3 },
    width: 2,
    height: 2,
    structures: {
        spawn: [{ x: 3, y: 1, priority: priority.severe }],
        extension: [
            { x: 1, y: 1, priority: priority.severe },
            { x: 1, y: 2, priority: priority.severe },
            { x: 2, y: 1, priority: priority.severe },
            { x: 1, y: 3, priority: priority.severe },
            { x: 2, y: 3, priority: priority.severe },
            { x: 4, y: 1, priority: priority.severe },
            { x: 5, y: 1, priority: priority.high },
            { x: 5, y: 2, priority: priority.high },
            { x: 5, y: 3, priority: priority.high },
            { x: 4, y: 3, priority: priority.high },
            { x: 3, y: 4, priority: priority.high },
            { x: 3, y: 5, priority: priority.medium },
            { x: 5, y: 5, priority: priority.medium },
            { x: 5, y: 4, priority: priority.medium },
            { x: 4, y: 5, priority: priority.medium },
            { x: 3, y: 2, priority: priority.medium }
        ],
        road: [
            { x: 0, y: 3, priority: priority.low },
            { x: 0, y: 2, priority: priority.low },
            { x: 0, y: 1, priority: priority.low },
            { x: 1, y: 0, priority: priority.low },
            { x: 2, y: 0, priority: priority.low },
            { x: 3, y: 0, priority: priority.low },
            { x: 4, y: 0, priority: priority.low },
            { x: 6, y: 1, priority: priority.low },
            { x: 5, y: 0, priority: priority.low },
            { x: 6, y: 2, priority: priority.low },
            { x: 6, y: 3, priority: priority.low },
            { x: 6, y: 4, priority: priority.low },
            { x: 6, y: 5, priority: priority.low },
            { x: 5, y: 6, priority: priority.low },
            { x: 4, y: 6, priority: priority.low },
            { x: 3, y: 6, priority: priority.low },
            { x: 2, y: 5, priority: priority.low },
            { x: 1, y: 4, priority: priority.low },
            { x: 2, y: 4, priority: priority.low },
            { x: 3, y: 3, priority: priority.low },
            { x: 4, y: 2, priority: priority.low },
            { x: 4, y: 4, priority: priority.low },
            { x: 2, y: 2, priority: priority.low }
        ],
        container: [{ x: 3, y: 3, priority: priority.severe }]
    }
}

export const smallExtensionField: Stamp = {
    center: { x: 2, y: 2 },
    width: 1,
    height: 1,
    structures: {
        extension: [
            { x: 2, y: 1 },
            { x: 1, y: 2 },
            { x: 2, y: 2 },
            { x: 2, y: 3 },
            { x: 3, y: 2 }
        ],
        road: [
            { x: 1, y: 1, priority: priority.low },
            { x: 2, y: 0, priority: priority.low },
            { x: 3, y: 1, priority: priority.low },
            { x: 3, y: 3, priority: priority.low },
            { x: 4, y: 2, priority: priority.low },
            { x: 2, y: 4, priority: priority.low },
            { x: 1, y: 3, priority: priority.low },
            { x: 0, y: 2, priority: priority.low }
        ]
    }
}
