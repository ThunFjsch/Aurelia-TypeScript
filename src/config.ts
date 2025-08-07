import { innerBoxStyle, outerBoxStyle } from "utils/styling/stylings";

interface settings {
    test: Test;
    stats: Stats
    avoidedRooms: string[];
    env: string;
    buildPlanner: buildPlanner
    visuals: Visuals;
    objective: ObjectiveSettings
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

interface Visuals{
    allowVisuals: boolean;
    basePlanning: boolean;
    showStamps: boolean;
    distanceTransform: boolean;
    showStats: boolean;
    showObjectives: boolean;
}

interface ObjectiveSettings{
    startX: number;
    startY: number;
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
    },
    visuals: {
        allowVisuals: true,
        basePlanning: false,
        showStamps: true,
        distanceTransform: false,
        showStats: true,
        showObjectives: true
    },
    objective: {
        startX: 14,
        startY: 1
    }
}
