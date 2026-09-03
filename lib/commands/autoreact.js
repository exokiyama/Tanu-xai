/**
 * Command: autoreact
 * Category: automation
 * Description: Configure automatic emoji reactions to messages
 */

import { getAutomationManager } from '../utils/automation-manager.js';
import { formatBox } from '../utils/format.js';
import { isGroupAdmin } from '../utils/permissions.js';

export const command = {
  name: 'autoreact',
  pattern: 'autoreact',
  aliases: ['react', 'autoreaction'],
  category: 'automation',
  description: 'Configure automatic emoji reactions to messages',
  usage: '.autoreact [add|remove|list] [options]',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const { reply, chatId, isGroup, senderJid, isOwner } = context;

    // Get automation manager
    const automationMgr = getAutomationManager(sock, context.config, context.db);

    const subcommand = args[0]?.toLowerCase();

    // Show help if no subcommand
    if (!subcommand || subcommand === 'help') {
      return reply(formatBox('AUTO-REACT', [
        'Automatically react to messages with emojis.',
        '',
        'Usage:',
        '  .autoreact add <type> <trigger> | <emoji>',
        '  .autoreact remove <id>',
        '  .autoreact list',
        '',
        'Trigger types:',
        '  exact    - Exact match',
        '  contains - Contains keyword',
        '  keyword  - Any of comma-separated keywords',
        '  regex    - Regular expression',
        '',
        'Note: Reactions are rate-limited (5 per minute per chat)'
      ]));
    }

    // Permission checks for group scope
    if (isGroup) {
      const isAdmin = await isGroupAdmin(sock, chatId, senderJid);
      if (!isAdmin && !isOwner) {
        return reply('❌ You must be a group admin to configure auto-react.');
      }
    }

    switch (subcommand) {
      case 'add':
        return handleAdd(automationMgr, reply, args, isGroup, chatId);
      
      case 'remove':
      case 'del':
      case 'delete':
        return handleRemove(automationMgr, reply, args);
      
      case 'list':
      case 'show':
      case 'all':
        return handleList(automationMgr, reply);
      
      default:
        return reply('❌ Unknown subcommand. Use: add, remove, or list');
    }
  }
};

async function handleAdd(mgr, reply, args, isGroup, chatId) {
  // Format: .autoreact add <type> <trigger> | <emoji>
  if (args.length < 4) {
    return reply('❌ Usage: .autoreact add <type> <trigger> | <emoji>');
  }

  const triggerType = args[1].toLowerCase();
  
  // Validate trigger type
  const validTypes = ['exact', 'contains', 'keyword', 'regex'];
  if (!validTypes.includes(triggerType)) {
    return reply(`❌ Invalid trigger type. Use: ${validTypes.join(', ')}`);
  }

  // Find the separator between trigger and emoji
  const fullArgs = args.slice(2).join(' ');
  const separatorIndex = fullArgs.indexOf('|');
  
  if (separatorIndex === -1) {
    return reply('❌ Use | to separate trigger and emoji');
  }

  const triggerValue = fullArgs.substring(0, separatorIndex).trim();
  const emoji = fullArgs.substring(separatorIndex + 1).trim();

  if (!triggerValue || !emoji) {
    return reply('❌ Both trigger and emoji are required');
  }

  try {
    const scope = isGroup ? 'group' : 'global';
    const scopeId = isGroup ? chatId : null;

    const rule = await mgr.addAutoReact(triggerType, triggerValue, emoji, scope, scopeId);

    return reply(formatBox('AUTO-REACT ADDED', [
      `✅ Rule #${rule.id} created`,
      '',
      `Type: ${triggerType}`,
      `Trigger: ${triggerValue}`,
      `Emoji: ${emoji}`,
      '',
      'The bot will now automatically react with this emoji when the trigger is matched.'
    ]));

  } catch (error) {
    console.error('[Autoreact] Add error:', error.message);
    return reply('❌ Failed to add auto-react rule.');
  }
}

async function handleRemove(mgr, reply, args) {
  if (args.length < 2) {
    return reply('❌ Usage: .autoreact remove <id>');
  }

  const ruleId = args[1];

  try {
    await mgr.removeAutoReact(ruleId);

    return reply(formatBox('AUTO-REACT REMOVED', [
      `✅ Rule #${ruleId} removed`,
      '',
      'The bot will no longer auto-react to this trigger.'
    ]));

  } catch (error) {
    console.error('[Autoreact] Remove error:', error.message);
    return reply('❌ Failed to remove auto-react rule.');
  }
}

async function handleList(mgr, reply) {
  try {
    const rules = mgr.listAutoReactRules();

    if (rules.length === 0) {
      return reply(formatBox('AUTO-REACT', [
        'No auto-react rules configured.',
        '',
        'Use .autoreact add to create a rule.'
      ]));
    }

    const ruleList = rules.map((rule, index) => {
      const status = rule.enabled ? '🟢' : '🔴';
      return `${index + 1}. [${status}] #${rule.id} | ${rule.triggerType}: "${rule.triggerValue}" → ${rule.emoji}`;
    });

    return reply(formatBox('AUTO-REACT RULES', [
      `Total rules: ${rules.length}`,
      '',
      ...ruleList,
      '',
      'Use .autoreact remove <id> to delete a rule.'
    ]));

  } catch (error) {
    console.error('[Autoreact] List error:', error.message);
    return reply('❌ Failed to list auto-react rules.');
  }
}

export default command;
