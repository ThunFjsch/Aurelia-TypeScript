import { Objective } from "objectives/objectiveInterfaces";
import { getWorkParts } from "roomManager/spawn-helper";

export interface InvaderInformation {
    room: string;
    invader: Creep[];
    core: StructureInvaderCore[]
}

interface Capabilities {
    attackDamage: number;
    rangedAttackDamage: number;
    healPower: number;
    toughReduction: number;
    moveSpeed: number;
    creepName: string;
    totalParts: number;
}

export class InvaderExpert {
    detectNPC(room: Room, remotes: Objective[]): InvaderInformation[] {
        let finished: string[] = [];
        let info = [this.createHostileInformation(room)];
        for (let remote of remotes) {
            if (finished.find(name => name === remote.target)) continue;
            const remoteRoom = Game.rooms[remote.target];
            if (remoteRoom != undefined) {
                info.push(this.createHostileInformation(remoteRoom))
            }
        }

        return info;
    }

    createHostileInformation(room: Room): InvaderInformation {
        return {
            room: room.name,
            core: this.findCore(room),
            invader: this.findInvader(room)
        }
    }

    sourceOfCapabilities(invaders: Creep[]): Capabilities[] {
        let sources: Capabilities[] = [];

        invaders.forEach(creep => {
            const capabilities = this.analyzeCreepCapabilities(creep);
            sources.push(capabilities);
        });

        return sources;
    }

    private analyzeCreepCapabilities(creep: Creep): Capabilities {
        let attackDamage = 0;
        let rangedAttackDamage = 0;
        let healPower = 0;
        let toughReduction = 0;
        let moveSpeed = 0;

        creep.body.forEach(bodyPart => {
            // Skip if body part is disabled/destroyed
            if (bodyPart.hits === 0) return;

            const partType = bodyPart.type;
            let multiplier = 1; // Base multiplier

            // Check if body part is boosted
            if (bodyPart.boost) {
                const boosts = (BOOSTS as any)[bodyPart.type];
                if (boosts && boosts[bodyPart.boost]) {
                    const boostData = boosts[bodyPart.boost];
                    if (boostData) {
                        // Different body parts have different boost effects
                        switch (partType) {
                            case ATTACK:
                                multiplier = boostData.attack || 1;
                                break;
                            case RANGED_ATTACK:
                                multiplier = boostData.rangedAttack || 1;
                                break;
                            case HEAL:
                                multiplier = boostData.heal || 1;
                                break;
                            case TOUGH:
                                // TOUGH parts reduce damage taken
                                multiplier = boostData.damage || 1;
                                break;
                            case MOVE:
                                // MOVE parts affect fatigue
                                multiplier = boostData.fatigue || 1;
                                break;
                        }
                    }
                }

            }

            // Calculate effective capability based on body part and boost
            switch (partType) {
                case ATTACK:
                    attackDamage += ATTACK_POWER * multiplier;
                    break;
                case RANGED_ATTACK:
                    rangedAttackDamage += RANGED_ATTACK_POWER * multiplier;
                    break;
                case HEAL:
                    healPower += HEAL_POWER * multiplier;
                    break;
                case TOUGH:
                    // TOUGH reduces incoming damage
                    toughReduction += (1 - multiplier); // Lower multiplier = more damage reduction
                    break;
                case MOVE:
                    // MOVE affects speed (lower fatigue = faster movement)
                    moveSpeed += (2 / multiplier); // Boosted MOVE reduces fatigue
                    break;
            }
        });

        return {
            attackDamage,
            rangedAttackDamage,
            healPower,
            toughReduction: Math.max(0, Math.min(toughReduction, 0.99)), // Cap damage reduction
            moveSpeed,
            creepName: creep.name,
            totalParts: creep.body.length
        };
    }

    /**
     * Get the effective damage a creep can deal per tick
     */
    getEffectiveDamagePerTick(capabilities: Capabilities): number {
        return capabilities.attackDamage + capabilities.rangedAttackDamage;
    }

    /**
     * Analyze if invaders pose a significant threat
     */
    assessThreatLevel(invaders: Creep[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
        const capabilities = this.sourceOfCapabilities(invaders);

        let totalDamage = 0;
        let totalHeal = 0;
        let hasBoostedCreeps = false;

        capabilities.forEach(cap => {
            totalDamage += this.getEffectiveDamagePerTick(cap);
            totalHeal += cap.healPower;

            // Check if any creep has significant boosts
            if (cap.attackDamage > ATTACK_POWER ||
                cap.rangedAttackDamage > RANGED_ATTACK_POWER ||
                cap.healPower > HEAL_POWER) {
                hasBoostedCreeps = true;
            }
        });

        const damageToHealRatio = totalHeal > 0 ? totalDamage / totalHeal : totalDamage;

        if (totalDamage > 1000 || hasBoostedCreeps) return 'CRITICAL';
        if (totalDamage > 500 || damageToHealRatio > 2) return 'HIGH';
        if (totalDamage > 200) return 'MEDIUM';
        return 'LOW';
    }

    private findCore(room: Room) {
        return room.find(FIND_HOSTILE_STRUCTURES).filter(structure => structure.structureType === STRUCTURE_INVADER_CORE) as StructureInvaderCore[]
    }

    private findInvader(room: Room): Creep[] {
        return room.find(FIND_HOSTILE_CREEPS).filter(creep => creep.owner.username === "Invader");
    }

    private findSourceKeeper() {

    }
}
