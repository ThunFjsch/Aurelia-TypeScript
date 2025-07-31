
export type PlacedStructure = {
    type: StructureConstant;
    x: number;
    y: number;
    priority?: number;
};

export interface ScoredPoint {
    x: number;
    y: number;
    score: number;
}
