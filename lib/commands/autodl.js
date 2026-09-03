import { parseStatusAction } from '../utils/status.js';

export const command = {
  pattern: 'autodl',
  aliases: ['ads', 'autostatusdl', 'statusdl'],
  description: 'Configure automatic status media download',
  category: 'status',
  usage: '<on|off|contacts|all>',
  ownerOnly: true,
  groupOnly: false,

  async handler(sock, message, args, context) {
    const { isOwner, reply, senderJid } = context;

    if (!isOwner) {
      return reply('❌ This command can only be used by the owner');
    }

    const action = args[0]?.toLowerCase();
    const parsed = parseStatusAction(action);

    if (parsed.action === 'help' || !action) {
      return reply(
        '💾 *Auto-Download Status*\\n\\n' +
        'Automatically download contacts\' WhatsApp status media.\\n\\n' +
        '*Usage:*\\n' +
        '`.autodl on` - Enable for all statuses\\n' +
        '`.autodl off` - Disable auto-download\\n' +
        '`.autodl contacts` - Download only saved contacts\\n' +
        '`.autodl all` - Download all statuses\\n\\n' +
        '*Note:* Downloaded media is stored temporarily (48 hours).'
      );
    }

    if (parsed.action === 'invalid') {
      return reply(
        '❌ Invalid option. Use:\\n' +
        '• `on` - Enable for all\\n' +
        '• `off` - Disable\\n' +
        '• `contacts` - Contacts only\\n' +
        '• `all` - All statuses'
      );
    }

    // Store configuration in a global state (in production, use database)
    if (!global.statusConfig) {
      global.statusConfig = {};
    }

    switch (parsed.action) {
      case 'enable':
      case 'all':
        global.statusConfig.autodl = { enabled: true, scope: 'all' };
        return reply('✅ Auto-download enabled for ALL statuses');

      case 'contacts':
        global.statusConfig.autodl = { enabled: true, scope: 'contacts' };
        return reply('✅ Auto-download enabled for CONTACTS only');

      case 'disable':
        global.statusConfig.autodl = { enabled: false, scope: 'none' };
        return reply('❌ Auto-download disabled');

      default:
        return reply('❌ Unknown action');
    }
  }
};

export default command;
