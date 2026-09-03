import { updateProtection, getProtection } from '../utils/protection.js';

export const command = {
  pattern: 'callreject',
  aliases: ['callblock', 'rejectcall'],
  description: 'Configure automatic call rejection',
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
      const setting = await getProtection('callReject');
      
      return reply(
        `🛡️ *Call Rejection*\n\n` +
        `Status: ${setting.enabled ? '✅ ON' : '❌ OFF'}\n` +
        `Allow Contacts: ${setting.allowContacts ? 'Yes' : 'No'}\n\n` +
        `*Usage:*\n` +
        `.callreject on - Enable auto call rejection\n` +
        `.callreject off - Disable call rejection\n` +
        `.callreject allow-contacts yes - Allow calls from contacts\n` +
        `.callreject allow-contacts no - Reject all calls\n` +
        `.callreject status - Show current settings`
      );
    }
    
    if (action === 'on') {
      await updateProtection('callReject', { enabled: true });
      return reply('✅ Call rejection enabled');
    }
    
    if (action === 'off') {
      await updateProtection('callReject', { enabled: false });
      return reply('❌ Call rejection disabled');
    }
    
    if (action === 'allow-contacts' && args[1]) {
      const value = args[1].toLowerCase() === 'yes';
      await updateProtection('callReject', { allowContacts: value });
      return reply(`✅ Allow contacts set to: ${value ? 'Yes' : 'No'}`);
    }
    
    if (action === 'status') {
      const setting = await getProtection('callReject');
      return reply(
        `🛡️ *Call Rejection Status*\n\n` +
        `Enabled: ${setting.enabled ? 'Yes' : 'No'}\n` +
        `Allow Contacts: ${setting.allowContacts ? 'Yes' : 'No'}`
      );
    }
    
    return reply('❌ Invalid command. Use: on, off, allow-contacts, or status');
  }
};

export default command;
