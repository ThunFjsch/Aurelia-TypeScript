export default function memHack(fn: () => void): () => void {
    const memory = Memory;
    if (!memory) throw new TypeError("Failed to load Memory");

    return () => {
        delete global.Memory;
        global.Memory = memory;
        (RawMemory as any)._parsed = memory;
        fn();
    };
}
