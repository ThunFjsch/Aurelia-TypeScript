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

    run(room: Room, haulCapacity: number, avgHauler: number) {
        this.cleanUp();

        let prio: Priority = priority.medium;
        const droppedRes = room.find(FIND_DROPPED_RESOURCES);

        droppedRes
            .filter(res => res.resourceType === RESOURCE_ENERGY)
            .sort((a, b) => b.amount - a.amount)
            .forEach(res => {
                this.updateCreatePickups(res, avgHauler, haulCapacity, prio);
            });
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

    assignToPickup(creep: Creep): string | undefined {
        for (const task of this.taskList) {
            if (task.assigned.length < task.maxAssigned) {
                task.assigned.push(creep.name);
                console.log(`[Assign] ${creep.name} -> ${task.targetId} | Assigned: ${task.assigned.length}/${task.maxAssigned}`);
                return task.targetId;
            }
        }
        return undefined;
    }
}
