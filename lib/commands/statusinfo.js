const command = {
  pattern: 'statusinfo',
  aliases: ['statusconfig', 'statussettings'],
  description: 'Show current status feature configuration',
  category: 'status',
  usage: '',
  ownerOnly: true,
  groupOnly: false,

  async handler(sock, message, args, context) {
    const { reply, isOwner } = context;

    if (!isOwner) {
      return reply('❌ This command can only be used by the owner');
    }

    // Get current configuration
    const config = global.statusConfig || {};

    const autoviewConfig = config.autoview || { enabled: false, scope: 'none' };
    const autodlConfig = config.autodl || { enabled: false, scope: 'none' };
    const forwardConfig = config.statusforward || null;

    let response = '📊 *Status Features Configuration*\n\n';
    response += `👁️ *Auto-View:* ${autoviewConfig.enabled ? '✅ ON' : '❌ OFF'}\n`;
    response += `   Scope: ${autoviewConfig.scope}\n\n`;
    response += `💾 *Auto-Download:* ${autodlConfig.enabled ? '✅ ON' : '❌ OFF'}\n`;
    response += `   Scope: ${autodlConfig.scope}\n\n`;
    response += `📤 *Auto-Forward:* ${forwardConfig ? '✅ Configured' : '❌ Not set'}\n`;
    if (forwardConfig) {
      response += `   Destination: \`${forwardConfig.destination}\`\n`;
    }
    response += '\n*Commands:*\n';
    response += '`.autoview <on|off|contacts|all>`\n';
    response += '`.autodl <on|off|contacts|all>`\n';
    response += '`.statusforward <jid>` (reply to status)\n';
    response += '`.statussave` (reply to status)';

    return reply(response);
  }
};

module.exports = command;
