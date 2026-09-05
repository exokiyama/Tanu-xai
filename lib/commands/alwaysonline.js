/**
 * Command: alwaysonline
 * Category: automation
 * Description: Configure bot to always show online status
 */

const { getAutomationManager } = require('../utils/automation-manager.js');
const { formatBox } = require('../utils/format.js');
const command = {
  name: 'alwaysonline',
  pattern: 'alwaysonline',
  aliases: ['alwaysOnline', 'autoonline', 'presence'],
  category: 'automation',
  description: 'Configure bot to always show online status',
  usage: '.alwaysonline [on|off]',
  ownerOnly: true,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const { reply, isOwner } = context;

    if (!isOwner) {
      return reply('❌ This command can only be used by the owner.');
    }

    const action = args[0]?.toLowerCase();

    // Get automation manager
    const automationMgr = getAutomationManager(sock, context.config, context.db);

    // Show help if no action
    if (!action || action === 'help') {
      return reply(formatBox('ALWAYS ONLINE', [
        'Keep bot presence set to "online" continuously.',
        '',
        'Usage:',
        '  .alwaysonline on  - Enable always-online',
        '  .alwaysonline off - Disable always-online',
        '',
        'Note: Bot will appear as "online" in all chats when enabled.'
      ]));
    }

    // Validate action
    if (!['on', 'off', 'enable', 'disable'].includes(action)) {
      return reply('❌ Invalid action. Use "on" or "off".');
    }

    const enabled = action === 'on' || action === 'enable';

    try {
      await automationMgr.setAutomation('alwaysonline', enabled, 'global', null);

      const statusText = enabled ? '✅ enabled' : '❌ disabled';

      // Immediately send presence update
      if (enabled) {
        await sock.sendPresenceUpdate('available');
      }

      return reply(formatBox('ALWAYS ONLINE', [
        `Always-online ${statusText}`,
        '',
        enabled 
          ? 'Bot will now appear as "online" in all chats.' 
          : 'Bot presence will return to normal behavior.'
      ]));

    } catch (error) {
      console.error('[AlwaysOnline] Error:', error.message);
      return reply('❌ Failed to configure always-online.');
    }
  }
};

