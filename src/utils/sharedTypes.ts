export interface Point {
    x: number;
    y: number;
}

export type Priority = typeof priority[keyof typeof priority];

export const priority = {
    severe: 1,
    high: 2,
    medium: 3,
    low: 4,
    veryLow: 5
} as const;
