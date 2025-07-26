
const LOG_LIMIT = 100;

const levelMap: Record<LogLevel, CompressedLogLevel> = {
  DEBUG: 'D',
  INFO: 'I',
  WARN: 'W',
  ERROR: 'E'
};

const levelReverseMap: Record<CompressedLogLevel, LogLevel> = {
  D: 'DEBUG',
  I: 'INFO',
  W: 'WARN',
  E: 'ERROR'
};

const contextMap: Record<string, string> = {
  creep: 'cr',
  role: 'r',
  hits: 'hp',
  error: 'e'
};

const contextReverseMap: Record<string, string> = {};
for (const key in contextMap) {
  if (Object.prototype.hasOwnProperty.call(contextMap, key)) {
    const shortKey = contextMap[key];
    contextReverseMap[shortKey] = key;
  }
}

function compressLog(entry: FullLogEntry): CompressedLogEntry {
  const compressedContext: Record<string, any> = {};

  if (entry.context) {
    for (const [key, value] of Object.entries(entry.context)) {
      const shortKey = contextMap[key] || key;
      compressedContext[shortKey] = value;
    }
  }

  return {
    t: entry.tick,
    l: levelMap[entry.level],
    m: entry.message,
    c: Object.keys(compressedContext).length ? compressedContext : undefined
  };
}

function decodeLog(entry: CompressedLogEntry): FullLogEntry {
  const context: FullLogContext = {};

  if (entry.c) {
    for (const [key, value] of Object.entries(entry.c)) {
      const longKey = contextReverseMap[key] || key;
      context[longKey] = value;
    }
  }

  return {
    tick: entry.t,
    level: levelReverseMap[entry.l],
    message: entry.m,
    context: Object.keys(context).length ? context : undefined
  };
}

// Get the current environment (type-safe)
const ENVIRONMENTS: Environment[] = ['development', 'production', 'test'];

const getEnv = (): Environment => {
  const env = Memory.env as Environment;
  return ENVIRONMENTS.includes(env) ? env : 'production';
};

// Logging level settings
const logLevelPriority: Record<Environment, LogLevel[]> = {
  development: ['DEBUG', 'INFO', 'WARN', 'ERROR'],
  production: ['INFO', 'WARN', 'ERROR'],
  test: []
};

const isLogLevelEnabled = (level: LogLevel): boolean => {
  const env = getEnv();
  return logLevelPriority[env].includes(level);
};

// Push to Memory.logs with compression and rotation
const pushLog = (entry: FullLogEntry): void => {
  const compressed = compressLog(entry);
  if (!Memory.logs) Memory.logs = [];
  Memory.logs.push(compressed);
  if (Memory.logs.length > LOG_LIMIT) {
    Memory.logs = Memory.logs.slice(-LOG_LIMIT);
  }
};

// Public logger API
export const logger = {
  debug: (msg: string, ctx?: FullLogContext) => {
    if (isLogLevelEnabled('DEBUG')) pushLog({ tick: Game.time, level: 'DEBUG', message: msg, context: ctx });
  },
  info: (msg: string, ctx?: FullLogContext) => {
    if (isLogLevelEnabled('INFO')) pushLog({ tick: Game.time, level: 'INFO', message: msg, context: ctx });
  },
  warn: (msg: string, ctx?: FullLogContext) => {
    if (isLogLevelEnabled('WARN')) pushLog({ tick: Game.time, level: 'WARN', message: msg, context: ctx });
  },
  error: (msg: string, ctx?: FullLogContext) => {
    if (isLogLevelEnabled('ERROR')) pushLog({ tick: Game.time, level: 'ERROR', message: msg, context: ctx });
  },

  exportDecoded: (): string => {
    const logs = Memory.logs as CompressedLogEntry[] | undefined;
    if (!logs) return '[]';
    return JSON.stringify(logs.map(decodeLog), null, 2);
  },

  exportRaw: (): string => {
    return JSON.stringify(Memory.logs ?? []);
  }
};
