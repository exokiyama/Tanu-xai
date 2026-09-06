'use strict';

require('dotenv').config();

const { config, validateConfig } = require('./config/config.js');
const { log } = require('./lib/utils/logger.js');
const {
  connect: dbConnect,
  disconnect: dbDisconnect
} = require('./lib/database/index.js');

const {
  loadAllCommands,
  getCommand,
  getCommands,
  getCommandsByCategory,
  getCategories
} = require('./lib/command-loader.js');

const {
  isOwner, isSudo, checkPermission, setBotOwner,
  getBotMode
} = require('./lib/utils/permissions.js');
const { isAdmin, getGroupMetadata } = require('./lib/utils/group.js');

const {
  createConnectionManager
} = require('./Tanu/connection/connection-manager.js');

const {
  extractText
} = require('./lib/utils/message.js');

const {
  handleMessagesUpdate,
  handleMessagesUpsert,
  handleCall,
  handlePMProtection
} = require('./lib/handlers/protection.js');

let connectionManager = null;
let shutdownStarted = false;

/**
 * Extract command information from a WhatsApp message.
 */
function parseCommand(text) {
  if (!text) {
    return null;
  }

  const prefix = config.prefix || '.';

  if (!text.startsWith(prefix)) {
    return null;
  }

  const body = text
    .slice(prefix.length)
    .trim();

  if (!body) {
    return null;
  }

  const parts = body.split(/\s+/);

  const commandName = parts
    .shift()
    .toLowerCase();

  return {
    commandName,
    args: parts
  };
}

/**
 * Dispatch normal incoming messages to commands.
 */
async function handleIncomingMessages(sock, event) {
  const messages = event?.messages || [];

  for (const message of messages) {
    if (!message?.message) {
      continue;
    }

    /*
     * Process commands sent from the connected bot account too.
     * This is required when the bot owner uses the bot from the
     * same WhatsApp account that is connected as the bot.
     * Non-command outgoing messages are still ignored below.
     */

    const remoteJid =
      message.key?.remoteJid;

    if (!remoteJid) {
      continue;
    }

    /*
     * Run PM protection before commands.
     */
    try {
      await handlePMProtection(
        sock,
        message
      );
    } catch (error) {
      log.warn(
        'PROTECTION',
        `PM protection failed: ${error.message}`
      );
    }

    const text =
      extractText(message);

    if (!text) {
      continue;
    }

    const parsed =
      parseCommand(text);

    if (!parsed) {
      continue;
    }

    const command =
      getCommand(parsed.commandName);

    if (!command) {
      continue;
    }

    if (command.enabled === false) {
      continue;
    }

    if (
      typeof command.handler !==
      'function'
    ) {
      log.warn(
        'COMMANDS',
        `Command ${command.name} has no executable handler`
      );

      continue;
    }

    const senderJid =
      message.key?.participant ||
      message.key?.remoteJid;

    const isGroup =
      remoteJid.endsWith('@g.us');

    // The connected WhatsApp account is the bot owner.
    if (global.waConnection?.user?.id) {
      setBotOwner(global.waConnection.user.id);
    }

    // Commands frequently expect these legacy message/context aliases.
    message.chat = remoteJid;
    message.sender = senderJid;

    let participants = [];
    if (isGroup) {
      try {
        const metadata = await getGroupMetadata(sock, remoteJid);
        participants = metadata?.participants || [];
      } catch {}
    }

    const admin = isAdmin(participants, senderJid);
    const owner = isOwner(senderJid);
    const privileged = isSudo(senderJid);
    const reply = async (text, options = {}) => {
      return sock.sendMessage(remoteJid, { text, ...options }, { quoted: message });
    };

    const registry = {
      getAllCommands: () => getCommands(),
      getCommand: (name) => getCommand(String(name || '').toLowerCase()),
      getCommandsByCategory: (category) => getCommandsByCategory(category),
      getCategories: () => getCategories()
    };

    const context = {
      sock,
      waConnection: global.waConnection,
      senderJid,
      sender: senderJid,
      remoteJid,
      chatId: remoteJid,
      chat: remoteJid,
      isGroup,
      isOwner: owner,
      isSudo: privileged,
      isAdmin: admin,
      botJid: global.waConnection?.user?.id || sock.user?.id,
      participants,
      args: parsed.args,
      command: parsed.commandName,
      quoted: message.quoted || null,
      mentionedJid: message.mentionedJid || [],
      reply,
      registry,
      message
    };

    // Enforce command metadata centrally. Public mode means ordinary
    // commands are available to everyone; owner/sudo/admin restrictions
    // remain protected.
    if (command.ownerOnly && !owner) {
      await reply('❌ This command is only available to the bot owner.');
      continue;
    }

    if (command.groupOnly && !isGroup) {
      await reply('❌ This command can only be used in groups.');
      continue;
    }

    if (Array.isArray(command.permissions) && command.permissions.length) {
      const required = command.permissions.includes('owner') ? 'owner' :
        command.permissions.includes('sudo') ? 'sudo' :
        command.permissions.includes('admin') ? 'admin' : 'user';
      const perm = await checkPermission(senderJid, required, { isGroup, isAdmin: admin });
      if (!perm.allowed) {
        await reply(`❌ ${perm.reason}`);
        continue;
      }
    }

    // Global bot mode gate.
    // public = everyone; private = main owner + bot owner + sudo;
    // dm = private chats only; group = group chats only.
    const botMode = getBotMode();

    if (botMode === 'private' && !privileged) {
      await reply('🔒 Bot is in PRIVATE mode. Only the main owner, bot owner and sudo users can use commands.');
      continue;
    }

    if (botMode === 'dm' && isGroup) {
      await reply('💬 Bot is in DM mode. Commands are disabled in groups.');
      continue;
    }

    if (botMode === 'group' && !isGroup) {
      await reply('👥 Bot is in GROUP mode. Commands are disabled in private chats.');
      continue;
    }

    try {
      await command.handler(
        sock,
        message,
        parsed.args,
        context
      );
    } catch (error) {
      log.error(
        'COMMAND',
        `${command.name}: ${error.message}`
      );

      try {
        await sock.sendMessage(
          remoteJid,
          {
            text:
              '❌ An error occurred while executing this command.'
          }
        );
      } catch {
        // Ignore secondary send failure.
      }
    }
  }
}

