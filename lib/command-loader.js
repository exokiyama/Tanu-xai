import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Command loader - automatically loads all .js files from lib/commands/
 * and registers them with pattern, aliases, category, and permissions
 */

const commands = new Map();

/**
 * Load a single command module
 */
async function loadCommand(filePath, relativePath) {
  try {
    const module = await import(filePath);
    
    // Support both default export and named exports
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
      handler: commandDef.handler || commandDef.execute || commandDef.run,
      enabled: commandDef.enabled !== false,
      filename: relativePath
    };
    
    // Register by pattern
    if (command.pattern) {
      commands.set(command.pattern.toLowerCase(), command);
    }
    
    // Register by aliases
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
  const entries = readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    const relativePath = fullPath.replace(baseDir + '/', '');
    
    if (entry.isDirectory()) {
      // Skip node_modules and hidden directories
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }
      // Recursively load subdirectories
      await loadCommandsFromDir(fullPath, baseDir);
    } else if (entry.isFile() && entry.name.endsWith('.js') && !entry.name.startsWith('.')) {
      // Load JavaScript files
      await loadCommand(`file://${fullPath}`, relativePath);
    }
  }
}

/**
 * Load all commands from the lib/commands directory
 */
export async function loadAllCommands() {
  const commandsDir = join(__dirname, '../commands');
  
  console.log('[CommandLoader] Loading commands from:', commandsDir);
  
  await loadCommandsFromDir(commandsDir);
  
  console.log(`[CommandLoader] Total commands registered: ${commands.size}`);
  return getCommands();
}

/**
 * Get a command by pattern or alias
 */
export function getCommand(pattern) {
  return commands.get(pattern.toLowerCase());
}

/**
 * Get all registered commands
 */
export function getCommands() {
  return Array.from(commands.values());
}

/**
 * Get commands by category
 */
export function getCommandsByCategory(category) {
  return getCommands().filter(cmd => cmd.category === category);
}

/**
 * Get all categories
 */
export function getCategories() {
  const categories = new Set(getCommands().map(cmd => cmd.category));
  return Array.from(categories).sort();
}

/**
 * Clear all loaded commands (useful for hot reload)
 */
export function clearCommands() {
  commands.clear();
  console.log('[CommandLoader] All commands cleared');
}

export default {
  loadAllCommands,
  getCommand,
  getCommands,
  getCommandsByCategory,
  getCategories,
  clearCommands
};
