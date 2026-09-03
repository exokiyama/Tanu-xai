import { updateProtection, getProtection } from '../utils/protection.js';

export const command = {
  pattern: 'pmprotection',
  aliases: ['pmp', 'pm-block'],
  description: 'Configure PM (private message) protection',
  category: 'protection',
  usage: '<on|off|allow-contacts <yes|no>|status>',
  ownerOnly: true,
  groupOnly: false,
  
  async handler(sock, message, args, context) {
    const { isOwner, reply } = context;
    
    if (!isOwner) {
      return reply('❌ This command can only be used by the owner');
    }
    
    const action = args[0]?.toLowerCase();
    
    if (!action) {
      const setting = await getProtection('pmProtection');
      
      return reply(
        `🛡️ *PM Protection*\n\n` +
        `Status: ${setting.enabled ? '✅ ON' : '❌ OFF'}\n` +
        `Allow Contacts: ${setting.allowContacts ? 'Yes' : 'No'}\n` +
        `Allow Groups: ${setting.allowGroups ? 'Yes' : 'No'}\n\n` +
        `*Usage:*\n` +
        `.pmprotection on - Enable PM protection\n` +
        `.pmprotection off - Disable PM protection\n` +
        `.pmprotection allow-contacts yes - Allow known contacts\n` +
        `.pmprotection allow-contacts no - Block all PMs\n` +
        `.pmprotection status - Show current settings`
      );
    }
    
    if (action === 'on') {
      await updateProtection('pmProtection', { enabled: true });
      return reply('✅ PM protection enabled');
    }
    
    if (action === 'off') {
      await updateProtection('pmProtection', { enabled: false });
      return reply('❌ PM protection disabled');
    }
    
    if (action === 'allow-contacts' && args[1]) {
      const value = args[1].toLowerCase() === 'yes';
      await updateProtection('pmProtection', { allowContacts: value });
      return reply(`✅ Allow contacts set to: ${value ? 'Yes' : 'No'}`);
    }
    
    if (action === 'status') {
      const setting = await getProtection('pmProtection');
      return reply(
        `🛡️ *PM Protection Status*\n\n` +
        `Enabled: ${setting.enabled ? 'Yes' : 'No'}\n` +
        `Allow Contacts: ${setting.allowContacts ? 'Yes' : 'No'}\n` +
        `Allow Groups: ${setting.allowGroups ? 'Yes' : 'No'}`
      );
    }
    
    return reply('❌ Invalid command. Use: on, off, allow-contacts, or status');
  }
};

export default command;
