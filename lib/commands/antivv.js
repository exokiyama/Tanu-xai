const { updateProtection, getProtection, parseProtectionScope } = require('../utils/protection.js');
const command = {
  pattern: 'antivv',
  aliases: ['antiviewonce', 'avv', 'viewonce'],
  description: 'Configure anti-view-once protection with scope options',
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
      const setting = await getProtection('antivv');
      const parsed = parseProtectionScope(setting.scope);
      
      return reply(
        `🛡️ *Anti-ViewOnce Protection*\n\n` +
        `Status: ${setting.enabled ? '✅ ON' : '❌ OFF'}\n` +
        `Scope: ${setting.scope}\n` +
        `Type: ${parsed.type}\n\n` +
        `*Usage:*\n` +
        `.antivv on - Enable for all\n` +
        `.antivv off - Disable completely\n` +
        `.antivv g - Groups only\n` +
        `.antivv p - Bot/owner/sudo PM\n` +
        `.antivv pm - PM only\n` +
        `.antivv gm - Group only\n` +
        `.antivv no-pm - Exclude PM\n` +
        `.antivv no-gm - Exclude groups\n` +
        `.antivv <jid> - Specific chat/user`
      );
    }
    
    if (action === 'on') {
      await updateProtection('antivv', { enabled: true, scope: 'g,p' });
      return reply('✅ Anti-ViewOnce enabled for groups and bot PM');
    }
    
    if (action === 'off') {
      await updateProtection('antivv', { enabled: false, scope: 'off' });
      return reply('❌ Anti-ViewOnce disabled');
    }
    
    const validScopes = ['g', 'p', 'pm', 'gm', 'no-pm', 'no-gm'];
    const jidRegex = /^[0-9]{5,16}@[sg]\.whatsapp\.net$/;
    
    if (validScopes.includes(action)) {
      await updateProtection('antivv', { enabled: true, scope: action });
      return reply(`✅ Anti-ViewOnce scope set to: ${action}`);
    }
    
    if (jidRegex.test(action)) {
      await updateProtection('antivv', { enabled: true, scope: action });
      return reply(`✅ Anti-ViewOnce enabled for specific JID: ${action}`);
    }
    
    return reply('❌ Invalid scope. Use: on, off, g, p, pm, gm, no-pm, no-gm, or a valid JID');
  }
};

