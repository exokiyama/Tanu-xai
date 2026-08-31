import { proto, WASocket } from '@whiskeysockets/baileys';
import { buildMessageContext, shouldProcessMessage } from './messages.js';
import { pluginLoader } from '../utils/plugin-loader.js';
import { config } from '../core/config/index.js';
import { createModuleLogger } from '../core/logger/index.js';

const log = createModuleLogger('CMD');

export async function handleMessages(
  messages: { messages: proto.IWebMessageInfo[]; type: 'notify' | 'append' },
  sock: WASocket
): Promise<void> {
  for (const msg of messages.messages) {
    if (!shouldProcessMessage(msg)) {
      continue;
    }

    try {
      const ctx = await buildMessageContext(msg, sock);

      if (!ctx) {
        continue;
      }

      if (!ctx.command) {
        continue;
      }

      const plugin = pluginLoader.getCommand(ctx.command);

      if (!plugin) {
        continue;
      }

      log.info(`${ctx.command} | user=${ctx.sender} | chat=${ctx.chat}`);

      if (plugin.ownerOnly && !ctx.isOwner) {
        await sock.sendMessage(ctx.chat, { 
          text: '❌ Owner only command',
          quoted: msg
        });
        continue;
      }

      if (plugin.sudoOnly && !ctx.isSudo && !ctx.isOwner) {
        await sock.sendMessage(ctx.chat, {
          text: '❌ Sudo only command',
          quoted: msg
        });
        continue;
      }

      if (plugin.groupOnly && !ctx.isGroup) {
        await sock.sendMessage(ctx.chat, {
          text: '❌ Group only command',
          quoted: msg
        });
        continue;
      }

      if (plugin.botAdminRequired && !ctx.isBotAdmin) {
        await sock.sendMessage(ctx.chat, {
          text: '❌ Bot must be admin',
          quoted: msg
        });
        continue;
      }

      try {
        await plugin.execute(ctx);
      } catch (error: any) {
        log.error(`Plugin execution error: ${plugin.name}`, { 
          error: error.message,
          command: ctx.command,
          user: ctx.sender,
          chat: ctx.chat
        });
        await sock.sendMessage(ctx.chat, {
          text: `❌ Error: ${error.message}`,
          quoted: msg
        });
      }
    } catch (error: any) {
      log.error('Message handling error', { error: error.message });
    }
  }
}
