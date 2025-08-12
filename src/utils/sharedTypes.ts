export interface Point {
    x: number;
    y: number;
}

export type Priority = typeof priority[keyof typeof priority];

export const priority = {
    severe: 0,
    high: 1,
    medium: 2,
    low: 3,
    veryLow: 4
} as const;
