const LOG_LEVEL = (process.env.NEXT_PUBLIC_LOG_LEVEL || process.env.LOG_LEVEL || 'info').toLowerCase();

// Niveles en orden de menor a mayor severidad
const levels = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof levels)[number];

function shouldLog(level: LogLevel) {
  const currentIndex = levels.indexOf(LOG_LEVEL as LogLevel);
  const levelIndex = levels.indexOf(level);

  // Si el nivel configurado no es válido, por defecto mostramos todo
  if (currentIndex === -1) return true;
  return levelIndex >= currentIndex;
}

function formatMessage(level: LogLevel, args: any[]) {
  const time = new Date().toISOString();
  return [`[${time}] [${level.toUpperCase()}]`, ...args];
}

export const logger = {
  debug: (...args: any[]) => {
    if (!shouldLog('debug')) return;
    console.debug(...formatMessage('debug', args));
  },
  info: (...args: any[]) => {
    if (!shouldLog('info')) return;
    console.info(...formatMessage('info', args));
  },
  warn: (...args: any[]) => {
    if (!shouldLog('warn')) return;
    console.warn(...formatMessage('warn', args));
  },
  error: (...args: any[]) => {
    if (!shouldLog('error')) return;
    console.error(...formatMessage('error', args));
  },
};
