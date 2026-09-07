'use strict';

const fs = require('fs');
const path = require('path');
const { prepareWAMessageMedia, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const { config } = require('../../config/config.js');

// Helper to build VCard
function buildVCard(name, number, role) {
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${name}`,
    `ORG:${config.botName};`,
    `TITLE:${role}`,
    `TEL;type=CELL;type=VOICE;waid=${number}:+${number}`,
    'END:VCARD'
  ].join('\n');
}

module.exports = {
  name: 'owner',
  aliases: ['dev', 'vcard', 'developer', 'contact'],
  async execute(sock, message, args, context) {
    const jid = message.key.remoteJid;
    const videoPath = path.join(process.cwd(), 'assets', 'owner-card.mp4');
    const coupleImgPath = path.join(process.cwd(), 'assets', 'armantanu.jpg');
    const devImgPath = path.join(process.cwd(), 'assets', 'dev_bg.png');
    const wifeImgPath = path.join(process.cwd(), 'assets', 'wife_bg.png');

    try {
      // ═══════════════════════════════════════════════════════
      // STEP 1: GIF WITH CAPTION & CHANNEL URL
      // ═══════════════════════════════════════════════════════
      if (fs.existsSync(videoPath)) {
        const gifCaption = [
          '✦ TANU XAI ✦',
          '_Official Introduction_',
          '──────────────────────',
          '',
          '*CREATOR INFO*',
          '• Developer : ' + config.ownerName,
          '• Wife      : ' + config.wifeName,
          '',
          '⚠ *WARNING*',
          '_If you bark in front of my wife,_',
          '_you\'ll gonna repay!_'
        ].join('\n');

        await sock.sendMessage(jid, {
          video: fs.readFileSync(videoPath),
          caption: gifCaption,
          gifPlayback: true,
          contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363160000000000@newsletter', // Apna Channel JID yahan dalein
              newsletterName: config.botName || 'TANU XAI',
              serverMessageId: -1
            }
          }
        }, { quoted: message });

        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // ═══════════════════════════════════════════════════════
      // STEP 2: IMAGE WITH OPTIONS (WAITING FOR REPLY)
      // ═══════════════════════════════════════════════════════
      if (fs.existsSync(coupleImgPath)) {
        const imgCaption = [
          '✦ ARMAN x TANU ✦',
          '_The minds behind the machine._',
          '──────────────────────',
          '',
          '*SELECT CONTACT*',
          'Reply *1* for ' + config.ownerName,
          'Reply *2* for ' + config.wifeName,
          '',
          '_⏳ Waiting for your selection..._'
        ].join('\n');

        // Image bhejo aur uska ID save karo taaki reply track kar sakein
        const optionsMsg = await sock.sendMessage(jid, {
          image: fs.readFileSync(coupleImgPath),
          caption: imgCaption,
          contextInfo: { forwardingScore: 999, isForwarded: true }
        }, { quoted: message });
        
        const optionsMsgId = optionsMsg.key.id;

        // ══════════════════════════════════════════════════════
        // STEP 3: BOT WAITS FOR REPLY (Interactive Logic)
        // ═══════════════════════════════════════════════════════
        const userReply = await new Promise((resolve) => {
          const listener = (msg) => {
            if (msg.messages) {
              for (const m of msg.messages) {
                // Check karo ki user ne usi image ko reply kiya hai
                if (m.key.remoteJid === jid && m.message?.extendedTextMessage?.contextInfo?.stanzaId === optionsMsgId) {
                  sock.ev.off('messages.upsert', listener); // Listener hata do
                  resolve(m.message.extendedTextMessage.text.trim());
                  return;
                }
              }
            }
          };
          
          sock.ev.on('messages.upsert', listener);

          // 30 seconds ka timeout. Agar reply nahi aaya toh null return karo
          setTimeout(() => {
            sock.ev.off('messages.upsert', listener);
            resolve(null);
          }, 30000);
        });

        // ═══════════════════════════════════════════════════════
        // STEP 4: DROP VCARDS BASED ON REPLY
        // ═══════════════════════════════════════════════════════
        const devVCard = buildVCard(config.ownerName, config.ownerNumber, 'Lead Developer');
        const wifeVCard = buildVCard(config.wifeName, config.wifeNumber, 'Co-Owner');

        if (userReply === '1') {
          await sock.sendMessage(jid, {
            contacts: { displayName: config.ownerName, contacts: [{ vcard: devVCard }] }
          }, { quoted: message });
        } else if (userReply === '2') {
          await sock.sendMessage(jid, {
            contacts: { displayName: config.wifeName, contacts: [{ vcard: wifeVCard }] }
          }, { quoted: message });
        } else {
          // Timeout ya galat reply par dono bhej do
          await sock.sendMessage(jid, { text: '_⏱️ Time out! Sending both contacts..._' }, { quoted: message });
          await new Promise(resolve => setTimeout(resolve, 800));
          
          await sock.sendMessage(jid, {
            contacts: { displayName: config.ownerName, contacts: [{ vcard: devVCard }] }
          }, { quoted: message });
          
          await new Promise(resolve => setTimeout(resolve, 800));
          
          await sock.sendMessage(jid, {
            contacts: { displayName: config.wifeName, contacts: [{ vcard: wifeVCard }] }
          }, { quoted: message });
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // ═══════════════════════════════════════════════════════
      // STEP 5: CAROUSEL (Bonus for Web/Desktop)
      // ═══════════════════════════════════════════════════════
      let devMedia = null;
      let wifeMedia = null;

      try {
        if (fs.existsSync(devImgPath)) {
          devMedia = await prepareWAMessageMedia(
            { image: fs.readFileSync(devImgPath) },
            { upload: sock.waUploadToServer }
          ).catch(() => null);
        }
        if (fs.existsSync(wifeImgPath)) {
          wifeMedia = await prepareWAMessageMedia(
            { image: fs.readFileSync(wifeImgPath) },
            { upload: sock.waUploadToServer }
          ).catch(() => null);
        }
      } catch (e) { console.error("Media Error:", e); }

      const cards = [];

      if (devMedia && devMedia.imageMessage) {
        cards.push({
          header: { hasMediaAttachment: true, imageMessage: devMedia.imageMessage },
          body: { text: '*DEVELOPER PROFILE*\n\n• Name: ' + config.ownerName + '\n• Role: Lead Developer\n• Bot: ' + config.botName + '\n\n_The mastermind behind it all._' },
          footer: { text: 'Swipe for Wife' },
          nativeFlowMessage: {
            buttons: [{ name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: 'Chat Dev', url: 'https://wa.me/' + config.ownerNumber }) }]
          }
        });
      }

      if (wifeMedia && wifeMedia.imageMessage) {
        cards.push({
          header: { hasMediaAttachment: true, imageMessage: wifeMedia.imageMessage },
          body: { text: '*OWNER / WIFE PROFILE*\n\n• Name: ' + config.wifeName + '\n• Role: Co-Owner\n\n⚠ *FINAL WARNING*\n_Bark in front of her = Repay_\n\n_Respect the boundaries._' },
          footer: { text: 'Tanu XAI Protection' },
          nativeFlowMessage: {
            buttons: [{ name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: 'Chat Wife', url: 'https://wa.me/' + config.wifeNumber }) }]
          }
        });
      }

      if (cards.length > 0) {
        const carouselMsg = generateWAMessageFromContent(jid, {
          viewOnceMessage: {
            message: {
              interactiveMessage: {
                body: { text: '*PROFILE CARDS*' },
                footer: { text: 'Swipe to view both' },
                carouselMessage: { cards },
                contextInfo: { sharingChatLinkToLpa: true }
              }
            }
          }
        }, { quoted: message, userJid: sock.user.id });

        await sock.relayMessage(jid, carouselMsg.message, { messageId: carouselMsg.key.id });
        console.log("✅ Carousel sent!");
      }

    } catch (error) {
      console.error('[Owner Error]:', error);
    }
  }
};
