const { updateProtection, getProtection } = require('../utils/protection.js');
const command = {
  pattern: 'antibadword',
  aliases: ['antiprofanity', 'badword'],
  description: 'Configure anti-bad-word protection for groups',
  category: 'protection',
  usage: '<on|off|add <word>|remove <word>|list|action <warn|kick>>',
  ownerOnly: false,
  groupOnly: true,
  
  async handler(sock, message, args, context) {
    const { isOwner, isAdmin, reply, isGroup } = context;
    
    if (!isGroup) {
      return reply('❌ This command can only be used in groups');
    }
    
    if (!isOwner && !isAdmin) {
      return reply('❌ Only admins can configure anti-bad-word');
    }
    
    const action = args[0]?.toLowerCase();
    
    if (!action) {
      const setting = await getProtection('antibadword');
      
      return reply(
        `🛡️ *Anti-Bad-Word Protection*\n\n` +
        `Status: ${setting.enabled ? '✅ ON' : '❌ OFF'}\n` +
        `Words blocked: ${setting.words?.length || 0}\n` +
        `Action: ${setting.action || 'warn'}\n\n` +
        `*Usage:*\n` +
        `.antibadword on - Enable protection\n` +
        `.antibadword off - Disable protection\n` +
        `.antibadword-add fuck - Add word to block list\n` +
        `.antibadword-remove fuck - Remove word from list\n` +
        `.antibadword-list - Show blocked words\n` +
        `.antibadword action warn - Set action to warn\n` +
        `.antibadword action kick - Set action to kick`
      );
    }
    
    if (action === 'on') {
      await updateProtection('antibadword', { enabled: true });
      return reply('✅ Anti-bad-word enabled');
    }
    
    if (action === 'off') {
      await updateProtection('antibadword', { enabled: false });
      return reply('❌ Anti-bad-word disabled');
    }
    
    // Handle sub-command with dash format
    if (action === 'antibadword-add' && args[1]) {
      const setting = await getProtection('antibadword');
      const word = args[1].toLowerCase();
      
      if (!setting.words) setting.words = [];
      if (!setting.words.includes(word)) {
        setting.words.push(word);
      }
      
      await updateProtection('antibadword', setting);
      return reply(`✅ Added "${word}" to block list`);
    }
    
    if (action === 'antibadword-remove' && args[1]) {
      const setting = await getProtection('antibadword');
      const word = args[1].toLowerCase();
      
      if (setting.words) {
        setting.words = setting.words.filter(w => w !== word);
      }
      
      await updateProtection('antibadword', setting);
      return reply(`✅ Removed "${word}" from block list`);
    }
    
    if (action === 'antibadword-list') {
      const setting = await getProtection('antibadword');
      const words = setting.words || [];
      
      if (words.length === 0) {
        return reply('📋 No words in block list');
      }
      
      return reply(
        `📋 *Blocked Words*\n\n` +
        words.map((w, i) => `${i + 1}. ${w}`).join('\n')
      );
    }
    
    if (action === 'action' && args[1]) {
      const validActions = ['warn', 'kick', 'mute'];
      const newAction = args[1].toLowerCase();
      
      if (!validActions.includes(newAction)) {
        return reply(`❌ Invalid action. Use: ${validActions.join(', ')}`);
      }
      
      const setting = await getProtection('antibadword');
      setting.action = newAction;
      
      await updateProtection('antibadword', setting);
      return reply(`✅ Action set to: ${newAction}`);
    }
    
    return reply('❌ Invalid command. Use: on, off, add, remove, list, or action');
  }
};

