'use strict';
const {getUserProfile}=require('../utils/rpg');
module.exports={pattern:'level',aliases:['xp'],description:'Show your RPG level and XP',category:'🎮 RPG',usage:'level',async handler(sock,message,args,context){const p=await getUserProfile(message.sender);return context.reply(`⭐ *Level:* ${p?.level||1}\n✨ *XP:* ${p?.xp||0}\n📈 Next level: ${(p?.level||1)*1000} XP`);}};
