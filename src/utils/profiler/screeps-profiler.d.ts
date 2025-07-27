// utils/screeps-profiler.d.ts
export interface Profiler {
  wrap(fn: () => void): any;
  enable(): void;
  registerFN(fn: Function, label: string): Function;
  registerObject(obj: any, label: string): void;
  output(): string;
}

declare const profiler: Profiler;

export default profiler;
