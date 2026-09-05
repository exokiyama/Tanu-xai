const { updateProtection, getProtection, parseProtectionScope } = require('../utils/protection.js');
const command = {
  pattern: 'antidelete',
  aliases: ['antidel', 'adelete'],
  description: 'Configure anti-delete protection with scope options',
  category: 'protection',
  usage: '<on|off|g|p|pm|gm|no-pm|no-gm|jid>',
  ownerOnly: true,
  groupOnly: false,
  
  async handler(sock, message, args, context) {
    const { isOwner, reply } = context;
    
    if (!isOwner) {
      return reply('❌ This command can only be used by the owner');
    }
    
    const action = args[0]?.toLowerCase();
    
    if (!action) {
      const setting = await getProtection('antidelete');
      const parsed = parseProtectionScope(setting.scope);
      
      return reply(
        `🛡️ *Anti-Delete Protection*\n\n` +
        `Status: ${setting.enabled ? '✅ ON' : '❌ OFF'}\n` +
        `Scope: ${setting.scope}\n` +
        `Type: ${parsed.type}\n\n` +
        `*Usage:*\n` +
        `.antidelete on - Enable for all\n` +
        `.antidelete off - Disable completely\n` +
        `.antidelete g - Groups only\n` +
        `.antidelete p - Bot/owner/sudo PM\n` +
        `.antidelete pm - PM only\n` +
        `.antidelete gm - Group only (same as g)\n` +
        `.antidelete no-pm - Exclude PM\n` +
        `.antidelete no-gm - Exclude groups\n` +
        `.antidelete <jid> - Specific chat/user`
      );
    }
    
    if (action === 'on') {
      await updateProtection('antidelete', { enabled: true, scope: 'g,p' });
      return reply('✅ Anti-delete enabled for groups and bot PM');
    }
    
    if (action === 'off') {
      await updateProtection('antidelete', { enabled: false, scope: 'off' });
      return reply('❌ Anti-delete disabled');
    }
    
    // Parse scope
    const validScopes = ['g', 'p', 'pm', 'gm', 'no-pm', 'no-gm'];
    const jidRegex = /^[0-9]{5,16}@[sg]\.whatsapp\.net$/;
    
    if (validScopes.includes(action)) {
      await updateProtection('antidelete', { enabled: true, scope: action });
      return reply(`✅ Anti-delete scope set to: ${action}`);
    }
    
    if (jidRegex.test(action)) {
      await updateProtection('antidelete', { enabled: true, scope: action });
      return reply(`✅ Anti-delete enabled for specific JID: ${action}`);
    }
    
    return reply('❌ Invalid scope. Use: on, off, g, p, pm, gm, no-pm, no-gm, or a valid JID');
  }
};

// Missing module.exports fixed
module.exports = command;
