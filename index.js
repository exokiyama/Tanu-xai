import 'dotenv/config';
import { config, validateConfig } from './config/config.js';
import { log } from './lib/utils/logger.js';
import { connect as dbConnect, disconnect as dbDisconnect } from './lib/database/index.js';
import { loadAllCommands } from './lib/command-loader.js';

/**
 * Tanu XAI - WhatsApp Bot
 * Main entry point
 * 
 * Startup sequence:
 * 1. Load config
 * 2. Initialize logger
 * 3. Connect to database
 * 4. Load commands
 * 5. Start WhatsApp connection
 */

async function main() {
  console.log('='.repeat(50));
  console.log('  Tanu XAI - WhatsApp Bot');
  console.log('='.repeat(50));
  
  // Step 1: Validate configuration
  log.info('STARTUP', 'Validating configuration...');
  try {
    validateConfig();
    log.info('STARTUP', 'Configuration validated successfully');
  } catch (error) {
    log.error('STARTUP', `Configuration error: ${error.message}`);
    process.exit(1);
  }
  
  // Step 2: Log startup info
  log.info('STARTUP', `Environment: ${config.nodeEnv}`);
  log.info('STARTUP', `Bot Name: ${config.botName}`);
  log.info('STARTUP', `Mode: ${config.mode}`);
  log.info('STARTUP', `Prefix: ${config.prefix}`);
  
  // Step 3: Connect to database
  log.info('STARTUP', 'Connecting to database...');
  try {
    await dbConnect();
    log.info('DB', 'Database connection established');
  } catch (error) {
    log.warn('DB', `Database connection failed: ${error.message}`);
    log.info('DB', 'Bot will continue without database persistence');
  }
  
  // Step 4: Load commands
  log.info('STARTUP', 'Loading commands...');
  try {
    const commands = await loadAllCommands();
    log.info('COMMANDS', `Loaded ${commands.length} commands`);
  } catch (error) {
    log.error('COMMANDS', `Failed to load commands: ${error.message}`);
  }
  
  // Step 5: Start WhatsApp connection
  log.info('STARTUP', 'Initializing WhatsApp connection...');
  log.info('STARTUP', 'WhatsApp connection logic to be implemented in Phase 2');
  
  console.log('='.repeat(50));
  console.log('  Startup complete!');
  console.log('='.repeat(50));
  
  // Keep the process running
  // In Phase 2, this will be replaced by the WhatsApp connection manager
  process.on('SIGINT', async () => {
    log.info('SHUTDOWN', 'Shutting down...');
    await dbDisconnect();
    log.info('SHUTDOWN', 'Goodbye!');
    process.exit(0);
  });
}

// Start the bot
main().catch((error) => {
  log.error('FATAL', `Unhandled error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
