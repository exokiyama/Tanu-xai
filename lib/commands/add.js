/**
 * Command: add
 * Category: 👥 Group
 * Description: Adds a person to the group
 */

import { formatJid } from '../utils/group.js';

export const command = {
  name: 'add',
  pattern: 'add',
  aliases: ['invite', 'join'],
  category: '👥 Group',
  description: 'Adds a person to the group',
  usage: '<phone number>',
  permissions: [],
  groupOnly: true,
  adminOnly: true,
  botAdminRequired: true,

  async execute(sock, message, args, context) {
    const { chatId, senderJid, participants, botJid, isGroup } = context;

    // Verify this is a group
    if (!isGroup) {
      await sock.sendMessage(chatId, { text: '_This command can only be used in groups_' });
      return;
    }

    // Check if bot is admin
    const botIsAdmin = participants.find(p => p.id === botJid)?.admin !== null;
    if (!botIsAdmin) {
      await sock.sendMessage(chatId, { text: '_Bot must be an admin to use this command_' });
      return;
    }

    // Check if sender is admin
    const senderIsAdmin = participants.find(p => p.id === senderJid)?.admin !== null;
    if (!senderIsAdmin) {
      await sock.sendMessage(chatId, { text: '_You must be an admin to use this command_' });
      return;
    }

    // Get phone number from args
    let phoneNumber = args.join('').trim();
    
    if (!phoneNumber) {
      await sock.sendMessage(chatId, { 
        text: '_Please provide a phone number to add_\n\nUsage: .add <phone number>\nExample: .add 917023968416' 
      });
      return;
    }

    // Clean and normalize phone number
    phoneNumber = phoneNumber.replace(/\D/g, '');
    
    // Add country code if missing (default to +91 for India)
    if (!phoneNumber.startsWith('91') && phoneNumber.length <= 10) {
      phoneNumber = '91' + phoneNumber;
    }
    
    // Format as JID
    const userJid = `${phoneNumber}@s.whatsapp.net`;

    // Check if user is already in group
    const existingMember = participants.find(p => p.id === userJid);
    if (existingMember) {
      await sock.sendMessage(chatId, { 
        text: `@${formatJid(userJid)} is already a member of this group`,
        mentions: [userJid]
      });
      return;
    }

    try {
      // Add user to group
      const result = await sock.groupParticipantsUpdate(chatId, [userJid], 'add');
      
      // Check result for any errors
      if (result && result[0] && result[0].error) {
        const error = result[0].error;
        if (error === '403') {
          await sock.sendMessage(chatId, { 
            text: `❌ Failed to add @${formatJid(userJid)}\n\nUser has privacy settings that prevent adding. Please send them an invite link instead.` ,
            mentions: [userJid]
          });
        } else {
          await sock.sendMessage(chatId, { 
            text: `❌ Failed to add @${formatJid(userJid)}\n\nError: ${error}`,
            mentions: [userJid]
          });
        }
      } else {
        await sock.sendMessage(chatId, { 
          text: `✅ Successfully added @${formatJid(userJid)} to the group`,
          mentions: [userJid]
        });
      }
    } catch (error) {
      console.error('[AddCommand] Error:', error);
      await sock.sendMessage(chatId, { 
        text: `_Failed to add user: ${error.message}_` 
      });
    }
  }
};

export default command;
