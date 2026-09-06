const fs = require('fs');
const path = require('path');

const commands = new Map();

/**
 * Load a single command module
 */
async function loadCommand(filePath, relativePath) {
  try {
    const module = require(filePath);
    const commandDef = module.default || module.command || module;

    if (!commandDef.pattern && !commandDef.name) {
      console.warn(`[CommandLoader] Skipping ${relativePath}: no pattern or name defined`);
      return null;
    }

    const command = {
      name: commandDef.name || commandDef.pattern,
      pattern: commandDef.pattern,
      aliases: commandDef.aliases || [],
      category: commandDef.category || 'general',
      description: commandDef.description || '',
      usage: commandDef.usage || '',
      permissions: commandDef.permissions || [],
      ownerOnly: commandDef.ownerOnly === true,
      sudoAccessible: commandDef.sudoAccessible === true,
      groupOnly: commandDef.groupOnly === true,
      dmOnly: commandDef.dmOnly === true,
      hidden: commandDef.hidden === true,
      handler: commandDef.handler || commandDef.execute || commandDef.run,
      enabled: commandDef.enabled !== false,
      filename: relativePath
    };

    if (command.pattern) {
      commands.set(command.pattern.toLowerCase(), command);
    }

    if (Array.isArray(command.aliases)) {
      for (const alias of command.aliases) {
        commands.set(alias.toLowerCase(), command);
      }
    }

    console.log(`[CommandLoader] Loaded: ${command.pattern} (${command.category})`);
    return command;
  } catch (error) {
    console.error(`[CommandLoader] Failed to load ${relativePath}:`, error.message);
    return null;
  }
}

/**
 * Recursively load all command files from a directory
 */
async function loadCommandsFromDir(dirPath, baseDir = dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = fullPath.replace(baseDir + path.sep, '');

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }
      await loadCommandsFromDir(fullPath, baseDir);
    } else if (entry.isFile() && entry.name.endsWith('.js') && !entry.name.startsWith('.')) {
      await loadCommand(fullPath, relativePath);
    }
  }
}

/**
 * Load all commands from the lib/commands directory
 */
async function loadAllCommands() {
  // FIXED: __dirname is already built-in. 
  // FIXED: Changed '../commands' to 'commands' because this file is already inside 'lib/'
  const commandsDir = path.join(__dirname, 'commands');

  console.log('[CommandLoader] Loading commands from:', commandsDir);

  if (!fs.existsSync(commandsDir)) {
    console.error('[CommandLoader] ERROR: Commands directory does not exist at', commandsDir);
    return [];
  }

  await loadCommandsFromDir(commandsDir);

  console.log(`[CommandLoader] Total commands registered: ${commands.size}`);
  return Array.from(commands.values());
}

module.exports = {
  loadAllCommands,
  getCommand: (pattern) => {
    const input = String(pattern || '').trim().toLowerCase();
    if (!input) return undefined;
    const exact = commands.get(input);
    if (exact) return exact;
    // Many legacy commands use patterns such as `sticker ?(.*)`.
    // Resolve those by their first literal command token as well.
    for (const command of commands.values()) {
      const literal = String(command.pattern || command.name || '')
        .toLowerCase()
        .replace(/\s+\?\(\.\*\)$/, '')
        .trim();
      if (literal === input) return command;
    }
    return undefined;
  },
  getCommands: () => Array.from(commands.values()),
  getCommandsByCategory: (category) => Array.from(commands.values()).filter(cmd => cmd.category === category),
  getCategories: () => Array.from(new Set(Array.from(commands.values()).map(cmd => cmd.category))).sort(),
  clearCommands: () => { 
    commands.clear(); 
    console.log('[CommandLoader] All commands cleared'); 
  }
};
