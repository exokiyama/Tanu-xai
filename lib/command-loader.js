'use strict';

const fs = require('fs');
const path = require('path');

const commands = new Map();
const commandList = [];

function loadCommand(filePath, relativePath) {
  try {
    const loaded = require(filePath);
    const def = loaded.default || loaded.command || loaded;
    if (!def || (!def.pattern && !def.name)) {
      console.warn(`[CommandLoader] Skipping ${relativePath}: no pattern or name defined`);
      return null;
    }

    const command = {
      name: def.name || String(def.pattern).split(/\s/)[0],
      pattern: def.pattern,
      aliases: Array.isArray(def.aliases) ? def.aliases : [],
      category: def.category || '📦 General',
      description: def.description || def.desc || '',
      usage: def.usage || '',
      permissions: Array.isArray(def.permissions) ? def.permissions : [],
      ownerOnly: def.ownerOnly === true,
      sudoAccessible: def.sudoAccessible === true,
      groupOnly: def.groupOnly === true,
      dmOnly: def.dmOnly === true,
      hidden: def.hidden === true,
      handler: def.handler || def.execute || def.run,
      enabled: def.enabled !== false,
      filename: relativePath
    };

    const canonical = String(command.name).toLowerCase();
    const existing = commandList.find(c => String(c.name).toLowerCase() === canonical);
    if (!existing) commandList.push(command);

    const registerKey = (key) => {
      const normalized = String(key || '').trim().toLowerCase();
      if (!normalized) return;
      if (commands.has(normalized) && commands.get(normalized) !== command) {
        console.warn(`[CommandLoader] Duplicate command key '${normalized}' in ${relativePath}; keeping existing registration.`);
        return;
      }
      commands.set(normalized, command);
    };

    registerKey(command.pattern);
    registerKey(command.name);
    for (const alias of command.aliases) registerKey(alias);

    console.log(`[CommandLoader] Loaded: ${command.pattern} (${command.category})`);
    return command;
  } catch (error) {
    console.error(`[CommandLoader] Failed to load ${relativePath}:`, error.stack || error.message);
    return null;
  }
}

function loadCommandsFromDir(dirPath, baseDir = dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      loadCommandsFromDir(fullPath, baseDir);
    } else if (entry.isFile() && entry.name.endsWith('.js') && !entry.name.startsWith('.')) {
      loadCommand(fullPath, relativePath);
    }
  }
}

function loadAllCommands() {
  commands.clear();
  commandList.length = 0;
  const commandsDir = path.join(__dirname, 'commands');
  if (!fs.existsSync(commandsDir)) throw new Error(`Commands directory does not exist: ${commandsDir}`);
  loadCommandsFromDir(commandsDir);
  console.log(`[CommandLoader] Total unique commands registered: ${commandList.length}`);
  return [...commandList];
}

function getCommand(pattern) {
  const input = String(pattern || '').trim().toLowerCase();
  if (!input) return undefined;
  const exact = commands.get(input);
  if (exact) return exact;
  for (const command of commandList) {
    const literal = String(command.pattern || command.name).toLowerCase().replace(/\s+\?\(\.\*\)$/, '').trim();
    if (literal === input) return command;
  }
  return undefined;
}

module.exports = {
  loadAllCommands,
  getCommand,
  getCommands: () => [...commandList],
  getCommandsByCategory: (category) => commandList.filter(cmd => cmd.category === category),
  getCategories: () => [...new Set(commandList.map(cmd => cmd.category))].sort(),
  clearCommands: () => { commands.clear(); commandList.length = 0; }
};
