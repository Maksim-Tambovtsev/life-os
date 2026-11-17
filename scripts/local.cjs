// Local-only launcher: separate DB, synthetic login, no cron or paid AI in api/web.
require('./runtime.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const mode = process.argv[2];
if (!['seed', 'api', 'web', 'bot'].includes(mode)) {
  console.error('Usage: node scripts/local.cjs seed|api|web|bot'); process.exit(1);
}
const dataDir = path.join(root, '.local');
fs.mkdirSync(dataDir, { recursive: true });
const localEnv = {
  ...process.env,
  DB_PATH: path.join(dataDir, 'lifeos-dev.db'),
  JWT_SECRET: 'lifeos-local-only-never-deploy-this-secret',
  TELEGRAM_TOKEN: 'local-synthetic-token',
  ANTHROPIC_API_KEY: '',
  DEV_LOGIN: '1', HOST: '127.0.0.1', PORT: '3001',
  FRONTEND_URL: 'http://127.0.0.1:5173',
};
function seed() {
  process.env.DB_PATH = localEnv.DB_PATH;
  const db = require('../server/db');
  for (const [id, name] of [['demo-owner', 'Демо Максим'], ['demo-other', 'Другой демо-профиль']]) {
    if (!db.getUser(id)) db.saveUser({user_id:id,name,goal_year:'Закончить учебный проект',priority:'Продуктивность',onboarded:1});
    if (!db.getAll(id).length && id === 'demo-owner') {
      for (let n = 6; n >= 0; n--) {
        const date = new Date(); date.setUTCDate(date.getUTCDate() - n);
        const day = date.toISOString().slice(0,10);
        db.saveCheckin({user_id:id,date:day,sleep_hours:7+(n%2)*.5,wake_quality:7,
          activity:n%2?'прогулка':'нет',energy:6+(n%3),reflection:'Вымышленная запись для разработки',goal_progress:n%2});
        db.saveReflection({user_id:id,date:day,answers:['Вымышленная запись'],summary:'Пример итога: сегодня сделан небольшой шаг по учебному проекту. Это тестовые данные.'});
      }
    }
  }
  console.log('Local DB: .local/lifeos-dev.db; login: demo-owner (7 days), demo-other (empty). Existing data preserved.');
}
if (mode === 'seed' || mode === 'api') seed();
if (mode === 'seed') process.exit(0);
let file, args = [], env = localEnv;
if (mode === 'api') file = path.join(root,'server/api.js');
if (mode === 'web') {
  file = path.join(root,'main/node_modules/vite/bin/vite.js');
  args = [path.join(root,'main'),'--host','127.0.0.1','--port','5173','--strictPort'];
  env = {...localEnv,VITE_API_URL:'http://127.0.0.1:3001',VITE_BOT_USERNAME:''};
}
if (mode === 'bot') {
  const keyFile = path.join(root,'server/.env.bot.local');
  if (!fs.existsSync(keyFile)) {
    console.error('Test bot not started. Copy server/.env.bot.local.example to server/.env.bot.local and supply a dedicated test bot and API key.');
    process.exit(1);
  }
  const keys = require('../server/node_modules/dotenv').parse(fs.readFileSync(keyFile));
  if (!keys.TELEGRAM_TOKEN || !keys.ANTHROPIC_API_KEY) {
    console.error('Test bot not started: TELEGRAM_TOKEN and ANTHROPIC_API_KEY must be set in the ignored local file.');process.exit(1);
  }
  // The key file cannot override DB_PATH, JWT, host, or dev-mode settings.
  env = {...localEnv,TELEGRAM_TOKEN:keys.TELEGRAM_TOKEN,ANTHROPIC_API_KEY:keys.ANTHROPIC_API_KEY};
  file = path.join(root,'server/bot.js');
  console.log('Dedicated local test bot: uses .local/lifeos-dev.db. Cron is NOT started. Real model calls may cost money.');
}
const child = spawn(process.execPath,[file,...args],{cwd:root,env,stdio:'inherit'});
child.on('error',e=>{console.error(e.message);process.exitCode=1;});
child.on('exit',(code,signal)=>{process.exitCode=signal?0:(code??1);});
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>child.kill(signal));
