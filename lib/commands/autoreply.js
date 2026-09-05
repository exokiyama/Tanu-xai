/**
 * Command: autoreply
 * Category: automation
 * Description: Configure automatic replies to message triggers
 */

const { getAutomationManager } = require('../utils/automation-manager.js');
const { formatBox } = require('../utils/format.js');
const { isGroupAdmin } = require('../utils/permissions.js');
const command = {
  name: 'autoreply',
  pattern: 'autoreply',
  aliases: ['ar', 'autoresponse', 'chatbot'],
  category: 'automation',
  description: 'Configure automatic replies to message triggers',
  usage: '.autoreply [add|remove|list] [options]',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const { reply, chatId, isGroup, senderJid, isOwner } = context;

    // Get automation manager
    const automationMgr = getAutomationManager(sock, context.config, context.db);

    const subcommand = args[0]?.toLowerCase();

    // Show help if no subcommand
    if (!subcommand || subcommand === 'help') {
      return reply(formatBox('AUTO-REPLY', [
        'Automatically reply to messages matching triggers.',
        '',
        'Usage:',
        '  .autoreply add <type> <trigger> <response>',
        '  .autoreply remove <id>',
        '  .autoreply list',
        '',
        'Trigger types:',
        '  exact    - Exact match',
        '  contains - Contains keyword',
        '  keyword  - Any of comma-separated keywords',
        '  regex    - Regular expression',
        '',
        'Variables in response:',
        '  {sender} - Sender name',
        '  {time}   - Current time',
        '  {group}  - Group name'
      ]));
    }

    // Permission checks for group scope
    if (isGroup) {
      const isAdmin = await isGroupAdmin(sock, chatId, senderJid);
      if (!isAdmin && !isOwner) {
        return reply('❌ You must be a group admin to configure auto-reply.');
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
  // Format: .autoreply add <type> <trigger> <response>
  if (args.length < 4) {
    return reply('❌ Usage: .autoreply add <type> <trigger> | <response>');
  }

  const triggerType = args[1].toLowerCase();
  
  // Validate trigger type
  const validTypes = ['exact', 'contains', 'keyword', 'regex'];
  if (!validTypes.includes(triggerType)) {
    return reply(`❌ Invalid trigger type. Use: ${validTypes.join(', ')}`);
  }

  // Find the separator between trigger and response
  // User can use | as separator
  const fullArgs = args.slice(2).join(' ');
  const separatorIndex = fullArgs.indexOf('|');
  
  if (separatorIndex === -1) {
    return reply('❌ Use | to separate trigger and response');
  }

  const triggerValue = fullArgs.substring(0, separatorIndex).trim();
  const response = fullArgs.substring(separatorIndex + 1).trim();

  if (!triggerValue || !response) {
    return reply('❌ Both trigger and response are required');
  }

  try {
    const scope = isGroup ? 'group' : 'global';
    const scopeId = isGroup ? chatId : null;

    const rule = await mgr.addAutoReply(triggerType, triggerValue, response, scope, scopeId);

    return reply(formatBox('AUTO-REPLY ADDED', [
      `✅ Rule #${rule.id} created`,
      '',
      `Type: ${triggerType}`,
      `Trigger: ${triggerValue}`,
      `Response: ${response}`,
      '',
      'The bot will now automatically reply when this trigger is matched.'
    ]));

  } catch (error) {
    console.error('[Autoreply] Add error:', error.message);
    return reply('❌ Failed to add auto-reply rule.');
  }
}

async function handleRemove(mgr, reply, args) {
  if (args.length < 2) {
    return reply('❌ Usage: .autoreply remove <id>');
  }

  const ruleId = args[1];

  try {
    await mgr.removeAutoReply(ruleId);

    return reply(formatBox('AUTO-REPLY REMOVED', [
      `✅ Rule #${ruleId} removed`,
      '',
      'The bot will no longer auto-reply to this trigger.'
    ]));

  } catch (error) {
    console.error('[Autoreply] Remove error:', error.message);
    return reply('❌ Failed to remove auto-reply rule.');
  }
}

async function handleList(mgr, reply) {
  try {
    const rules = mgr.listAutoReplyRules();

    if (rules.length === 0) {
      return reply(formatBox('AUTO-REPLY', [
        'No auto-reply rules configured.',
        '',
        'Use .autoreply add to create a rule.'
      ]));
    }

    const ruleList = rules.map((rule, index) => {
      const status = rule.enabled ? '🟢' : '🔴';
      return `${index + 1}. [${status}] #${rule.id} | ${rule.triggerType}: "${rule.triggerValue}" → ${rule.response.substring(0, 30)}...`;
    });

    return reply(formatBox('AUTO-REPLY RULES', [
      `Total rules: ${rules.length}`,
      '',
      ...ruleList,
      '',
      'Use .autoreply remove <id> to delete a rule.'
    ]));

  } catch (error) {
    console.error('[Autoreply] List error:', error.message);
    return reply('❌ Failed to list auto-reply rules.');
  }
}

// Missing module.exports fixed
module.exports = command;
