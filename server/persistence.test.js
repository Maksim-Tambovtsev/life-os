const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lifeos-b2-'));
process.env.DB_PATH=path.join(dir,'db.sqlite');
const db=require('./db');
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
test('partial profile update preserves goal, onboarding and tomorrow plan',()=>{
 db.saveUser({user_id:'profile-b2',name:'Old',goal_year:'Keep',onboarded:1,last_tomorrow_plan:'Keep plan'});
 db.saveUser({user_id:'profile-b2',name:'New'});
 const u=db.getUser('profile-b2');assert.equal(u.goal_year,'Keep');assert.equal(u.onboarded,1);assert.equal(u.last_tomorrow_plan,'Keep plan');
});
test('draft step and update identity are committed together; repeat cannot advance twice',()=>{
 const s={type:'reflection',step:1,data:{sleep_hours:7}};
 assert.equal(db.commitDraftUpdate('draft','1',s),true);
 assert.equal(db.commitDraftUpdate('draft','1',{...s,step:2}),false);
 assert.equal(db.getDraft('draft').step,1);
});
const Database=require('better-sqlite3');
const sql=new Database(process.env.DB_PATH);
function input(userId,updateId,text='original',replace=false){return {userId,updateId,replace,checkin:{user_id:userId,date:'2026-11-17',sleep_hours:7,wake_quality:8,activity:'walk',energy:7,reflection:text,goal_progress:null}};}
test('source and reflection saved before AI; duplicate creates no second record',()=>{
 const a=db.saveSubmission(input('once','10'));
 const b=db.saveSubmission(input('once','10'));
 assert.equal(b.duplicate,true);assert.equal(a.id,b.id);
 assert.equal(db.getAll('once').length,1);
 assert.deepEqual(JSON.parse(db.getLastReflection('once').answers),['original']);
 assert.equal(sql.prepare('SELECT status FROM reflection_submissions WHERE id=?').get(a.id).status,'pending');
 db.finishSubmission(a.id,{failed:true});
 assert.equal(db.getAll('once')[0].reflection,'original');
 assert.equal(db.getAll('once')[0].goal_progress,null);
});
test('transaction rollback preserves draft and permits retry after DB failure',()=>{
 db.commitDraftUpdate('rollback','20',{type:'reflection',step:4,data:{energy:7}});
 sql.exec("CREATE TRIGGER fail_ref BEFORE INSERT ON reflections WHEN NEW.user_id='rollback' BEGIN SELECT RAISE(ABORT,'injected write failure'); END");
 assert.throws(()=>db.saveSubmission(input('rollback','21')),/injected/);
 assert.equal(db.getAll('rollback').length,0);assert.equal(db.getDraft('rollback').step,4);
 assert.equal(db.hasProcessedUpdate('rollback','21'),false);
 sql.exec('DROP TRIGGER fail_ref');
 db.saveSubmission(input('rollback','21'));
 assert.equal(db.getDraft('rollback'),null);
});
test('replacement requires consent, archives prior source and rejects stale AI result',()=>{
 const old=db.saveSubmission(input('edit','30'));
 assert.throws(()=>db.saveSubmission(input('edit','31','new')),/confirmation/);
 const current=db.saveSubmission(input('edit','31','new',true));
 assert.equal(db.finishSubmission(old.id,{summary:'STALE',progress:1}),false);
 assert.equal(db.finishSubmission(current.id,{summary:'CURRENT',progress:0}),true);
 assert.equal(db.getAll('edit').length,1);assert.equal(db.getAll('edit')[0].reflection,'new');
 assert.equal(db.getLastReflection('edit').summary,'CURRENT');
 const rev=JSON.parse(sql.prepare('SELECT snapshot FROM reflection_revisions WHERE user_id=?').get('edit').snapshot);
 assert.equal(rev.checkins[0].reflection,'original');
});
test('migration and draft persist when database module is reopened',()=>{
 delete require.cache[require.resolve('./db')];const reopened=require('./db');
 assert.equal(reopened.getDraft('draft').step,1);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM schema_migrations WHERE version=1').get().n,1);
});
test('draft and operation identity cannot cross users',()=>{
 db.commitDraftUpdate('separate-a','50',{type:'onboarding',step:1,data:{}});
 assert.equal(db.getDraft('separate-b'),null);
 assert.equal(db.hasProcessedUpdate('separate-b','50'),false);
 assert.throws(()=>db.saveSubmission({...input('separate-b','51'),userId:'separate-a'}),/mismatch/);
});
