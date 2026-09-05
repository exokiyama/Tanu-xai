const { isProtectionEnabled, getProtection, updateProtection } = require('../utils/protection.js');
const { phoneFromJid } = require('../../config/config.js');

/**
 * Global event handlers for protection features
 * These listen to WhatsApp events and execute recovery/blocking logic
 */

// Track message deletions for anti-delete
const deletedMessages = new Map();
const editedMessages = new Map();
const spamTracker = new Map();
const warnCount = new Map();

/**
 * Handle messages.update event (for anti-delete and anti-edit)
 */
async function handleMessagesUpdate(sock, updates) {
  for (const update of updates) {
    const { key, update: msgUpdate } = update;

    if (!key || !key.remoteJid) continue;

    const chatId = key.remoteJid;
    const messageId = key.id;
    const isGroup = chatId.endsWith('@g.us');

    // Check for deleted messages
    if (msgUpdate.status === 2 && deletedMessages.has(messageId)) {
      const deletedMsg = deletedMessages.get(messageId);
      await handleAntiDelete(sock, chatId, deletedMsg, isGroup);
      deletedMessages.delete(messageId);
    }

    // Check for edited messages
    if (msgUpdate.message?.editedMessage || msgUpdate.message?.protocolMessage?.editedMessage) {
      const originalMsg = editedMessages.get(messageId);
      if (originalMsg) {
        await handleAntiEdit(sock, chatId, originalMsg, msgUpdate, isGroup);
      }
    }
  }
}

/**
 * Handle anti-delete recovery
 */
async function handleAntiDelete(sock, chatId, message, isGroup) {
  const enabled = await isProtectionEnabled('antidelete', {
    isGroup,
    chatId,
    senderJid: message.sender
  });

  if (!enabled) return;

  try {
    const senderPhone = phoneFromJid(message.sender);
    const deleteInfo = `⚠️ *Anti-Delete Detected*\n\n👤 Sender: @${senderPhone}\n⏰ Time: ${new Date().toLocaleTimeString()}`;

    // Forward the deleted message to the same chat or bot's PM
    if (message.message) {
      await sock.sendMessage(chatId, {
        text: deleteInfo,
        mentions: [message.sender]
      });

      // Forward the original message
      await sock.sendMessage(chatId, message.message, {
        quoted: message.quoted || null
      });
    }

    console.log(`[Protection] Anti-delete: Recovered message from ${senderPhone}`);
  } catch (error) {
    console.error('[Protection] Anti-delete handler error:', error.message);
  }
}

/**
 * Handle anti-edit detection
 */
async function handleAntiEdit(sock, chatId, originalMsg, updatedMsg, isGroup) {
  const enabled = await isProtectionEnabled('antiedit', {
    isGroup,
    chatId,
    senderJid: originalMsg.sender
  });

  if (!enabled) return;

  try {
    const senderPhone = phoneFromJid(originalMsg.sender);
    const editInfo = `✏️ *Anti-Edit Detected*\n\n👤 Editor: @${senderPhone}\n⏰ Time: ${new Date().toLocaleTimeString()}\n\n*Original message has been logged.*`;

    await sock.sendMessage(chatId, {
      text: editInfo,
      mentions: [originalMsg.sender]
    });

    console.log(`[Protection] Anti-edit: Detected edit from ${senderPhone}`);
  } catch (error) {
    console.error('[Protection] Anti-edit handler error:', error.message);
  }
}

/**
 * Handle messages.upsert event (for anti-link, antibot, antispam, antivv)
 */
