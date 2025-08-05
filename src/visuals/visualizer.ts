import { settings } from "config";
import { visualizePlanner } from "./planner-visuals";
import { visualiseStats } from "./stats-visuals";
import { StatInfo } from "stats";
import { Objective } from "objectives/objectiveInterfaces";
import { visualizeObjectives } from "./objective-visuals";

export class Visualizer {
    visualizeRoom(room: Room, statInfo: StatInfo, cpuAverage: number, objectives: Objective[]){
        if(settings.visuals.basePlanning) visualizePlanner(room);
        if(settings.visuals.showStats) visualiseStats(statInfo, cpuAverage);
        if(settings.visuals.showObjectives) visualizeObjectives(objectives);
    }
}
