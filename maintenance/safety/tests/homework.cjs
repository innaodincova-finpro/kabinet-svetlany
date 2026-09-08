const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {boot}=require('./dom-harness.cjs');
const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
function setup(){
 const b=boot(html),a=b.api,d=a.seed();
 d.students=['a','b'].map(id=>({id,name:'Test '+id,type:'группа',groupId:'g',cls:'5',rate:10,duration:60}));
 d.groups=[{id:'g',name:'Test group',memberIds:['a','b'],cls:'5',rate:10,duration:60}];
 d.topicBank={'5':[{id:'t',title:'Test topic'}]};
 d.lessons=[{id:'old',ownerType:'group',ownerId:'g',date:'2026-09-01',time:'10:00',duration:60,topicId:'t',marks:{a:{s:'был'},b:{s:'пропуск'}},homework:'',per:{a:{homework:'№ 1',hwSolution:{text:'Ответ: 2'}}},hwCheck:{s:'сделана',note:'legacy'}}];
 a.setState(d);return {...b,a,d};
}
async function check(name,fn){await fn();console.log('PASS',name)}
(async()=>{
 await check('Previous homework resolves personal group assignment and excludes unheld lessons',()=>{
  const {a,d}=setup(),current={...d.lessons[0],id:'next',date:'2026-09-06'};
  assert.equal(a.prevHomework(current,'a').id,'old');assert.equal(a.homeworkFor(a.prevHomework(current,'a'),'a'),'№ 1');
  assert.equal(a.prevHomework(current,'b'),null);
  d.lessons.push({...d.lessons[0],id:'unheld',date:'2026-09-04',marks:{},homework:'Not assigned'});
  assert.equal(a.prevHomework(current,'a').id,'old');
 });
 await check('Absence and transfer do not mark a topic passed for a child',()=>{
  const {a,d}=setup();assert.equal(a.passedTopics('group','g','a').length,1);assert.equal(a.passedTopics('group','g','b').length,0);
  d.lessons[0].marks.a.s='перенос';assert.equal(a.passedTopics('group','g').length,0);
 });
 await check('Individual checks differ and legacy group check is not attributed to children',()=>{
  const {a,d}=setup(),l=d.lessons[0];assert.equal(a.homeworkCheckFor(l,'a'),null);
  l.hwChecks={a:{s:'ошибки',note:'№ 1: знак'},b:{s:'нет',note:'№ 2'}};
  assert.equal(a.homeworkCheckFor(l,'a').s,'ошибки');assert.equal(a.homeworkCheckFor(l,'b').s,'нет');
  assert.equal(l.hwCheck.note,'legacy');
 });
 await check('Full backup and install preserve solution PDFs, individual errors and old records',async()=>{
  const {a,d}=setup();const l=d.lessons[0];l.hwSolution={text:'Общее решение',fileId:'pdf-general',fileName:'solution.pdf'};
  l.per.a.hwSolution.fileId='pdf-personal';l.hwChecks={a:{s:'ошибки',note:'№ 1: знак'}};
  await a.putFile('pdf-general',new Blob(['%PDF-general']));await a.putFile('pdf-personal',new Blob(['%PDF-personal']));
  const packed=await a.safeBackupBlob(d),decoded=await a.safeDecode(await packed.text());
  assert.equal(decoded.files.length,2);assert.equal(decoded.data.lessons[0].hwChecks.a.note,'№ 1: знак');
  await a.safeInstall(decoded);const saved=a.getState().lessons[0];
  assert.equal(await (await a.getFile(saved.per.a.hwSolution.fileId)).text(),'%PDF-personal');
  assert.equal(await (await a.getFile(saved.hwSolution.fileId)).text(),'%PDF-general');assert.equal(saved.hwCheck.note,'legacy');
 });
 await check('Solution text is rendered as text, never HTML',()=>{
  const {a}=setup();const v=a.homeworkSolutionView({text:'<img src=x onerror=alert(1)>'});
  assert.equal(v.querySelectorAll('img').length,0);assert.ok(v.textContent.includes('<img'));
 });
 await check('Group lesson form opens with solutions and separate checking controls',()=>{
  const {a,d,doc}=setup();a.openLessonCard({...d.lessons[0],id:'next',date:'2026-09-06',marks:{},hwCheck:null},true);
  const dlg=doc.querySelector('#lessonDlg');assert.ok(dlg.textContent.includes('Решение ДЗ'));assert.ok(dlg.textContent.includes('Проверка прошлого ДЗ'));
  assert.equal(dlg.querySelectorAll('textarea').filter(x=>x.getAttribute('placeholder')==='Номер задания, ошибка ученика, что нужно повторить').length,2);
 });
 await check('Saving and reopening a group lesson preserves personal solution and errors',()=>{
  const {a,d,doc}=setup();a.openLessonCard(d.lessons[0],false);
  let dlg=doc.querySelector('#lessonDlg');
  const errors=dlg.querySelectorAll('textarea').filter(x=>x.getAttribute('placeholder')==='Номер задания, ошибка ученика, что нужно повторить');
  errors[0].value='№ 7: ошибка знака';errors[0].dispatchEvent({type:'input'});
  const checks=dlg.querySelectorAll('select').filter(x=>x.textContent.includes('Не проверено'));
  checks[0].value='ошибки';checks[0].dispatchEvent({type:'change'});
  checks[1].value='нет';checks[1].dispatchEvent({type:'change'});
  dlg.querySelectorAll('button').find(x=>x.textContent==='Сохранить').click();
  const l=a.getState().lessons[0];assert.equal(l.hwChecks.a.note,'№ 7: ошибка знака');assert.equal(l.hwChecks.b.s,'нет');
  assert.equal(l.per.a.hwSolution.text,'Ответ: 2');assert.equal(l.hwCheck.note,'legacy');
  assert.equal(JSON.parse(a.getRaw()).lessons[0].hwChecks.a.s,'ошибки');
  a.openLessonCard(l,false);dlg=doc.querySelector('#lessonDlg');
  assert.ok(dlg.querySelectorAll('textarea').some(x=>x.value==='№ 7: ошибка знака'));
 });
 await check('Read-only lesson save preserves form, draft and stored data',()=>{
  const {a,d,doc,raw}=setup();a.persist(true);const before=a.getRaw();
  a.openLessonCard(d.lessons[0],false);const dlg=doc.querySelector('#lessonDlg');
  const text=dlg.querySelectorAll('textarea').find(x=>x.getAttribute('placeholder')==='Учебник, страницы, номера заданий; решения и ответы');
  text.value='UNSAVED_SOLUTION';text.dispatchEvent({type:'input',bubbles:true});
  a.setFlags({readOnlyTab:true});dlg.querySelectorAll('button').find(x=>x.textContent==='Сохранить').click();
  assert.equal(a.getRaw(),before);assert.equal(dlg.open,true);
  assert.equal(doc.querySelector('#toast').textContent,'Занятие не сохранено');
  const draft=JSON.parse(raw['tochka-draft:v2:lesson:old']);assert.equal(draft.extras.solution.text,'UNSAVED_SOLUTION');
  assert.notEqual(a.getState().lessons[0].hwSolution?.text,'UNSAVED_SOLUTION');
 });
 await check('Storage refusal leaves lesson and draft open instead of success',()=>{
  const {a,d,doc,ctx,raw}=setup();a.persist(true);const before=a.getRaw();a.openLessonCard(d.lessons[0],false);
  a.setStorageFailure(true);
  const dlg=doc.querySelector('#lessonDlg');dlg.querySelectorAll('button').find(x=>x.textContent==='Сохранить').click();
  assert.equal(a.getRaw(),before);assert.equal(dlg.open,true);assert.ok(raw['tochka-draft:v2:lesson:old']);
  assert.equal(doc.querySelector('#toast').textContent,'Занятие не сохранено');
 });
 await check('Concurrent newer record cannot be replaced by an open lesson form',()=>{
  const {a,d,doc}=setup();a.persist(true);a.openLessonCard(d.lessons[0],false);
  const newer=JSON.parse(a.getRaw());newer.lessons[0].homework='NEWER';a.putRaw(JSON.stringify(newer));
  const dlg=doc.querySelector('#lessonDlg');dlg.querySelectorAll('button').find(x=>x.textContent==='Сохранить').click();
  assert.equal(JSON.parse(a.getRaw()).lessons[0].homework,'NEWER');assert.equal(dlg.open,true);
 });
 await check('Extended draft restores solution PDF link and individual feedback',()=>{
  const {a,d,doc,raw}=setup();
  raw['tochka-draft:v2:lesson:old']=JSON.stringify({at:Date.now(),d:{},extras:{solution:{text:'DRAFT',fileId:'kept-pdf',fileName:'kept.pdf'},hwChecks:{a:{s:'ошибки',note:'DRAFT_ERROR'}},perData:{a:{homework:'PERSONAL',hwSolution:{text:'PERSONAL_SOLUTION'}}}}});
  a.openLessonCard(d.lessons[0],false);const dlg=doc.querySelector('#lessonDlg');
  assert.ok(dlg.querySelectorAll('textarea').some(x=>x.value==='DRAFT'));
  assert.ok(dlg.querySelectorAll('textarea').some(x=>x.value==='DRAFT_ERROR'));
  assert.ok(dlg.querySelectorAll('button').some(x=>x.textContent==='Открыть PDF решения'&&!x.disabled));
  dlg.querySelectorAll('button').find(x=>x.textContent==='Сохранить').click();
  const l=JSON.parse(a.getRaw()).lessons[0];assert.equal(l.hwSolution.fileId,'kept-pdf');assert.equal(l.per.a.hwSolution.text,'PERSONAL_SOLUTION');
  assert.equal(raw['tochka-draft:v2:lesson:old'],undefined);
 });
 await check('Parent reports do not exchange individual errors between pupils',()=>{
  const {a,d}=setup();d.lessons[0].marks.b={s:'был'};
  d.lessons[0].hwChecks={a:{s:'ошибки',note:'ONLY_A'},b:{s:'частично',note:'ONLY_B'}};
  const reportA=JSON.stringify(a.reportBlocks(d.students[0],'2026-09'));
  const reportB=JSON.stringify(a.reportBlocks(d.students[1],'2026-09'));
  assert.ok(reportA.includes('ONLY_A'));assert.ok(!reportA.includes('ONLY_B'));
  assert.ok(reportB.includes('ONLY_B'));assert.ok(!reportB.includes('ONLY_A'));
 });
})().catch(e=>{console.error(e);process.exitCode=1});
