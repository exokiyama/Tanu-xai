'use strict';
const {query}=require('../database');
module.exports={pattern:'garage',aliases:['vehicles'],description:'View your RPG vehicles',category:'🎮 RPG',usage:'garage',async handler(sock,message,args,context){const r=await query('SELECT name,created_at FROM vehicles WHERE user_id=$1 ORDER BY created_at DESC',[message.sender]);if(!r.rows.length)return context.reply('🚗 Your garage is empty.');return context.reply('🚗 *Garage*\n\n'+r.rows.map(x=>`• ${x.name}`).join('\n'));}};
