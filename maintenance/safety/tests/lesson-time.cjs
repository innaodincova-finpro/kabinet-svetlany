// Incomplete lesson date/time/duration must never hide other lessons or be saved.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {boot}=require('./dom-harness.cjs');
const html=fs.readFileSync('index.html','utf8');
const MON='2030-01-07';
function lesson(id,extra={}){return {id,ownerType:'student',ownerId:'a',date:MON,time:'10:00',duration:60,topicId:null,marks:{},materialIds:[],homework:'',result:'',note:'',...extra};}
function setup(lessons){const b=boot(html),d=b.api.seed();d.students=[{id:'a',name:'TEST TIME',type:'индивидуально',cls:'5',duration:60,format:'офлайн',rate:10,payMode:'за занятие',slots:[]}];d.groups=[];d.payments=[];d.lessons=lessons;b.api.setState(d);b.api.save('fixture');return b;}
const broken=()=>[lesson('noDur',{date:'2030-01-08',duration:undefined}),lesson('emptyTime',{date:'2030-01-09',time:''}),lesson('noTime',{date:'2030-01-10',time:undefined}),lesson('textDur',{date:'2030-01-11',duration:'60'}),lesson('noDate',{date:''})];
function btn(root,t){const x=root.querySelectorAll('button').find(n=>n.textContent===t);assert.ok(x,'button '+t);x.click();}
function test(name,fn){fn();console.log('PASS '+name)}
function field(dlg,type){return dlg.querySelectorAll('input').find(n=>n.type===type);}

for(const [type,label] of [['time','время'],['date','дату']]) test(`Lesson card refuses empty ${type} and keeps the form open`,()=>{
  const b=setup([lesson('ok')]),a=b.api,before=a.getRaw();
  a.openLessonCard(a.getState().lessons[0],false);const dlg=b.doc.querySelector('#lessonDlg');
  field(dlg,type).value='';btn(dlg,'Сохранить');
  assert.equal(dlg.open,true);assert.equal(a.getRaw(),before);
  assert.match(dlg.textContent,new RegExp('Не сохранено: укажите '+label));
  assert.equal(field(dlg,type).getAttribute('aria-invalid'),'true');
});
test('Lesson card refuses a lesson that ends after midnight',()=>{
  const b=setup([lesson('ok')]),a=b.api,before=a.getRaw();
  a.openLessonCard(a.getState().lessons[0],false);const dlg=b.doc.querySelector('#lessonDlg');
  field(dlg,'time').value='23:30';btn(dlg,'Сохранить');
  assert.equal(dlg.open,true);assert.equal(a.getRaw(),before);assert.match(dlg.textContent,/до полуночи/);
});
test('Broken lessons do not hide the week, do not break screens and are listed unchanged',()=>{
  const list=[lesson('ok'),lesson('ok2',{date:'2030-01-12',time:'16:00'}),...broken()];
  const b=setup(list),a=b.api,before=a.getRaw();
  const g=a.weekGrid(new Date(2030,0,7),null);
  assert.ok(g.querySelectorAll('.hcell').length>=13,'hour rows are shown');
  assert.equal(g.querySelectorAll('.wl').length,2,'both complete lessons are shown');
  for(const v of ['viewToday','viewSchedule','viewPeople','viewMoney','viewReports']) assert.doesNotMatch(a[v]().textContent,/Не удалось|NaN/,v);
  const block=a.brokenLessonsBlock();assert.ok(block);
  assert.match(block.textContent,/Требуют исправления: 5 занятий/);
  assert.match(block.textContent,/дата не указана/);assert.match(block.textContent,/время не указано/);assert.match(block.textContent,/не указана длительность/);assert.doesNotMatch(block.textContent,/не указано время/);
  assert.equal(block.querySelectorAll('button').filter(n=>n.textContent==='Исправить').length,5);
  assert.equal(a.getRaw(),before,'nothing was rewritten or invented');
});
test('A broken lesson can be corrected from the list and then leaves it',()=>{
  const b=setup([lesson('ok'),lesson('emptyTime',{date:'2030-01-09',time:'',duration:undefined})]),a=b.api;
  btn(a.brokenLessonsBlock(),'Исправить');const dlg=b.doc.querySelector('#lessonDlg');
  assert.match(dlg.textContent,/время не указано/);
  btn(dlg,'Сохранить');assert.equal(dlg.open,true,'still incomplete');assert.match(dlg.textContent,/время, длительность/);
  field(dlg,'time').value='12:00';const dur=dlg.querySelectorAll('select').find(s=>s.querySelectorAll('option').some(o=>o.textContent==='— укажите —'));dur.value='90';
  btn(dlg,'Сохранить');assert.equal(dlg.open,false);
  const saved=JSON.parse(a.getRaw()).lessons.find(l=>l.id==='emptyTime');
  assert.equal(saved.time,'12:00');assert.equal(saved.duration,90);assert.equal(a.brokenLessonsBlock(),null);
});
test('Non-standard duration is kept when the card is saved',()=>{
  const b=setup([lesson('odd',{duration:45})]),a=b.api;
  a.openLessonCard(a.getState().lessons[0],false);btn(b.doc.querySelector('#lessonDlg'),'Сохранить');
  assert.equal(JSON.parse(a.getRaw()).lessons[0].duration,45);
});
test('Clash check, calendar export and recurring schedule ignore incomplete data safely',()=>{
  const b=setup([lesson('ok',{date:'2099-01-05'}),lesson('gone',{date:'2099-01-06',marks:{a:{s:'перенос'}}}),lesson('bad',{date:'2099-01-07',time:''})]),a=b.api,d=a.getState();
  assert.equal(a.overlaps('2099-01-07','',60),null);assert.equal(a.overlaps('2099-01-05','10:30',60).id,'ok');
  const days=Math.ceil((new Date(2099,0,10)-new Date())/86400000);const ics=a.icsText(days);
  assert.equal(ics.count,1);assert.doesNotMatch(ics.text,/NaN/);
  d.students[0].duration=undefined;d.students[0].slots=[{dow:2,time:'09:00'}];
  const r=a.spreadSlots('student','a','2099-02-01','2099-02-28');assert.equal(r.created,0);
  assert.ok(d.lessons.every(l=>l.id==='ok'||l.id==='gone'||l.id==='bad'));
});
test('Loading and importing keep incomplete lessons instead of rejecting the whole cabinet',()=>{
  const b=setup([lesson('ok'),...broken().filter(l=>l.id!=='noTime')]),a=b.api;
  const raw=a.getRaw(),c=boot(html);c.api.putRaw(raw);const loaded=c.api.load();
  assert.equal(c.api.getFlags().dataUnreadable,false);assert.equal(loaded.lessons.length,5);
  assert.equal(a.safePrepare(JSON.parse(raw)).lessons.length,5);
});