/**
 * Start the application.
 */
async function main() {
  console.log('='.repeat(50));
  console.log('  Tanu XAI - WhatsApp Bot');
  console.log('='.repeat(50));

  /*
   * 1. Validate configuration.
   */
  log.info(
    'STARTUP',
    'Validating configuration...'
  );

  try {
    validateConfig();

    log.info(
      'STARTUP',
      'Configuration validated successfully'
    );
  } catch (error) {
    log.error(
      'STARTUP',
      `Configuration error: ${error.message}`
    );

    process.exit(1);
  }

  /*
   * 2. Startup information.
   */
  log.info(
    'STARTUP',
    `Environment: ${config.nodeEnv}`
  );

  log.info(
    'STARTUP',
    `Bot Name: ${config.botName}`
  );

  log.info(
    'STARTUP',
    `Mode: ${config.mode}`
  );

  log.info(
    'STARTUP',
    `Prefix: ${config.prefix}`
  );

  /*
   * 3. Database.
   */
  log.info(
    'STARTUP',
    'Connecting to database...'
  );

  try {
    await dbConnect();

    log.info(
      'DB',
      'Database connection established'
    );
  } catch (error) {
    log.warn(
      'DB',
      `Database connection failed: ${error.message}`
    );

    log.info(
      'DB',
      'Bot will continue without database persistence'
    );
  }

  /*
   * 4. Commands.
   */
  log.info(
    'STARTUP',
    'Loading commands...'
  );

  try {
    const commands =
      await loadAllCommands();

    log.info(
      'COMMANDS',
      `Loaded ${commands.length} commands`
    );
  } catch (error) {
    log.error(
      'COMMANDS',
      `Failed to load commands: ${error.message}`
    );
  }

  /*
   * 5. Connection Manager.
   */
  log.info(
    'STARTUP',
    'Starting WhatsApp connection manager...'
  );

  connectionManager =
    createConnectionManager({
      config
    });

  /*
   * Normal messages.
   */
  connectionManager.setMessageHandler(
    handleIncomingMessages
  );

  /*
   * Anti-delete / anti-edit.
   */
  connectionManager.setMessageUpdateHandler(
    handleMessagesUpdate
  );

  /*
   * Call rejection.
   */
  connectionManager.setCallHandler(
    handleCall
  );

  /*
   * Start socket.
   */
  try {
    await connectionManager.createSocket();

    // The account authenticated by SESSION_ID is the secondary/bot owner.
    // It is automatically sudo, while the permanent main owner remains fixed.
    const connectedBotJid =
      connectionManager.getStatus?.().user?.id ||
      connectionManager.user?.id ||
      global.waConnection?.user?.id;
    if (connectedBotJid) {
      setBotOwner(connectedBotJid);
      log.info('PERMISSIONS', `Bot owner/sudo identity set from connected account: ${connectedBotJid}`);
    }

    log.info(
      'STARTUP',
      'WhatsApp connection manager initialized'
    );
  } catch (error) {
    log.error(
      'WA',
      `Initial WhatsApp connection failed: ${error.message}`
    );

    /*
     * The connection manager itself handles bounded
     * reconnects for transient connection failures.
     */
  }

  console.log('='.repeat(50));
  console.log('  Tanu XAI startup complete!');
  console.log('='.repeat(50));
}

/**
 * Graceful shutdown.
 */
async function shutdown(signal) {
  if (shutdownStarted) {
    return;
  }

  shutdownStarted = true;

  log.info(
    'SHUTDOWN',
    `Received ${signal}. Shutting down...`
  );

  try {
    if (connectionManager) {
      await connectionManager.shutdown();
    }
  } catch (error) {
    log.error(
      'SHUTDOWN',
      `WhatsApp shutdown error: ${error.message}`
    );
  }

  try {
    await dbDisconnect();
  } catch (error) {
    log.error(
      'SHUTDOWN',
      `Database shutdown error: ${error.message}`
    );
  }

  log.info(
    'SHUTDOWN',
    'Goodbye!'
  );

  process.exit(0);
}

/*
 * Process shutdown signals.
 */
process.once(
  'SIGINT',
  () => shutdown('SIGINT')
);

process.once(
  'SIGTERM',
  () => shutdown('SIGTERM')
);

/*
 * Fatal process errors.
 */
process.on(
  'uncaughtException',
  (error) => {
    log.error(
      'FATAL',
      `Uncaught exception: ${error.message}`
    );

    console.error(error);
  }
);

process.on(
  'unhandledRejection',
  (reason) => {
    const message =
      reason instanceof Error
        ? reason.message
        : String(reason);

    log.error(
      'FATAL',
      `Unhandled rejection: ${message}`
    );

    console.error(reason);
  }
);

/*
 * Start.
 */
main().catch((error) => {
  log.error(
    'FATAL',
    `Startup failed: ${error.message}`
  );

  console.error(error);

  process.exit(1);
});
