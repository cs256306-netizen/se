require('dotenv').config();
const Discord = require('discord.js');
const express = require('express');
const client = new Discord.Client({intents:['Guilds','GuildMessages','MessageContent']});
const app = express();

let code = "";
let history = [];
let saved = {};
let games = {};
let currentGame = null;
let autoExec = false;
let repeatInterval = null;
let schedules = [];
let logs = [];

function addLog(action, details) {
  logs.unshift({time: Date.now(), action, details});
  if(logs.length > 50) logs.pop();
}

client.on('ready', () => console.log('Ready'));

client.on('messageCreate', m => {
  if(m.author.bot) return;
  
  // Execute
  if(m.content.startsWith('!exec')){
    let match = m.content.match(/```[\s\S]*?```/);
    if(match){
      code = match[0].replace(/```(lua)?\n?/g,'');
      history.unshift({code, time: Date.now()});
      if(history.length > 10) history.pop();
      addLog('exec', code.substring(0,50));
      m.reply('Executed');
    }
  }
  
  // Save with category
  if(m.content.startsWith('!save ')){
    let name = m.content.substring(6).trim();
    if(code){
      saved[name] = {code, time: Date.now()};
      addLog('save', name);
      m.reply(`Saved as ${name}`);
    }
  }
  
  // Load
  if(m.content.startsWith('!load ')){
    let name = m.content.substring(6).trim();
    if(saved[name]){
      code = saved[name].code;
      addLog('load', name);
      m.reply(`Loaded ${name}`);
    }
  }
  
  // List with filter
  if(m.content==='!list' || m.content.startsWith('!list ')){
    let filter = m.content.substring(6).trim();
    let names = Object.keys(saved).filter(n => !filter || n.includes(filter));
    if(names.length === 0) return m.reply('No scripts');
    m.reply('Scripts:\n' + names.map(n => `- ${n}`).join('\n'));
  }
  
  // Delete
  if(m.content.startsWith('!delete ')){
    let name = m.content.substring(8).trim();
    if(saved[name]){
      delete saved[name];
      addLog('delete', name);
      m.reply(`Deleted ${name}`);
    }
  }
  
  // Game management
  if(m.content.startsWith('!game add ')){
    let parts = m.content.substring(10).split(' ');
    let placeId = parts[0];
    let name = parts.slice(1).join(' ');
    games[name] = placeId;
    m.reply(`Added game ${name}`);
  }
  
  if(m.content === '!game list'){
    let names = Object.keys(games);
    if(names.length === 0) return m.reply('No games');
    m.reply('Games:\n' + names.map(n => `- ${n} (${games[n]})`).join('\n'));
  }
  
  if(m.content.startsWith('!game select ')){
    let name = m.content.substring(13).trim();
    if(games[name]){
      currentGame = name;
      m.reply(`Selected ${name}`);
    }
  }
  
  if(m.content.startsWith('!game exec ')){
    let parts = m.content.substring(11).split(' ');
    let gameName = parts[0];
    let match = m.content.match(/```[\s\S]*?```/);
    if(match && games[gameName]){
      code = match[0].replace(/```(lua)?\n?/g,'');
      addLog('game_exec', `${gameName}: ${code.substring(0,30)}`);
      m.reply(`Executed in ${gameName}`);
    }
  }
  
  // Auto exec
  if(m.content==='!autoexec on'){
    autoExec = true;
    m.reply('Auto-exec enabled');
  }
  
  if(m.content==='!autoexec off'){
    autoExec = false;
    m.reply('Auto-exec disabled');
  }
  
  // Repeat
  if(m.content.startsWith('!repeat ')){
    let sec = parseInt(m.content.split(' ')[1]);
    if(!code) return m.reply('No code');
    if(repeatInterval) clearInterval(repeatInterval);
    repeatInterval = setInterval(() => {}, sec * 1000);
    addLog('repeat', `${sec}s`);
    m.reply(`Repeating every ${sec}s`);
  }
  
  if(m.content==='!repeat stop'){
    if(repeatInterval) clearInterval(repeatInterval);
    repeatInterval = null;
    m.reply('Repeat stopped');
  }
  
  // Schedule
  if(m.content.startsWith('!schedule ')){
    let time = m.content.substring(10).trim();
    if(!code) return m.reply('No code');
    
    let [hours, minutes] = time.split(':').map(Number);
    let now = new Date();
    let scheduled = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    
    if(scheduled < now) scheduled.setDate(scheduled.getDate() + 1);
    
    let timeoutMs = scheduled - now;
    let id = schedules.length;
    
    schedules.push({
      id,
      timeout: setTimeout(() => {
        addLog('scheduled_exec', time);
        schedules = schedules.filter(s => s.id !== id);
      }, timeoutMs)
    });
    
    m.reply(`Scheduled for ${time}`);
  }
  
  // History
  if(m.content==='!history'){
    if(history.length === 0) return m.reply('No history');
    let msg = 'History:\n';
    history.forEach((h, i) => {
      msg += `${i+1}. ${h.code.substring(0,50)}...\n`;
    });
    m.reply(msg);
  }
  
  // Run from history
  if(m.content.startsWith('!run ')){
    let num = parseInt(m.content.split(' ')[1]) - 1;
    if(history[num]){
      code = history[num].code;
      addLog('run_history', `#${num+1}`);
      m.reply(`Running #${num+1}`);
    }
  }
  
  // Logs
  if(m.content==='!log'){
    if(logs.length === 0) return m.reply('No logs');
    let msg = 'Logs:\n';
    logs.slice(0,10).forEach(l => {
      let time = new Date(l.time).toLocaleTimeString();
      msg += `${time} - ${l.action}: ${l.details}\n`;
    });
    m.reply(msg);
  }
  
  if(m.content==='!log clear'){
    logs = [];
    m.reply('Logs cleared');
  }
  
  // Status
  if(m.content==='!status'){
    m.reply(`Status:
Code: ${code ? 'Set' : 'None'}
Current Game: ${currentGame || 'None'}
Auto-exec: ${autoExec ? 'On' : 'Off'}
Repeat: ${repeatInterval ? 'Active' : 'Off'}
Schedules: ${schedules.length}
Saved: ${Object.keys(saved).length}
Games: ${Object.keys(games).length}
History: ${history.length}/10
Logs: ${logs.length}/50`);
  }
  
  // Stop all
  if(m.content==='!stop'){
    code='';
    if(repeatInterval) clearInterval(repeatInterval);
    schedules.forEach(s => clearTimeout(s.timeout));
    repeatInterval = null;
    schedules = [];
    addLog('stop', 'all');
    m.reply('Stopped');
  }
  
  // Clear
  if(m.content==='!clear'){
    code='';
    m.reply('Cleared');
  }
  
  // View code
  if(m.content==='!code'){
    m.reply(code ? '```lua\n'+code+'\n```' : 'None');
  }
  
  // Help
  if(m.content==='!help'){
    m.reply(`Commands:
!exec - Execute script
!save [name] - Save script
!load [name] - Load script
!list [filter] - List saved
!delete [name] - Delete
!game add [PlaceID] [name] - Add game
!game list - List games
!game select [name] - Select game
!game exec [game] - Execute in game
!autoexec on/off - Auto-execute
!repeat [sec] - Repeat
!repeat stop - Stop repeat
!schedule [HH:MM] - Schedule
!history - View history
!run [#] - Run from history
!log - View logs
!log clear - Clear logs
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
