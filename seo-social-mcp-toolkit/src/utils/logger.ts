import pino from 'pino';
import { config } from '../config/index.js';

/**
 * Application logger using Pino
 */
export const logger = pino({
  level: config.logging.level,
  transport: config.nodeEnv === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,
});

/**
 * Create a child logger with context
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
