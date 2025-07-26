type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
type CompressedLogLevel = 'D' | 'I' | 'W' | 'E';
type Environment = 'development' | 'production' | 'test';

interface FullLogContext {
    creep?: string;
    role?: string;
    hits?: number;
    error?: string;
    [key: string]: any;
}

interface FullLogEntry {
    tick: number;
    level: LogLevel;
    message: string;
    context?: FullLogContext;
}

interface CompressedLogEntry {
    t: number;
    l: CompressedLogLevel;
    m: string;
    c?: Record<string, any>;
}
