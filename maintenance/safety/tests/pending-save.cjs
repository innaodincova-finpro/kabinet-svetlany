const fs=require('fs'),assert=require('node:assert/strict'),{boot}=require('./dom-harness.cjs');
const html=fs.readFileSync('index.html','utf8');
function setup(){const b=boot(html),a=b.api,d=a.seed();
 d.students=[{id:'a',name:'TEST',type:'индивидуально',cls:'5',rate:10,duration:60}];
 d.lessons=[{id:'test',ownerType:'student',ownerId:'a',date:'2026-09-08',time:'10:00',duration:60,marks:{},per:{},homework:''}];
 a.setState(d);a.persist(true);return {...b,a,d};}
const settle=()=>new Promise(r=>setImmediate(r));
async function test(name,fn){await fn();console.log('PASS',name);}
(async()=>{
 await test('Attendance click alone survives reopening the lesson draft',()=>{
  const {a,d,doc,raw}=setup();a.openLessonCard(d.lessons[0]);let dlg=doc.getElementById('lessonDlg');
  dlg.querySelectorAll('button').find(n=>n.classList.contains('pill')).click();
  assert(Object.keys(raw).some(k=>raw[k].includes('"extras"')&&raw[k].includes('"s":"был"')));
  dlg.close();a.openLessonCard(a.getState().lessons[0]);
  assert(dlg.querySelectorAll('button').some(n=>n.textContent==='присутствовал'&&n.getAttribute('aria-pressed')==='true'));
 });
 await test('Rejected general save preserves input separately and retries exactly once',async()=>{
  const {a,doc,raw}=setup(),before=a.getRaw();a.setStorageFailure(true);a.getState().tutor='PENDING';
  assert.equal(a.save('Имя'),false);await settle();
  assert.equal(a.getRaw(),before);assert.equal(a.getState().tutor,JSON.parse(before).tutor);
  assert(doc.getElementById('pendingSaveDlg').open);
  assert(Object.keys(raw).some(k=>k.startsWith('svetlana-pending:')));
  a.setStorageFailure(false);assert.equal(await a.pendingRetry(),true);assert.equal(JSON.parse(a.getRaw()).tutor,'PENDING');
  await a.pendingRecover();assert.equal(doc.getElementById('pendingSaveDlg').open,false);
 });
 await test('Pending input is offered after reload without overwriting the primary',async()=>{
  const b=setup();b.a.setStorageFailure(true);b.a.getState().tutor='RECOVER';b.a.save('Имя');await settle();
  const c=setup();Object.assign(c.raw,b.raw);c.a.setState(c.a.load());const before=c.a.getRaw();
  await c.a.pendingRecover();assert(c.doc.getElementById('pendingSaveDlg').open);assert.equal(c.a.getRaw(),before);
  assert.equal(await c.a.pendingRetry(),true);assert.equal(JSON.parse(c.a.getRaw()).tutor,'RECOVER');
 });
 await test('Newer competing data block retry and takeover without losing pending input',async()=>{
  const {a,raw}=setup();a.setStorageFailure(true);a.getState().tutor='PENDING';a.save('Имя');await settle();a.setStorageFailure(false);
  const newer=JSON.parse(a.getRaw());newer.tutor='OTHER TAB';a.putRaw(JSON.stringify(newer));const before=a.getRaw();
  assert.equal(await a.pendingRetry(),false);a.takeOver(true);assert.equal(a.getRaw(),before);
  assert(Object.keys(raw).some(k=>k.startsWith('svetlana-pending:')&&JSON.parse(raw[k]).data.includes('PENDING')));
 });
 await test('IndexedDB fallback preserves pending input when all localStorage writes fail',async()=>{
  const b=setup();b.a.setAllStorageFailure(true);b.a.getState().tutor='FALLBACK';
  assert.equal(b.a.save('Имя'),false);await settle();
  const records=await b.a.safeTx('readonly',s=>s.getAll());
  assert(records.some(r=>r.kind==='svetlana-pending-save'&&r.data.includes('FALLBACK')));
 });
})().catch(e=>{console.error(e);process.exitCode=1;});