async function handleMessagesUpsert(sock, messages) {
  for (const message of messages) {
    if (!message.key || !message.key.remoteJid) continue;

    const chatId = message.key.remoteJid;
    const sender = message.key.participant || message.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');
    const messageId = message.key.id;

    // Store message for potential delete/edit tracking
    if (message.message) {
      deletedMessages.set(messageId, {
        sender,
        message: message.message,
        quoted: message.quoted || null,
        timestamp: Date.now()
      });

      editedMessages.set(messageId, {
        sender,
        message: message.message,
        timestamp: Date.now()
      });
    }

    // Check for view-once messages
    await handleAntiVV(sock, chatId, sender, message, isGroup);

    // Check for links
    await handleAntiLink(sock, chatId, sender, message, isGroup);

    // Check for bot messages
    await handleAntiBot(sock, chatId, sender, message, isGroup);

    // Check for spam
    await handleAntiSpam(sock, chatId, sender, message, isGroup);

    // Check for bad words
    await handleAntiBadWord(sock, chatId, sender, message, isGroup);
  }
}

/**
 * Handle anti-view-once
 */
async function handleAntiVV(sock, chatId, sender, message, isGroup) {
  const enabled = await isProtectionEnabled('antivv', {
    isGroup,
    chatId,
    senderJid: sender
  });

  if (!enabled) return;

  try {
    const msgType = Object.keys(message.message || {})[0];

    if (msgType === 'viewOnceMessage' || msgType === 'viewOnceMessageV2') {
      const viewOnceContent = message.message[msgType]?.message;

      if (viewOnceContent) {
        const senderPhone = phoneFromJid(sender);

        await sock.sendMessage(chatId, {
          text: `👁️ *Anti-ViewOnce Detected*\n\n👤 Sender: @${senderPhone}\n⚠️ View-once media has been saved.`,
          mentions: [sender]
        });

        // Forward the media without view-once restriction
        const actualType = Object.keys(viewOnceContent)[0];
        if (['imageMessage', 'videoMessage'].includes(actualType)) {
          await sock.sendMessage(chatId, {
            [actualType.replace('Message', '')]: viewOnceContent[actualType],
            caption: '*Saved by Anti-ViewOnce*'
          });
        }

        console.log(`[Protection] Anti-VV: Saved view-once from ${senderPhone}`);
      }
    }
  } catch (error) {
    console.error('[Protection] Anti-VV handler error:', error.message);
  }
}

/**
 * Handle anti-link detection
 */
async function handleAntiLink(sock, chatId, sender, message, isGroup) {
  const enabled = await isProtectionEnabled('antilink', {
    isGroup,
    chatId,
    senderJid: sender,
    isBotAdmin: true
  });

  if (!enabled || !isGroup) return;

  try {
    const text = message.message?.conversation ||
                 message.message?.extendedTextMessage?.text || '';

    if (!text) return;

    // Check for links
    const linkRegex = /https?:\/\/[^\s]+/g;
    const links = text.match(linkRegex);

    if (links && links.length > 0) {
      const setting = await getProtection('antilink');
      const whitelist = setting.whitelist || [];

      // Filter out whitelisted domains
      const badLinks = links.filter(link => {
        try {
          const domain = new URL(link).hostname;
          return !whitelist.some(w => domain.includes(w));
        } catch {
          return true; // Invalid URL, treat as bad link
        }
      });

      if (badLinks.length > 0) {
        const senderPhone = phoneFromJid(sender);

        await sock.sendMessage(chatId, {
          text: `🚫 *Anti-Link Detected*\n\n👤 User: @${senderPhone}\n⚠️ Sending links is not allowed.`,
          mentions: [sender]
        });

        // Delete the message
        await sock.sendMessage(chatId, { delete: message.key });

        console.log(`[Protection] Anti-link: Removed link from ${senderPhone}`);
      }
    }
  } catch (error) {
    console.error('[Protection] Anti-link handler error:', error.message);
  }
}

/**
 * Handle anti-bot detection
 */
