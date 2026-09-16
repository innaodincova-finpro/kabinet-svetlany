const fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {boot}=require('./dom-harness.cjs'),{KEY,BASE,fixture,storageEqual,correctionEqual}=require('./upgrade-fixture.cjs');
const oldHTML=execFileSync('git',['show',BASE+':index.html'],{maxBuffer:8*1024*1024}).toString(),html=fs.readFileSync('index.html','utf8');
const views=['viewToday','viewSchedule','viewPeople','viewMethod','viewMaterials','viewMoney','viewReports','viewHelp'];
(async()=>{
 const old=boot(oldHTML),data=fixture(old.api.seed,'2030-01-07');old.api.setState(data);assert(old.api.save('synthetic fixture'));
 await old.api.putFile('upgrade-pdf',new Blob(['%PDF-1.4\nSYNTHETIC\n%%EOF'],{type:'application/pdf'}));
 await old.api.safeTx('readwrite',s=>s.put({note:'KEEP RECOVERY'},'upgrade-sentinel'));
 // Establish the same old-version load state as an existing installation.
 const prior=boot(oldHTML,{storage:old.raw,idb:old.idb});for(const v of views)try{prior.api[v]()}catch{};
 await new Promise(r=>setImmediate(r));const before={...prior.raw};
 const fresh=boot(html,{storage:before,idb:prior.idb});for(const v of views)fresh.api[v]();
 const reloaded=boot(html,{storage:fresh.raw,idb:fresh.idb});for(const v of views)reloaded.api[v]();
 await new Promise(r=>setImmediate(r));storageEqual(before,reloaded.raw);
 assert.equal(await (await reloaded.api.getFile('upgrade-pdf')).text(),'%PDF-1.4\nSYNTHETIC\n%%EOF');
 assert.deepEqual(await reloaded.api.safeTx('readonly',s=>s.get('upgrade-sentinel')),{note:'KEEP RECOVERY'});
 console.log('PASS Upgrade preserves every storage record and PDF across old/new boots and views');
 const saved=JSON.parse(reloaded.api.getRaw());
 reloaded.api.brokenLessonsBlock().querySelectorAll('button').find(b=>b.textContent==='Исправить').click();
 const dlg=reloaded.doc.querySelector('#lessonDlg');dlg.querySelectorAll('input').find(n=>n.type==='time').value='15:15';dlg.querySelectorAll('button').find(n=>n.textContent==='Сохранить').click();
 assert.equal(dlg.open,false);correctionEqual(saved,JSON.parse(reloaded.api.getRaw()));
 assert.equal(await (await reloaded.api.getFile('upgrade-pdf')).text(),'%PDF-1.4\nSYNTHETIC\n%%EOF');
 console.log('PASS Correcting one lesson preserves other lessons, payments, personal homework and PDF');
 // Comparator negative controls: no blanket omission of backup keys or PDF bytes.
 assert.throws(()=>storageEqual(before,{...before,[KEY]:before[KEY]+' '}));
 assert.throws(()=>storageEqual(before,{...before,'svetlana-extra':'unexpected'}));
 const corrupt=JSON.parse(reloaded.api.getRaw());corrupt.lessons.find(l=>l.id==='held').rates.a=999;
 assert.throws(()=>correctionEqual(saved,corrupt));
 console.log('PASS Preservation comparators reject changed records, extra keys and historical prices');
})().catch(e=>{console.error(e);process.exitCode=1});
