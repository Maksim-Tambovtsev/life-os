const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lifeos-bot-b2-'));
process.env.DB_PATH=path.join(dir,'bot.sqlite');
process.env.TELEGRAM_TOKEN='123456:synthetic';process.env.ANTHROPIC_API_KEY='synthetic';process.env.JWT_SECRET='synthetic';
let failAI=false,failDelivery=false,calls=0;
// Replace the external provider before importing bot.js. No network or paid API.
const sdk=require.resolve('@anthropic-ai/sdk');
require.cache[sdk]={id:sdk,filename:sdk,loaded:true,exports:class {
 constructor(){this.messages={create:async opts=>{
  calls++;if(failAI)throw Error('synthetic provider outage');
  return {content:[{text:opts.max_tokens===100?' {"progress":true,"comment":"step"}':'Test summary'}]};
 }};}
}};
const db=require('./db');const sql=new (require('better-sqlite3'))(process.env.DB_PATH);
db.saveUser({user_id:'123',name:'Synthetic',goal_year:'Learn',onboarded:1});
const replies=[];
function loadBot(){
 delete require.cache[require.resolve('./bot')];const {bot}=require('./bot');
 bot.botInfo={id:999,is_bot:true,username:'testbot',first_name:'Test'};
 bot.context.reply=async text=>{replies.push(text);return {};};
 bot.context.replyWithHTML=async text=>{if(failDelivery){failDelivery=false;throw Error('synthetic delivery failure');}return bot.context.reply(text);};bot.context.sendChatAction=async()=>{};
 return bot;
}
function update(id,text){return {update_id:id,message:{message_id:id,date:Math.floor(Date.now()/1000),chat:{id:123,type:'private'},from:{id:123,is_bot:false,first_name:'Test'},text,...(text.startsWith('/')?{entities:[{type:'bot_command',offset:0,length:text.length}]}:{})}};}
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
test('real bot handlers: restart, duplicate, failed AI, consent, revision, cancellation',async()=>{
 let bot=loadBot();await bot.handleUpdate(update(1,'/reflection'));
 await bot.handleUpdate(update(2,'7'));
 assert.equal(db.getDraft('123').step,1);
 bot=loadBot();await bot.handleUpdate(update(3,'/reflection'));
 assert.match(replies.at(-1),/проснулся/);
 await bot.handleUpdate(update(2,'7'));assert.equal(db.getDraft('123').step,1);
 for(const [id,text] of [[4,'8'],[5,'walk'],[6,'7']])await bot.handleUpdate(update(id,text));
 failAI=true;await bot.handleUpdate(update(7,'Original saved text'));
 assert.equal(db.getAll('123').length,1);assert.equal(db.getAll('123')[0].reflection,'Original saved text');
 assert.equal(db.getLastReflection('123').analysis_status,'failed');assert.equal(db.getDraft('123'),null);
 const n=calls;await bot.handleUpdate(update(7,'Original saved text'));assert.equal(calls,n);
 await bot.handleUpdate(update(8,'/reflection'));assert.match(replies.at(-1),/\/replace/);
 failAI=false;failDelivery=true;await bot.handleUpdate(update(9,'/replace'));
 await Promise.all([bot.handleUpdate(update(10,'8')),bot.handleUpdate(update(11,'8'))]);
 for(const [id,text] of [[12,'walk'],[13,'9'],[14,'Corrected saved text']])await bot.handleUpdate(update(id,text));
 assert.equal(db.getAll('123').length,1);assert.equal(db.getAll('123')[0].reflection,'Corrected saved text');
 assert.equal(db.getLastReflection('123').analysis_status,'succeeded');
 assert.equal(db.getLastReflection('123').summary,'Test summary');
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM reflection_revisions').get().n,1);
 await bot.handleUpdate(update(15,'/replace'));await bot.handleUpdate(update(16,'/cancel'));
 bot=loadBot();assert.equal(db.getDraft('123'),null);assert.equal(db.getAll('123').length,1);
});
