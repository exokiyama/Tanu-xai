'use strict';
const {query}=require('../database');
module.exports={pattern:'quests',aliases:['quest'],description:'Show RPG quest progress',category:'🎮 RPG',usage:'quests',async handler(sock,message,args,context){const r=await query('SELECT quest_key,progress,completed FROM quests WHERE user_id=$1 ORDER BY quest_key',[message.sender]);if(!r.rows.length)return context.reply('📜 No quests yet. Complete activities to unlock quests.');return context.reply('📜 *Quests*\n\n'+r.rows.map(x=>`• ${x.quest_key}: ${x.progress}${x.completed?' ✅':''}`).join('\n'));}};
