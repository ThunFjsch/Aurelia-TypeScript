interface settings {
    test: Test;
    stats: Stats
    avoidedRooms: string[]
    env: string
}

interface Test{
    profiler: boolean
}

interface Stats{
    startX: number;
    startY: number;
    boxStyle: PolyStyle;
}

export const settings: settings = {
    test: {
        profiler: false
    },
    stats:{
        startX: 1,
        startY: 1,
        boxStyle: {
            fill: '#5BCEFA',
            stroke: '#F5A9B8',
            strokeWidth: 0.4
        }
    },
    avoidedRooms: [],
    env: 'development'
}
