import { settings } from "config";
import { CoreStamp } from "./stamps";
import { getDistanceTransformMap } from "utils/alrgorithms/distanceTransform";
import { ScoredPoint } from "./planner-interfaces";
import { distanceFormula } from "./planner-helper";

//
//  This file contains all the logic for selecting the starting Position
//
export class StartingLocation{

    getStartLocation(room: Room): ScoredPoint {
            let dt: number[][];
            if (!room.memory.basePlanner.distanceTransform) {
                dt = getDistanceTransformMap(room.getTerrain(), TERRAIN_MASK_WALL, settings.buildPlanner.margin);
                room.memory.basePlanner.distanceTransform = dt;
            } else {
                dt = room.memory.basePlanner.distanceTransform;
            }

            const potential = this.pickStartingLocations(dt, room);
            const scored = this.getLowestScoreDTMap(potential);
            room.memory.basePlanner.distanceTransform = scored.result;

            return scored.scoredPositions[5];
        }

    private getLowestScoreDTMap(scoreMap: number[][], topN = settings.buildPlanner.maxSelection) {
        // Step 1: Flatten score map to list of positions
        const scoredPositions: { x: number; y: number; score: number }[] = [];

        for (let y = 0; y < scoreMap.length; y++) {
            for (let x = 0; x < scoreMap[y].length; x++) {
                const score = scoreMap[y][x];
                if (isFinite(score)) {
                    scoredPositions.push({ x, y, score });
                }
            }
        }

        // Step 2: Sort by score
        scoredPositions.sort((a, b) => a.score - b.score);
        // Step 3: Slice top N
        const top = scoredPositions.slice(0, topN);
        // Step 4: Generate empty dt-style grid
        const result: number[][] = Array.from({ length: 50 }, () => Array(50).fill(Infinity));
        // Step 5: Fill selected scores into result grid
        for (const { x, y, score } of top) {
            result[y][x] = score;
        }

        return { result, scoredPositions };
    }

    private pickStartingLocations(dt: number[][], room: Room): number[][] {
        const controllerPos = room.controller?.pos;
        if (!controllerPos) return [];

        const sources = room.find(FIND_SOURCES);
        const minerals = room.find(FIND_MINERALS)
        const minWeight = CoreStamp.height + CoreStamp.width + 1;  // +1 for the center

        const scoreMap: number[][] = Array.from({ length: 50 }, () => Array(50).fill(Infinity));
        const allScores: number[] = [];

        for (let y = 0; y < 50; y++) {
            for (let x = 0; x < 50; x++) {
                if (dt[y][x] === Infinity || dt[y][x] < minWeight) continue;
                const score = this.getStartingLocationScore(
                    controllerPos, settings.buildPlanner.minDistanceFromController, sources, minerals, x, y, dt
                )
                scoreMap[y][x] = score;
                allScores.push(score);
            }
        }

        // Compute percentile threshold
        allScores.sort((a, b) => a - b);
        const percentile = 0.1; // top 10%
        const cutoffIndex = Math.round(allScores.length * percentile);
        const dynamicMaxScore = allScores[cutoffIndex] ?? Infinity;

        // Filter map with the dynamic threshold
        for (let y = 0; y < 50; y++) {
            for (let x = 0; x < 50; x++) {
                if (scoreMap[y][x] > dynamicMaxScore) {
                    scoreMap[y][x] = Infinity;
                }
            }
        }

        return scoreMap;
    }


    private getStartingLocationScore(controller: RoomPosition, minDistanceFromController: number, sources: Source[], minerals: Mineral[], x: number, y: number, dt: number[][]): number {
        const distToController = distanceFormula(controller.x, controller.y, x, y);
        if (distToController < minDistanceFromController) return Infinity;

        let score = distToController + dt[y][x];
        for (const source of sources) {
            score += distanceFormula(source.pos.x, source.pos.y, x, y);
        }
        for (const mineral of minerals) {
            score += distanceFormula(mineral.pos.x, mineral.pos.y, x, y);
        }
        return Math.round(score);
    }
}
