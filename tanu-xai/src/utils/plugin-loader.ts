import { readdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CommandPlugin, PluginRegistry } from '../types/index.js';
import { createModuleLogger } from '../core/logger/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createModuleLogger('PLUGIN');

class PluginLoader {
  private registry: PluginRegistry = {
    commands: new Map(),
    categories: new Set()
  };
  private loaded = false;

  async loadPlugins(): Promise<void> {
    if (this.loaded) {
      log.warn('Plugins already loaded');
      return;
    }

    const pluginsDir = join(__dirname, '../plugins');

    try {
      await this.loadDirectory(pluginsDir);
      this.loaded = true;
      log.info(`Loaded ${this.registry.commands.size} commands across ${this.registry.categories.size} categories`);
    } catch (error: any) {
      log.error('Failed to load plugins', { error: error.message });
    }
  }

  private async loadDirectory(dir: string): Promise<void> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          await this.loadDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.js') && !entry.name.startsWith('.')) {
          try {
            const module = await import(fullPath);
            const plugin: CommandPlugin = module.default;

            if (plugin && plugin.name && plugin.execute) {
              this.registerCommand(plugin);
            }
          } catch (error: any) {
            log.error(`Failed to load plugin: ${entry.name}`, { error: error.message });
          }
        }
      }
    } catch (error: any) {
      log.error(`Failed to read directory: ${dir}`, { error: error.message });
    }
  }

  private registerCommand(plugin: CommandPlugin): void {
    this.registry.commands.set(plugin.name, plugin);
    this.registry.categories.add(plugin.category);

    if (plugin.aliases) {
      for (const alias of plugin.aliases) {
        this.registry.commands.set(alias, plugin);
      }
    }

    log.debug(`Registered command: ${plugin.name} (${plugin.category})`);
  }

  getCommand(name: string): CommandPlugin | undefined {
    return this.registry.commands.get(name.toLowerCase());
  }

  getAllCommands(): Map<string, CommandPlugin> {
    return this.registry.commands;
  }

  getCategories(): string[] {
    return Array.from(this.registry.categories);
  }

  getCommandsByCategory(category: string): CommandPlugin[] {
    return Array.from(this.registry.commands.values()).filter(
      p => p.category === category
    );
  }
}

export const pluginLoader = new PluginLoader();
