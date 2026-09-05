const { updateProtection, getProtection } = require('../utils/protection.js');
const command = {
  pattern: 'antiedit',
  aliases: ['antiedited', 'aedit'],
  description: 'Configure anti-edit protection with scope options',
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
      const setting = await getProtection('antiedit');
      
      return reply(
        `🛡️ *Anti-Edit Protection*\n\n` +
        `Status: ${setting.enabled ? '✅ ON' : '❌ OFF'}\n` +
        `Scope: ${setting.scope}\n\n` +
        `*Usage:*\n` +
        `.antiedit on - Enable for all\n` +
        `.antiedit off - Disable completely\n` +
        `.antiedit g - Groups only\n` +
        `.antiedit p - Bot/owner/sudo PM\n` +
        `.antiedit pm - PM only\n` +
        `.antiedit gm - Group only\n` +
        `.antiedit no-pm - Exclude PM\n` +
        `.antiedit no-gm - Exclude groups\n` +
        `.antiedit <jid> - Specific chat/user`
      );
    }
    
    if (action === 'on') {
      await updateProtection('antiedit', { enabled: true, scope: 'g,p' });
      return reply('✅ Anti-edit enabled for groups and bot PM');
    }
    
    if (action === 'off') {
      await updateProtection('antiedit', { enabled: false, scope: 'off' });
      return reply('❌ Anti-edit disabled');
    }
    
    const validScopes = ['g', 'p', 'pm', 'gm', 'no-pm', 'no-gm'];
    const jidRegex = /^[0-9]{5,16}@[sg]\.whatsapp\.net$/;
    
    if (validScopes.includes(action)) {
      await updateProtection('antiedit', { enabled: true, scope: action });
      return reply(`✅ Anti-edit scope set to: ${action}`);
    }
    
    if (jidRegex.test(action)) {
      await updateProtection('antiedit', { enabled: true, scope: action });
      return reply(`✅ Anti-edit enabled for specific JID: ${action}`);
    }
    
    return reply('❌ Invalid scope. Use: on, off, g, p, pm, gm, no-pm, no-gm, or a valid JID');
  }
};