async function handleAntiBot(sock, chatId, sender, message, isGroup) {
  const enabled = await isProtectionEnabled('antibot', {
    isGroup,
    chatId,
    senderJid: sender
  });

  if (!enabled || !isGroup) return;

  try {
    const setting = await getProtection('antibot');

    // Basic bot detection - can be enhanced
    const isBotSender = sender.includes('bot') || false;

    if (isBotSender && setting.ignoreAdmins) {
      // Skip if sender is admin (would need admin check here)
      return;
    }

    if (isBotSender) {
      const senderPhone = phoneFromJid(sender);

      await sock.sendMessage(chatId, {
        text: `🤖 *Anti-Bot Detected*\n\n👤 Bot: @${senderPhone}\n⚠️ Bots are not allowed in this group.`,
        mentions: [sender]
      });

      // Remove the bot
      await sock.groupParticipantsUpdate(chatId, [sender], 'remove');

      console.log(`[Protection] Anti-bot: Removed bot ${senderPhone}`);
    }
  } catch (error) {
    console.error('[Protection] Anti-bot handler error:', error.message);
  }
}

/**
 * Handle anti-spam detection
 */
async function handleAntiSpam(sock, chatId, sender, message, isGroup) {
  const enabled = await isProtectionEnabled('antispam', {
    isGroup,
    chatId,
    senderJid: sender
  });

  if (!enabled) return;

  try {
    const setting = await getProtection('antispam');
    const threshold = setting.threshold || 10;
    const windowMs = setting.windowMs || 5000;

    const now = Date.now();

    if (!spamTracker.has(sender)) {
      spamTracker.set(sender, []);
    }

    const timestamps = spamTracker.get(sender);

    // Remove old timestamps outside the window
    const recentTimestamps = timestamps.filter(ts => now - ts < windowMs);
    recentTimestamps.push(now);

    spamTracker.set(sender, recentTimestamps);

    if (recentTimestamps.length > threshold) {
      const senderPhone = phoneFromJid(sender);

      await sock.sendMessage(chatId, {
        text: `⚡ *Anti-Spam Triggered*\n\n👤 User: @${senderPhone}\n⚠️ Too many messages. You have been muted.`,
        mentions: [sender]
      });

      if (setting.action === 'mute' && isGroup) {
        await sock.groupParticipantsUpdate(chatId, [sender], 'demote');
      } else if (setting.action === 'kick' && isGroup) {
        await sock.groupParticipantsUpdate(chatId, [sender], 'remove');
      }

      console.log(`[Protection] Anti-spam: Action taken against ${senderPhone}`);
    }
  } catch (error) {
    console.error('[Protection] Anti-spam handler error:', error.message);
  }
}

/**
 * Handle anti-bad-word detection
 */
async function handleAntiBadWord(sock, chatId, sender, message, isGroup) {
  const enabled = await isProtectionEnabled('antibadword', {
    isGroup,
    chatId,
    senderJid: sender
  });

  if (!enabled || !isGroup) return;

  try {
    const setting = await getProtection('antibadword');
    const words = setting.words || [];

    if (words.length === 0) return;

    const text = message.message?.conversation ||
                 message.message?.extendedTextMessage?.text || '';

    if (!text) return;

    const lowerText = text.toLowerCase();
    const foundWords = words.filter(word => lowerText.includes(word.toLowerCase()));

    if (foundWords.length > 0) {
      const senderPhone = phoneFromJid(sender);

      await sock.sendMessage(chatId, {
        text: `⚠️ *Bad Word Detected*\n\n👤 User: @${senderPhone}\n⚠️ Please use appropriate language.`,
        mentions: [sender]
      });

      // Delete the message
      await sock.sendMessage(chatId, { delete: message.key });

      // Apply action
      if (setting.action === 'warn') {
        await incrementWarn(sock, chatId, sender);
      } else if (setting.action === 'kick' && isGroup) {
        await sock.groupParticipantsUpdate(chatId, [sender], 'remove');
      }

      console.log(`[Protection] Anti-badword: Action taken against ${senderPhone}`);
    }
  } catch (error) {
    console.error('[Protection] Anti-badword handler error:', error.message);
  }
}

