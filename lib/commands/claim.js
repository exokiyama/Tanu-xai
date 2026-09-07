'use strict';
const {updateBalance}=require('../utils/rpg');
module.exports={pattern:'claim',aliases:['drop'],description:'Claim a random coin drop',category:'🎮 RPG',usage:'claim',async handler(sock,message,args,context){const amount=Math.floor(Math.random()*501)+100;const r=await updateBalance(message.sender,amount,'claim');return context.reply(`🎁 Coin drop claimed!\n🪙 +${amount}\nBalance: 🪙 ${r.balance}`);}};
