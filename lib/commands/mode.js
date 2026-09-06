const { checkPermission, setBotMode, getBotMode } = require('../utils/permissions.js');

module.exports = {
  name: 'mode',
  pattern: 'mode',
  aliases: ['botmode', 'setmode'],
  description: 'Change bot operating mode',
  category: 'sudo',
  usage: '<public|private|dm|group>',
  ownerOnly: false,
  sudoAccessible: true,
  groupOnly: false,

  async handler(sock, message, args, context) {
    const { reply, senderJid } = context;
    const perm = await checkPermission(senderJid, 'sudo');
    if (!perm.allowed) return reply(`❌ ${perm.reason}`);

    const mode = String(args[0] || '').toLowerCase();
    if (!['public', 'private', 'dm', 'group'].includes(mode)) {
      return reply(
        `⚙️ Current mode: *${getBotMode().toUpperCase()}*\n\n` +
        `Usage: .mode <public|private|dm|group>\n\n` +
        `🌐 public — Everyone can use normal commands\n` +
        `🔒 private — Only main owner, bot owner and sudo\n` +
        `💬 dm — Commands only in private chats\n` +
        `👥 group — Commands only in groups`
      );
    }

    setBotMode(mode);
    return reply(`✅ Bot mode changed to *${mode.toUpperCase()}*.`);
  }
};
