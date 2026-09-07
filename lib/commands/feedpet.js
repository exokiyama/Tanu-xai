'use strict';
const {query}=require('../database');
module.exports={pattern:'feedpet',aliases:['feedpet'],description:'Feed your RPG pet',category:'🎮 RPG',usage:'feedpet',async handler(sock,message,args,context){const r=await query('UPDATE pets SET hunger=LEAST(100,hunger+25) WHERE user_id=$1 RETURNING name,hunger',[message.sender]);if(!r.rows[0])return context.reply('🐾 You do not have a pet.');return context.reply(`🍖 Fed ${r.rows[0].name}! Hunger: ${r.rows[0].hunger}/100`);}};
