const Discord = require('discord.js');
const express = require('express');
const client = new Discord.Client({intents:['Guilds','GuildMessages','MessageContent']});
const app = express();

let code = "";
let history = [];
let saved = {};
let autoExec = false;
let repeatInterval = null;
let schedules = [];

client.on('ready', () => console.log('Ready'));

client.on('messageCreate', m => {
  if(m.author.bot) return;
  
  if(m.content.startsWith('!exec')){
    let match = m.content.match(/```[\s\S]*?```/);
    if(match){
      code = match[0].replace(/```(lua)?\n?/g,'');
      history.unshift({code, time: Date.now()});
      if(history.length > 10) history.pop();
      m.reply('Executed');
    }
  }
  
  if(m.content.startsWith('!save ')){
    let name = m.content.substring(6).trim();
    if(code){
      saved[name] = {code, time: Date.now()};
      m.reply(`Saved as ${name}`);
    } else {
      m.reply('No code to save');
    }
  }
  
  if(m.content.startsWith('!load ')){
    let name = m.content.substring(6).trim();
    if(saved[name]){
      code = saved[name].code;
      m.reply(`Loaded ${name}`);
    } else {
      m.reply('Not found');
    }
  }
  
  if(m.content==='!list'){
    let names = Object.keys(saved);
    if(names.length === 0) return m.reply('No saved scripts');
    m.reply('Saved scripts:\n' + names.map(n => `- ${n}`).join('\n'));
  }
  
  if(m.content.startsWith('!delete ')){
    let name = m.content.substring(8).trim();
    if(saved[name]){
      delete saved[name];
      m.reply(`Deleted ${name}`);
    } else {
      m.reply('Not found');
    }
  }
  
  if(m.content==='!autoexec on'){
    autoExec = true;
    m.reply('Auto-exec enabled');
  }
  
  if(m.content==='!autoexec off'){
    autoExec = false;
    m.reply('Auto-exec disabled');
  }
  
  if(m.content.startsWith('!repeat ')){
    let sec = parseInt(m.content.split(' ')[1]);
    if(!code) return m.reply('No code set');
    if(repeatInterval) clearInterval(repeatInterval);
    repeatInterval = setInterval(() => {}, sec * 1000);
    m.reply(`Repeating every ${sec}s`);
  }
  
  if(m.content==='!repeat stop'){
    if(repeatInterval) clearInterval(repeatInterval);
    repeatInterval = null;
    m.reply('Repeat stopped');
  }
  
  if(m.content.startsWith('!schedule ')){
    let time = m.content.substring(10).trim();
    if(!code) return m.reply('No code set');
    
    let [hours, minutes] = time.split(':').map(Number);
    let now = new Date();
    let scheduled = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    
    if(scheduled < now) scheduled.setDate(scheduled.getDate() + 1);
    
    let timeoutMs = scheduled - now;
    let id = schedules.length;
    
    schedules.push({
      id,
      timeout: setTimeout(() => {
        schedules = schedules.filter(s => s.id !== id);
      }, timeoutMs)
    });
    
    m.reply(`Scheduled for ${time}`);
  }
  
  if(m.content==='!history'){
    if(history.length === 0) return m.reply('No history');
    let msg = 'History:\n';
    history.forEach((h, i) => {
      msg += `${i+1}. ${h.code.substring(0,50)}${h.code.length>50?'...':''}\n`;
    });
    m.reply(msg);
  }
  
  if(m.content.startsWith('!run ')){
    let num = parseInt(m.content.split(' ')[1]) - 1;
    if(history[num]){
      code = history[num].code;
      m.reply(`Running history ${num+1}`);
    } else {
      m.reply('Invalid number');
    }
  }
  
  if(m.content==='!status'){
    m.reply(`Status:
Code: ${code ? 'Set' : 'None'}
Auto-exec: ${autoExec ? 'On' : 'Off'}
Repeat: ${repeatInterval ? 'Active' : 'Off'}
Schedules: ${schedules.length}
Saved: ${Object.keys(saved).length}
History: ${history.length}/10`);
  }
  
  if(m.content==='!stop'){
    code='';
    if(repeatInterval) clearInterval(repeatInterval);
    schedules.forEach(s => clearTimeout(s.timeout));
    repeatInterval = null;
    schedules = [];
    m.reply('Stopped');
  }
  
  if(m.content==='!clear'){
    code='';
    m.reply('Cleared');
  }
  
  if(m.content==='!code'){
    m.reply(code ? '```lua\n'+code+'\n```' : 'None');
  }
  
  if(m.content==='!help'){
    m.reply(`Commands:
!exec - Execute script
!save [name] - Save script
!load [name] - Load script
!list - List saved
!delete [name] - Delete
!autoexec on/off - Auto-execute
!repeat [sec] - Repeat execution
!repeat stop - Stop repeat
!schedule [HH:MM] - Schedule
!history - View history
!run [#] - Run from history
!code - View current code
!status - Bot status
!stop - Stop everything
!clear - Clear code
!help - This message`);
  }
});

app.get('/getui', (req,res) => res.send(code));
app.listen(3000, () => console.log('Web ready'));
client.login(process.env.DISCORD_TOKEN);
