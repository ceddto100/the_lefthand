import pg from 'pg';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

/**
 * Database connection pool
 */
export const pool = new Pool({
  connectionString: config.database.url,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle pool errors
pool.on('error', (err: Error) => {
  logger.error({ error: err.message }, 'Unexpected database error');
});

/**
 * Test database connection
 */
export async function testConnection(): Promise<void> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    logger.info({ time: result.rows[0].now }, 'Database connection successful');
    client.release();
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Database connection failed');
    throw error;
  }
}

/**
 * Close database connection pool
 */
export async function closePool(): Promise<void> {
  await pool.end();
  logger.info('Database connection pool closed');
}
