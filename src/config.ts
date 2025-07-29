import { innerBoxStyle, outerBoxStyle } from "utils/styling/stylings";

interface settings {
    test: Test;
    stats: Stats
    avoidedRooms: string[];
    env: string;
    buildPlanner: buildPlanner
}

interface buildPlanner {
    minDistanceFromController: number;
    margin: number;
    maxSelection: number;
}

interface Test{
    profiler: boolean
}

interface Stats{
    startX: number;
    startY: number;
    innerBoxStyle: PolyStyle;
    outerBoxStyle: PolyStyle;
}

export const settings: settings = {
    test: {
        profiler: false
    },
    stats:{
        startX: 1,
        startY: 1,
        innerBoxStyle: innerBoxStyle,
        outerBoxStyle: outerBoxStyle
    },
    avoidedRooms: [],
    env: 'development',
    buildPlanner: {
        minDistanceFromController: 7,
        margin: 5,
        maxSelection: 10
    }
}
