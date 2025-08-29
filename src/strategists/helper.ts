/**
     * Get detailed boost information for debugging
     */
export function getBoostDetails(creep: Creep): Array<{ partType: BodyPartConstant, boost?: string | number, multiplier: number }> {
    let bodyArray: Array<{ partType: BodyPartConstant, boost?: string | number, multiplier: number }> = []
    creep.body.map(bodyPart => {
        let multiplier = 1;

        if (bodyPart.boost) {
            const boosts = (BOOSTS as any)[bodyPart.type];
            if (boosts && boosts[bodyPart.boost]) {
                const boostData = boosts[bodyPart.boost];
                if (boostData) {
                    // Get the relevant multiplier based on body part type
                    switch (bodyPart.type) {
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
                            multiplier = boostData.damage || 1;
                            break;
                        case MOVE:
                            multiplier = boostData.fatigue || 1;
                            break;
                        case WORK:
                            multiplier = boostData.harvest || boostData.build || boostData.repair || boostData.dismantle || 1;
                            break;
                        case CARRY:
                            multiplier = boostData.capacity || 1;
                            break;
                    }
                }
            }
        }

        bodyArray.push({
            partType: bodyPart.type,
            boost: bodyPart.boost,
            multiplier
        });
    });
    return bodyArray
}
