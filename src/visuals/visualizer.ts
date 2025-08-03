import { settings } from "config";
import { visualizePlanner } from "./planner-visuals";
import { visualiseStats } from "./stats-visuals";
import { StatInfo } from "stats";

export class Visualizer {
    visualizeRoom(room: Room, statInfo: StatInfo, cpuAverage: number){
        if(settings.visuals.basePlanning) visualizePlanner(room);
        if(settings.visuals.showStats) visualiseStats(statInfo, cpuAverage)
    }
}
