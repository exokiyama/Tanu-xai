/**
 * Command: menu
 * Category: 📊 Info
 * Description: Shows the bot menu with all available commands
 */

const { generateMenu } = require('../menu/builder');

module.exports = {
  name: 'menu',
  pattern: 'menu',
  aliases: ['help', 'commands', 'h'],
  category: '📊 Info',
  description: 'Shows the bot menu with all available commands',
  usage: '<style> | <category> | <command>',
  permissions: [],
  
  async execute(sock, message, args, context) {
    const { registry, isOwner } = context;
    
    // Get all registered commands
    const commands = registry.getAllCommands();
    
    // Check if user wants specific category or command help
    const query = args.join(' ').toLowerCase();
    
    if (query) {
      // Check if it's a category
      const categoryCommands = commands.filter(cmd => 
        cmd.category && cmd.category.toLowerCase().includes(query)
      );
      
      if (categoryCommands.length > 0) {
        const menuData = generateMenu(categoryCommands, 'normal', isOwner);
        await sock.sendMessage(message.key.remoteJid, { text: menuData.text });
        return;
      }
      
      // Check if it's a specific command
      const cmd = registry.getCommand(query.replace(/^\.?/, ''));
      if (cmd) {
        const helpData = require('../menu/builder').getCommandHelp(cmd);
        await sock.sendMessage(message.key.remoteJid, { text: helpData.text });
        return;
      }
      
      // Try to match style
      const validStyles = ['normal', 'button', 'image', 'image-button'];
      if (validStyles.includes(query)) {
        const menuData = generateMenu(commands, query, isOwner);
        await sock.sendMessage(message.key.remoteJid, { text: menuData.text });
        return;
      }
    }
    
    // Default: show full menu
    const menuData = generateMenu(commands, 'normal', isOwner);
    await sock.sendMessage(message.key.remoteJid, { text: menuData.text });
  }
};
