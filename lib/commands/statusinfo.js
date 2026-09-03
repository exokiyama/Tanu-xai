export const command = {
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

    return reply(
      '📊 *Status Features Configuration*\\n\\n' +
      `👁️ *Auto-View:* ${autoviewConfig.enabled ? '✅ ON' : '❌ OFF'}\\n` +
      `   Scope: ${autoviewConfig.scope}\\n\\n` +
      `💾 *Auto-Download:* ${autodlConfig.enabled ? '✅ ON' : '❌ OFF'}\\n` +
      `   Scope: ${autodlConfig.scope}\\n\\n` +
      `📤 *Auto-Forward:* ${forwardConfig ? '✅ Configured' : '❌ Not set'}\\n` +
      (forwardConfig ? `   Destination: \\`${forwardConfig.destination}\\n` : '') +
      '\\n' +
      '*Commands:*\\n' +
      '`.autoview <on|off|contacts|all>`\\n' +
      '`.autodl <on|off|contacts|all>`\\n' +
      '`.statusforward <jid>` (reply to status)\\n' +
      '`.statussave` (reply to status)'
    );
  }
};

export default command;
