import type { RetryConfig } from '../types/index.js';
import { logger } from './logger.js';

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  context: string = 'operation'
): Promise<T> {
  let lastError: Error | null = null;
  let delay = config.initialDelayMs;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      logger.debug({ attempt, context }, 'Attempting operation');
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === config.maxAttempts) {
        logger.error(
          { attempt, context, error: lastError.message },
          'All retry attempts failed'
        );
        break;
      }

      logger.warn(
        { attempt, context, error: lastError.message, delayMs: delay },
        'Operation failed, retrying'
      );

      await sleep(delay);
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
    }
  }

  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