/**
 * Increment warning count for a user
 */
async function incrementWarn(sock, chatId, sender) {
  const key = `${chatId}:${sender}`;
  const currentWarns = warnCount.get(key) || 0;
  const newWarns = currentWarns + 1;

  warnCount.set(key, newWarns);

  const setting = await getProtection('warnSystem');
  const maxWarns = setting.maxWarns || 3;

  if (newWarns >= maxWarns) {
    const senderPhone = phoneFromJid(sender);

    await sock.sendMessage(chatId, {
      text: `🔴 *Maximum Warnings Reached*\n\n👤 User: @${senderPhone}\n⚠️ You have been kicked.`,
      mentions: [sender]
    });

    await sock.groupParticipantsUpdate(chatId, [sender], 'remove');
    warnCount.delete(key);

    console.log(`[Protection] Warn system: Kicked ${senderPhone} after ${maxWarns} warnings`);
  } else {
    const senderPhone = phoneFromJid(sender);

    await sock.sendMessage(chatId, {
      text: `⚠️ *Warning ${newWarns}/${maxWarns}*\n\n👤 User: @${senderPhone}`,
      mentions: [sender]
    });
  }
}

/**
 * Handle call events (for call rejection)
 */
async function handleCall(sock, callData) {
  const enabled = await isProtectionEnabled('callReject', {
    isGroup: false,
    senderJid: callData.from
  });

  if (!enabled) return;

  try {
    const setting = await getProtection('callReject');
    const allowContacts = setting.allowContacts || true;

    const isContact = false; // Implement contact check as needed

    if (allowContacts && isContact) {
      return;
    }

    // Reject the call
    await sock.rejectCall(callData.id, callData.from);

    const callerPhone = phoneFromJid(callData.from);

    await sock.sendMessage(callData.from, {
      text: `📞 *Call Rejected*\n\nYour call has been automatically rejected.\nPlease use text messages instead.`
    });

    console.log(`[Protection] Call reject: Rejected call from ${callerPhone}`);
  } catch (error) {
    console.error('[Protection] Call reject handler error:', error.message);
  }
}

/**
 * Handle PM protection
 */
async function handlePMProtection(sock, message) {
  const enabled = await isProtectionEnabled('pmProtection', {
    isGroup: false,
    chatId: message.key.remoteJid,
    senderJid: message.key.participant || message.key.remoteJid
  });

  if (!enabled) return;

  try {
    const setting = await getProtection('pmProtection');
    const allowContacts = setting.allowContacts || true;
    const allowGroups = setting.allowGroups || true;

    const sender = message.key.participant || message.key.remoteJid;
    const isGroup = message.key.remoteJid.endsWith('@g.us');

    if (isGroup && allowGroups) return;
    if (allowContacts) {
      // Check if sender is a contact
    }

    const senderPhone = phoneFromJid(sender);

    await sock.sendMessage(sender, {
      text: `🚫 *PM Protection Active*\n\nMessaging the bot directly is not allowed.\nPlease use the bot in a group.`
    });

    console.log(`[Protection] PM protection: Blocked message from ${senderPhone}`);
  } catch (error) {
    console.error('[Protection] PM protection handler error:', error.message);
  }
}

/**
 * Reset warning count for a user
 */
async function resetWarns(sock, chatId, sender) {
  const key = `${chatId}:${sender}`;
  warnCount.delete(key);

  const senderPhone = phoneFromJid(sender);

  await sock.sendMessage(chatId, {
    text: `✅ *Warnings Cleared*\n\n👤 User: @${senderPhone}\nAll warnings have been reset.`,
    mentions: [sender]
  });

  console.log(`[Protection] Warn system: Cleared warnings for ${senderPhone}`);
}

module.exports = {
  handleMessagesUpdate,
  handleMessagesUpsert,
  handleCall,
  handlePMProtection,
  resetWarns
};
