const { updateProtection, getProtection } = require('../utils/protection.js');
const command = {
  pattern: 'antibot',
  aliases: ['botblock'],
  description: 'Configure anti-bot protection for groups',
  category: 'protection',
  usage: '<on|off|ignore-admins <yes|no>|status>',
  ownerOnly: false,
  groupOnly: true,
  
  async handler(sock, message, args, context) {
    const { isOwner, isAdmin, reply, isGroup } = context;
    
    if (!isGroup) {
      return reply('❌ This command can only be used in groups');
    }
    
    if (!isOwner && !isAdmin) {
      return reply('❌ Only admins can configure anti-bot');
    }
    
    const action = args[0]?.toLowerCase();
    
    if (!action) {
      const setting = await getProtection('antibot');
      
      return reply(
        `🛡️ *Anti-Bot Protection*\n\n` +
        `Status: ${setting.enabled ? '✅ ON' : '❌ OFF'}\n` +
        `Ignore Admins: ${setting.ignoreAdmins ? 'Yes' : 'No'}\n\n` +
        `*Usage:*\n` +
        `.antibot on - Enable anti-bot\n` +
        `.antibot off - Disable anti-bot\n` +
        `.antibot ignore-admins yes - Don't remove admin bots\n` +
        `.antibot ignore-admins no - Remove all bots including admins\n` +
        `.antibot status - Show current settings`
      );
    }
    
    if (action === 'on') {
      await updateProtection('antibot', { enabled: true });
      return reply('✅ Anti-bot enabled for this group');
    }
    
    if (action === 'off') {
      await updateProtection('antibot', { enabled: false });
      return reply('❌ Anti-bot disabled');
    }
    
    if (action === 'ignore-admins' && args[1]) {
      const value = args[1].toLowerCase() === 'yes';
      await updateProtection('antibot', { ignoreAdmins: value });
      return reply(`✅ Ignore admins set to: ${value ? 'Yes' : 'No'}`);
    }
    
    if (action === 'status') {
      const setting = await getProtection('antibot');
      return reply(
        `🛡️ *Anti-Bot Status*\n\n` +
        `Enabled: ${setting.enabled ? 'Yes' : 'No'}\n` +
        `Ignore Admins: ${setting.ignoreAdmins ? 'Yes' : 'No'}`
      );
    }
    
    return reply('❌ Invalid command. Use: on, off, ignore-admins, or status');
  }
};

// Missing module.exports fixed
module.exports = command;
