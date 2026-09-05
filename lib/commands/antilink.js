const { updateProtection, getProtection } = require('../utils/protection.js');
const command = {
  pattern: 'antilink',
  aliases: ['alink'],
  description: 'Configure anti-link protection for groups',
  category: 'protection',
  usage: '<on|off|whitelist-add <domain>|whitelist-remove <domain>|status>',
  ownerOnly: false,
  groupOnly: true,
  
  async handler(sock, message, args, context) {
    const { isOwner, isAdmin, reply, isGroup } = context;
    
    if (!isGroup) {
      return reply('❌ This command can only be used in groups');
    }
    
    if (!isOwner && !isAdmin) {
      return reply('❌ Only admins can configure anti-link');
    }
    
    const action = args[0]?.toLowerCase();
    
    if (!action) {
      const setting = await getProtection('antilink');
      
      return reply(
        `🛡️ *Anti-Link Protection*\n\n` +
        `Status: ${setting.enabled ? '✅ ON' : '❌ OFF'}\n` +
        `Whitelist: ${setting.whitelist?.length || 0} domains\n\n` +
        `*Usage:*\n` +
        `.antilink on - Enable anti-link\n` +
        `.antilink off - Disable anti-link\n` +
        `.antilink whitelist-add youtube.com - Add domain to whitelist\n` +
        `.antilink whitelist-remove youtube.com - Remove from whitelist\n` +
        `.antilink status - Show current settings`
      );
    }
    
    if (action === 'on') {
      await updateProtection('antilink', { enabled: true });
      return reply('✅ Anti-link enabled for this group');
    }
    
    if (action === 'off') {
      await updateProtection('antilink', { enabled: false });
      return reply('❌ Anti-link disabled');
    }
    
    if (action === 'whitelist-add' && args[1]) {
      const setting = await getProtection('antilink');
      const domain = args[1].toLowerCase();
      
      if (!setting.whitelist) setting.whitelist = [];
      if (!setting.whitelist.includes(domain)) {
        setting.whitelist.push(domain);
      }
      
      await updateProtection('antilink', setting);
      return reply(`✅ Added ${domain} to whitelist`);
    }
    
    if (action === 'whitelist-remove' && args[1]) {
      const setting = await getProtection('antilink');
      const domain = args[1].toLowerCase();
      
      if (setting.whitelist) {
        setting.whitelist = setting.whitelist.filter(d => d !== domain);
      }
      
      await updateProtection('antilink', setting);
      return reply(`✅ Removed ${domain} from whitelist`);
    }
    
    if (action === 'status') {
      const setting = await getProtection('antilink');
      return reply(
        `🛡️ *Anti-Link Status*\n\n` +
        `Enabled: ${setting.enabled ? 'Yes' : 'No'}\n` +
        `Whitelist:\n${setting.whitelist?.map(d => `• ${d}`).join('\n') || '• None'}`
      );
    }
    
    return reply('❌ Invalid command. Use: on, off, whitelist-add, whitelist-remove, or status');
  }
};

