/**
 * Command: autoread
 * Category: automation
 * Description: Configure automatic message read receipts
 */

const { getAutomationManager } = require('../utils/automation-manager.js');
const { formatBox } = require('../utils/format.js');
const { isGroupAdmin, isOwner } = require('../utils/permissions.js');
const command = {
  name: 'autoread',
  pattern: 'autoread',
  aliases: ['ar', 'readreceipt'],
  category: 'automation',
  description: 'Configure automatic message read receipts',
  usage: '.autoread [on|off] [global|group]',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const { reply, chatId, isGroup, senderJid, isOwner: checkIsOwner } = context;
    
    const action = args[0]?.toLowerCase();
    const scope = args[1]?.toLowerCase() || (isGroup ? 'group' : 'global');

    // Get automation manager
    const automationMgr = getAutomationManager(sock, context.config, context.db);

    // Show help if no action
    if (!action || action === 'help') {
      return reply(formatBox('AUTO-READ', [
        'Automatically mark messages as read.',
        '',
        'Usage:',
        '  .autoread on       - Enable globally',
        '  .autoread off      - Disable globally',
        '  .autoread on group - Enable for this group',
        '  .autoread off group- Disable for this group',
        '',
        'Note: Auto-reading reveals your presence to contacts.'
      ]));
    }

    // Permission checks
    if (scope === 'global' && !checkIsOwner) {
      return reply('❌ Global automation can only be configured by the owner.');
    }

    if (scope === 'group' && isGroup) {
      const isAdmin = await isGroupAdmin(sock, chatId, senderJid);
      if (!isAdmin && !checkIsOwner) {
        return reply('❌ You must be a group admin to configure group automation.');
      }
    }

    // Validate action
    if (!['on', 'off', 'enable', 'disable'].includes(action)) {
      return reply('❌ Invalid action. Use "on" or "off".');
    }

    const enabled = action === 'on' || action === 'enable';
    const actualScope = scope === 'group' && isGroup ? 'group' : 'global';
    const scopeId = actualScope === 'group' ? chatId : null;

    try {
      await automationMgr.setAutomation('autoread', enabled, actualScope, scopeId);

      const scopeText = actualScope === 'group' ? `for this group` : 'globally';
      const statusText = enabled ? '✅ enabled' : '❌ disabled';

      return reply(formatBox('AUTO-READ', [
        `Auto-read ${statusText} ${scopeText}`,
        '',
        enabled ? 'Messages will now be automatically marked as read.' : 'Messages will no longer be auto-read.'
      ]));

    } catch (error) {
      console.error('[Autoread] Error:', error.message);
      return reply('❌ Failed to configure auto-read.');
    }
  }
};

