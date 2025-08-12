import { drawTextBox } from "utils/styling/stylingHelper";
import { interfaceBorder } from "utils/styling/stylings";

export function constructionVisuals(room: Room){
    const cSite = room.find(FIND_CONSTRUCTION_SITES)[0]
    const conInfo = room.memory.constructionOffice
    if(conInfo === null) return
    const startY = 10;
    const startX = 1;
    const width = 11;
    let info: string[] = []
    info.push(`rcl: ${conInfo.lastJob} | done: ${conInfo.finished}`);
    if(cSite != undefined){
        info.push(`current: ${cSite.progress}/${cSite.progressTotal}`);
    }
    if(conInfo.plans != undefined){
        conInfo.plans.forEach(plan => {
            info.push(`${plan.type} | ${plan.x}/${plan.y}`)
            room.visual.circle(plan.x, plan.y, {fill: interfaceBorder})
        })
    }
    drawTextBox(room, info, width, startX, startY);
}
