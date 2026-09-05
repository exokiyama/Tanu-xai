const { parseStatusAction } = require('../utils/status.js');
const command = {
  pattern: 'autoview',
  aliases: ['av', 'autostatusview'],
  description: 'Configure automatic status viewing',
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
        '👁️ *Auto-View Status*\\n\\n' +
        'Automatically view contacts\' WhatsApp statuses.\\n\\n' +
        '*Usage:*\\n' +
        '`.autoview on` - Enable for all statuses\\n' +
        '`.autoview off` - Disable auto-view\\n' +
        '`.autoview contacts` - View only saved contacts\\n' +
        '`.autoview all` - View all statuses\\n\\n' +
        '*Note:* Auto-viewing reveals your presence to contacts.'
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
    // For now, we'll use a simple in-memory store
    if (!global.statusConfig) {
      global.statusConfig = {};
    }

    switch (parsed.action) {
      case 'enable':
      case 'all':
        global.statusConfig.autoview = { enabled: true, scope: 'all' };
        return reply('✅ Auto-view enabled for ALL statuses');

      case 'contacts':
        global.statusConfig.autoview = { enabled: true, scope: 'contacts' };
        return reply('✅ Auto-view enabled for CONTACTS only');

      case 'disable':
        global.statusConfig.autoview = { enabled: false, scope: 'none' };
        return reply('❌ Auto-view disabled');

      default:
        return reply('❌ Unknown action');
    }
  }
};

// Missing module.exports fixed
module.exports = command;
