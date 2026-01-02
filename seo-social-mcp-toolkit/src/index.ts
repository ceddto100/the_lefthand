import { validateConfig } from './config/index.js';
import { startServer } from './server.js';
import { logger } from './utils/logger.js';

/**
 * Main entry point
 */
async function main() {
  try {
    // Validate configuration
    logger.info('Validating configuration...');
    validateConfig();

    // Start server
    logger.info('Starting SEO Social MCP Toolkit...');
    await startServer();
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to start application');
    process.exit(1);
  }
}

// Run
main();
