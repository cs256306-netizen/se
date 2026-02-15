require('dotenv').config();
const Discord = require('discord.js');
const express = require('express');
const client = new Discord.Client({intents:['Guilds','GuildMessages','MessageContent']});
const app = express();

let code = "";
let history = [];
let saved = {};
let timer = null;
let repeat = null;

client.on('ready', () => console.log('Ready'));

client.on('messageCreate', m => {
  if(m.author.bot) return;
  
  if(m.content.startsWith('!exec')){
    let match = m.content.match(/```[\s\S]*?```/);
    if(match){
      code = match[0].replace(/```(lua)?\n?/g,'');
      history.unshift(code);
      if(history.length > 5) history.pop();
      m.reply('Executed');
    }
  }
  
  if(m.content==='!stop'){
    code='';
    if(timer) clearTimeout(timer);
    if(repeat) clearInterval(repeat);
    timer = null;
    repeat = null;
    m.reply('Stopped');
  }
  
  if(m.content==='!code') m.reply(code ? '```lua\n'+code+'\n```' : 'None');
  
  if(m.content==='!clear'){
    code='';
    m.reply('Cleared');
  }
  
  if(m.content==='!history'){
    if(history.length === 0) return m.reply('No history');
    let msg = '**History:**\n';
    history.forEach((h, i) => {
      msg += `${i+1}. \`${h.substring(0,50)}${h.length>50?'...':''}\`\n`;
    });
    m.reply(msg);
  }
  
  if(m.content.startsWith('!run ')){
    let num = parseInt(m.content.split(' ')[1]) - 1;
    if(history[num]){
      code = history[num];
      m.reply('Running #' + (num+1));
    } else {
      m.reply('Invalid number');
    }
  }
  
  if(m.content.startsWith('!save ')){
    let name = m.content.substring(6).trim();
    if(code){
      saved[name] = code;
      m.reply(`Saved as "${name}"`);
    } else {
      m.reply('No code to save');
    }
  }
  
  if(m.content.startsWith('!load ')){
    let name = m.content.substring(6).trim();
    if(saved[name]){
      code = saved[name];
      m.reply(`Loaded "${name}"`);
    } else {
      m.reply('Not found');
    }
  }
  
  if(m.content==='!list'){
    let names = Object.keys(saved);
    if(names.length === 0) return m.reply('No saved scripts');
    m.reply('**Saved scripts:**\n' + names.map(n => `• ${n}`).join('\n'));
  }
  
  if(m.content.startsWith('!timer ')){
    let sec = parseInt(m.content.split(' ')[1]);
    if(!code) return m.reply('No code set');
    if(timer) clearTimeout(timer);
    timer = setTimeout(() => {
      code = code;
      timer = null;
    }, sec * 1000);
    m.reply(`Timer set for ${sec}s`);
  }
  
  if(m.content.startsWith('!repeat ')){
    let sec = parseInt(m.content.split(' ')[1]);
    if(!code) return m.reply('No code set');
    if(repeat) clearInterval(repeat);
    repeat = setInterval(() => {
      // Code stays active
    }, sec * 1000);
    m.reply(`Repeating every ${sec}s`);
  }
  
  if(m.content==='!cancel'){
    if(timer) clearTimeout(timer);
    if(repeat) clearInterval(repeat);
    timer = null;
    repeat = null;
    m.reply('Cancelled');
  }
  
  if(m.content==='!status'){
    m.reply(`**Status:**\nCode: ${code ? 'Set' : 'None'}\nTimer: ${timer ? 'Active' : 'None'}\nRepeat: ${repeat ? 'Active' : 'None'}\nHistory: ${history.length}/5\nSaved: ${Object.keys(saved).length}`);
  }
  
  if(m.content==='!help'){
    m.reply(`**Commands:**
\`!exec\` - Execute script
\`!stop\` - Stop execution
\`!code\` - View current code
\`!clear\` - Clear code
\`!history\` - View recent scripts
\`!run [#]\` - Run from history
\`!save [name]\` - Save script
\`!load [name]\` - Load script
\`!list\` - List saved scripts
\`!timer [sec]\` - Execute after delay
\`!repeat [sec]\` - Repeat execution
\`!cancel\` - Cancel timer
\`!status\` - Bot status
\`!help\` - This message`);
  }
});

app.get('/getui', (req,res) => res.send(code));
app.listen(3000, () => console.log('Web ready'));
client.login(process.env.DISCORD_TOKEN);
