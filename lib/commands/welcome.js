/**
 * Command: welcome
 * Category: automation
 * Description: Configure automatic welcome messages for group joins
 */

const { getAutomationManager } = require('../utils/automation-manager.js');
const { formatBox } = require('../utils/format.js');
const { isGroupAdmin } = require('../utils/permissions.js');
const command = {
  name: 'welcome',
  pattern: 'welcome',
  aliases: ['welcomemsg', 'autowelcome'],
  category: 'automation',
  description: 'Configure automatic welcome messages for group joins',
  usage: '.welcome [on|off] [message]',
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
      return reply(formatBox('WELCOME MESSAGE', [
        'Automatically send a message when users join the group.',
        '',
        'Usage:',
        '  .welcome on  <message> - Enable with message',
        '  .welcome off           - Disable welcome',
        '  .welcome               - Check current status',
        '',
        'Variables:',
        '  {user}     - Username',
        '  {mention}  - User mention (@number)',
        '  {group}    - Group name',
        '',
        'Example:',
        '  .welcome on Welcome {user} to {group}!'
      ]));
    }

    // Permission check
    const isAdmin = await isGroupAdmin(sock, chatId, senderJid);
    if (!isAdmin && !isOwner) {
      return reply('❌ You must be a group admin to configure welcome messages.');
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
        return reply('❌ Please provide a welcome message.\n\nExample: .welcome on Welcome {user} to the group!');
      }

      try {
        await automationMgr.setWelcome(chatId, true, messageText);

        return reply(formatBox('WELCOME ENABLED', [
          '✅ Welcome message configured!',
          '',
          `Message: ${messageText}`,
          '',
          'The bot will now greet new members when they join.'
        ]));

      } catch (error) {
        console.error('[Welcome] Enable error:', error.message);
        return reply('❌ Failed to configure welcome message.');
      }

    } else {
      // Disable
      try {
        await automationMgr.setWelcome(chatId, false, null);

        return reply(formatBox('WELCOME DISABLED', [
          '❌ Welcome message disabled.',
          '',
          'New members will no longer receive automatic greetings.'
        ]));

      } catch (error) {
        console.error('[Welcome] Disable error:', error.message);
        return reply('❌ Failed to disable welcome message.');
      }
    }
  }
};

