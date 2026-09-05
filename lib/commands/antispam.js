const { updateProtection, getProtection } = require('../utils/protection.js');
const command = {
  pattern: 'antispam',
  aliases: ['spam'],
  description: 'Configure anti-spam protection',
  category: 'protection',
  usage: '<on|off|threshold <num>|window <ms>|action <mute|kick>|status>',
  ownerOnly: true,
  groupOnly: false,
  
  async handler(sock, message, args, context) {
    const { isOwner, reply } = context;
    
    if (!isOwner) {
      return reply('❌ This command can only be used by the owner');
    }
    
    const action = args[0]?.toLowerCase();
    
    if (!action) {
      const setting = await getProtection('antispam');
      
      return reply(
        `🛡️ *Anti-Spam Protection*\n\n` +
        `Status: ${setting.enabled ? '✅ ON' : '❌ OFF'}\n` +
        `Threshold: ${setting.threshold || 10} messages\n` +
        `Window: ${setting.windowMs || 5000}ms\n` +
        `Action: ${setting.action || 'mute'}\n\n` +
        `*Usage:*\n` +
        `.antispam on - Enable anti-spam\n` +
        `.antispam off - Disable anti-spam\n` +
        `.antispam threshold 15 - Set message threshold\n` +
        `.antispam window 3000 - Set time window in ms\n` +
        `.antispam action kick - Set action (mute/kick)\n` +
        `.antispam status - Show current settings`
      );
    }
    
    if (action === 'on') {
      await updateProtection('antispam', { enabled: true });
      return reply('✅ Anti-spam enabled');
    }
    
    if (action === 'off') {
      await updateProtection('antispam', { enabled: false });
      return reply('❌ Anti-spam disabled');
    }
    
    if (action === 'threshold' && args[1]) {
      const num = parseInt(args[1]);
      if (isNaN(num) || num < 1) {
        return reply('❌ Threshold must be a positive number');
      }
      
      await updateProtection('antispam', { threshold: num });
      return reply(`✅ Threshold set to: ${num} messages`);
    }
    
    if (action === 'window' && args[1]) {
      const num = parseInt(args[1]);
      if (isNaN(num) || num < 1000) {
        return reply('❌ Window must be at least 1000ms');
      }
      
      await updateProtection('antispam', { windowMs: num });
      return reply(`✅ Time window set to: ${num}ms`);
    }
    
    if (action === 'action' && args[1]) {
      const validActions = ['mute', 'kick'];
      const newAction = args[1].toLowerCase();
      
      if (!validActions.includes(newAction)) {
        return reply(`❌ Invalid action. Use: ${validActions.join(', ')}`);
      }
      
      await updateProtection('antispam', { action: newAction });
      return reply(`✅ Action set to: ${newAction}`);
    }
    
    if (action === 'status') {
      const setting = await getProtection('antispam');
      return reply(
        `🛡️ *Anti-Spam Status*\n\n` +
        `Enabled: ${setting.enabled ? 'Yes' : 'No'}\n` +
        `Threshold: ${setting.threshold || 10} messages\n` +
        `Window: ${setting.windowMs || 5000}ms\n` +
        `Action: ${setting.action || 'mute'}`
      );
    }
    
    return reply('❌ Invalid command. Use: on, off, threshold, window, action, or status');
  }
};

// Missing module.exports fixed
module.exports = command;
