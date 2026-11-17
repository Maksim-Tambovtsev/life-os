require('./runtime.cjs');
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root=path.resolve(__dirname,'..');
function run(bin,args,cwd=root) {
  const r=spawnSync(bin,args,{cwd,stdio:'inherit'});
  if (r.error) throw r.error;
  if (r.status!==0) process.exit(r.status||1);
}
for(const name of fs.readdirSync(path.join(root,'server')).filter(n=>n.endsWith('.js')))run(process.execPath,['--check',path.join(root,'server',name)]);
run(process.execPath,['db.test.js'],path.join(root,'server'));
run(process.platform==='win32'?'npm.cmd':'npm',['run','build'],path.join(root,'main'));
