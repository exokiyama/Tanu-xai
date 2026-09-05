/**
 * Command: goodbye
 * Category: automation
 * Description: Configure automatic goodbye messages for group leaves
 */

const { getAutomationManager } = require('../utils/automation-manager.js');
const { formatBox } = require('../utils/format.js');
const { isGroupAdmin } = require('../utils/permissions.js');
const command = {
  name: 'goodbye',
  pattern: 'goodbye',
  aliases: ['goodbyemsg', 'autogoodbye', 'bye'],
  category: 'automation',
  description: 'Configure automatic goodbye messages for group leaves',
  usage: '.goodbye [on|off] [message]',
  ownerOnly: false,
  groupOnly: true,

  async execute(sock, message, args, context) {
    const { reply, chatId, isGroup, senderJid, isOwner } = context;

    if (!isGroup) {
      return reply('❌ This command can only be used in groups.');
    }

    // Get automation manager
    const automationMgr = getAutomationManager(sock, context.config, context.db);

    const action = args[0]?.toLowerCase();

    // Show help if no action
    if (!action || action === 'help') {
      return reply(formatBox('GOODBYE MESSAGE', [
        'Automatically send a message when users leave the group.',
        '',
        'Usage:',
        '  .goodbye on  <message> - Enable with message',
        '  .goodbye off           - Disable goodbye',
        '  .goodbye               - Check current status',
        '',
        'Variables:',
        '  {user}     - Username',
        '  {mention}  - User mention (@number)',
        '  {group}    - Group name',
        '',
        'Example:',
        '  .goodbye on Goodbye {user}, see you later!'
      ]));
    }

    // Permission check
    const isAdmin = await isGroupAdmin(sock, chatId, senderJid);
    if (!isAdmin && !isOwner) {
      return reply('❌ You must be a group admin to configure goodbye messages.');
    }

    // Validate action
    if (!['on', 'off', 'enable', 'disable'].includes(action)) {
      return reply('❌ Invalid action. Use "on" or "off".');
    }

    const enabled = action === 'on' || action === 'enable';

    if (enabled) {
      // Extract message (everything after "on")
      const messageText = args.slice(1).join(' ').trim();
      
      if (!messageText) {
        return reply('❌ Please provide a goodbye message.\n\nExample: .goodbye on Goodbye {user}, see you later!');
      }

      try {
        await automationMgr.setGoodbye(chatId, true, messageText);

        return reply(formatBox('GOODBYE ENABLED', [
          '✅ Goodbye message configured!',
          '',
          `Message: ${messageText}`,
          '',
          'The bot will now send farewell when members leave.'
        ]));

      } catch (error) {
        console.error('[Goodbye] Enable error:', error.message);
        return reply('❌ Failed to configure goodbye message.');
      }

    } else {
      // Disable
      try {
        await automationMgr.setGoodbye(chatId, false, null);

        return reply(formatBox('GOODBYE DISABLED', [
          '❌ Goodbye message disabled.',
          '',
          'Farewell messages will no longer be sent when members leave.'
        ]));

      } catch (error) {
        console.error('[Goodbye] Disable error:', error.message);
        return reply('❌ Failed to disable goodbye message.');
      }
    }
  }
};

// Missing module.exports fixed
module.exports = command;
