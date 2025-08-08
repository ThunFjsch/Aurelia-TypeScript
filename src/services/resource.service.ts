import { spawn } from "child_process";
import { HaulerMemory } from "creeps/hauling";
import { roleContants } from "objectives/objectiveInterfaces";
import { priority, Priority } from "utils/sharedTypes";

type ResRole = 'pickup' | 'transfer' | 'withdrawl';

export interface Task {
    id: string;              // Resource ID
    targetId: string;        // Resource ID (same as above for now)
    priority: Priority;
    assigned: string[];      // Array of creep names
    maxAssigned: number;
    type: ResRole;
    amount: number;
}

export class ResourceService {
    taskList: Task[] = [];

    run(room: Room, haulCapacity: number, avgHauler: number, creeps: Creep[]) {
        this.cleanUp();

        let prio: Priority = priority.medium;
        const droppedRes = room.find(FIND_DROPPED_RESOURCES);

        droppedRes
            .filter(res => res.resourceType === RESOURCE_ENERGY)
            .sort((a, b) => a.amount - b.amount)
            .forEach(res => {
                this.updateCreatePickups(res, avgHauler, haulCapacity, prio);
            });

        creeps.filter(creep => creep.memory.role === roleContants.UPGRADING && creep.memory.home === room.name)
              .forEach(creep =>{
                this.updateCreateCreepTransfer(creep, avgHauler)
              })

        room.find(FIND_MY_STRUCTURES).filter(structure => structure.structureType === 'spawn')
            .forEach((structure) => {
                this.updateCreateStructureTransfer(structure as StructureSpawn, avgHauler)
            })
    }


    private updateCreateStructureTransfer(struc: StructureSpawn, avgHauler: number){
        let trips: number = struc.store.getFreeCapacity(RESOURCE_ENERGY) / (avgHauler * CARRY_CAPACITY);
        const amount = struc.store.getFreeCapacity(RESOURCE_ENERGY);
        const existingTask = this.taskList.find(task => task.targetId === struc.id);
        if(existingTask != undefined){
            existingTask.maxAssigned = trips;
            existingTask.amount = amount
        } else{
            // Create new task
            const newTask: Task = {
                id: struc.id,
                targetId: struc.id,
                assigned: [],
                maxAssigned: trips,
                priority: priority.medium,
                type: 'transfer',
                amount: amount
            };

            this.taskList.push(newTask);
        }
    }

    private updateCreateCreepTransfer(creep: Creep, avgHauler: number){
        let trips: number = creep.store.getCapacity() / (avgHauler * CARRY_CAPACITY);
        const amount = creep.store.getFreeCapacity(RESOURCE_ENERGY);
        const existingTask = this.taskList.find(task => task.targetId === creep.id);
        if(existingTask != undefined){
            existingTask.maxAssigned = trips;
            existingTask.amount = amount
        } else{
            // Create new task
            const newTask: Task = {
                id: creep.id,
                targetId: creep.id,
                assigned: [],
                maxAssigned: trips,
                priority: priority.medium,
                type: 'transfer',
                amount: amount
            };

            this.taskList.push(newTask);
        }
    }

    private updateCreatePickups(res: Resource, avgHauler: number, haulCapacity: number, prio: Priority) {
        let trips: number = res.amount / (avgHauler * CARRY_CAPACITY);
        if (trips > 10) {
            trips = Math.round(trips) / 2;
        }

        if (res.amount > ((haulCapacity * CARRY_CAPACITY) / 2)) {
            prio = priority.high;
        }

        const existingTask = this.taskList.find(task => task.targetId === res.id);

        if (existingTask) {
            // Update existing task
            existingTask.maxAssigned = trips;
            existingTask.priority = prio;
            existingTask.amount = res.amount
        } else {
            // Create new task
            const newTask: Task = {
                id: res.id,
                targetId: res.id,
                assigned: [],
                maxAssigned: trips,
                priority: prio,
                type: 'pickup',
                amount: res.amount
            };

            this.taskList.push(newTask);
        }
    }

    cleanUp() {
        this.taskList = this.taskList.filter(task => Game.getObjectById(task.targetId) != null);
    }

    assignToTask(creep: Creep, type: ResRole): string | undefined {
        for (const task of this.taskList) {
            if (task.assigned.length < task.maxAssigned && task.type === type) {
                task.assigned.push(creep.name);
                return task.targetId;
            }
        }
        return undefined;
    }

    removeFromTask(creep: Creep, target: Resource | Creep){
        let i = 0;
        this.taskList.forEach(task => {
            if(task.id === target.id && task.assigned.find(ass => ass === creep.name)){
                let currAssignee: string[] = []
                this.taskList[i].assigned.forEach(ass => {
                    if(ass != creep.name){
                        currAssignee.push(ass)
                    }
                })
                this.taskList[i].assigned = currAssignee
            }
            i++
        })
    }
}
