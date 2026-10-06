// Period by lessons: the tutor marks «1-й урок периода»; numbering and parent report follow it.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{boot}=require('./dom-harness.cjs');
const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
const L=(id,date,mark,extra={})=>({id,ownerType:'student',ownerId:'a',date,time:'10:00',duration:60,topicId:null,marks:mark?{a:mark}:{},rates:{a:10},materialIds:[],homework:'',per:{},result:'',note:'',plan:'',...extra});
function setup(){
 const b=boot(html),a=b.api,d=a.seed();
 d.students=[{id:'a',name:'TEST Anna',cls:'7',type:'индивидуально',rate:10,duration:60,slots:[]},{id:'b',name:'TEST Boris',cls:'7',type:'группа',groupId:'g',rate:10,duration:60,slots:[]},{id:'c',name:'TEST Clara',cls:'7',type:'группа',groupId:'g',rate:10,duration:60,slots:[]}];
 d.groups=[{id:'g',name:'TEST GROUP',cls:'7',memberIds:['b','c'],rate:10,duration:60,slots:[]}];d.routes=[];
 d.lessons=[L('l0','2026-09-20',{s:'был',ch:true}),L('l1','2026-09-25',{s:'был',ch:true},{starts:['a']}),L('l2','2026-09-27',{s:'был',ch:true}),
  L('l3','2026-10-01',{s:'пропуск',ch:false,reason:'болел'}),L('l4','2026-10-03',{s:'пропуск',ch:true}),L('l5','2026-10-06',{s:'был',ch:true},{starts:['a']}),L('l6','2099-10-08',null)];
 d.payments=[{id:'p1',studentId:'a',date:'2026-09-30',amount:20},{id:'p2',studentId:'a',date:'2026-10-06',amount:50}];
 a.setState(d);return {...b,a,d};
}
const les=(d,id)=>d.lessons.find(l=>l.id===id);
function test(n,f){f();console.log('PASS '+n)}
test('Lessons are numbered from the marked first lesson; uncharged absence is skipped, charged absence counts',()=>{
 const {a,d}=setup();
 assert.equal(a.lessonNoText(les(d,'l0')),'1-е занятие в сентябре');
 assert.equal(a.lessonNoText(les(d,'l1')),'1-й урок периода с 25 сентября');
 assert.equal(a.lessonNoText(les(d,'l2')),'2-й урок периода с 25 сентября');
 assert.equal(a.lessonNoText(les(d,'l3')),'');
 assert.equal(a.lessonNoText(les(d,'l4')),'3-й урок периода с 25 сентября');
 assert.equal(a.lessonNoText(les(d,'l5')),'1-й урок периода с 6 октября');
 assert.equal(a.lessonNoText(les(d,'l6')),'2-й урок периода с 6 октября');
});
test('Parent report for a period joins September and October and stops before the next first lesson',()=>{
 const {a,d}=setup();const before=JSON.stringify(d);
 const B=a.reportBlocks(d.students[0],'p:l1'),text=Array.from(B,b=>b.t||'').join('\n');
 assert.ok(text.includes('Период с 25 сентября по 3 октября 2026 · уроков: 3'));
 const data=a.reportData('a','p:l1');assert.deepEqual(Array.from(data.mine,e=>e.lesson.id),['l1','l2','l3','l4']);
 assert.equal(data.charged,30);assert.equal(data.paid,20);
 assert.ok(text.includes('Коротко за период'));assert.ok(!text.includes('за месяц'));
 assert.equal(JSON.stringify(d),before,'Report does not change records');
});
test('Calendar month report is unchanged by period marks',()=>{
 const {a}=setup();const data=a.reportData('a','2026-09');
 assert.deepEqual(Array.from(data.mine,e=>e.lesson.id),['l0','l1','l2']);assert.equal(data.charged,30);assert.equal(data.paid,20);
 assert.ok(Array.from(a.reportBlocks({id:'a',name:'TEST Anna',cls:'7'},'2026-09'),b=>b.t||'').join('\n').includes('Коротко за месяц'));
});
test('Reports screen offers the pupil periods after the months and opens the latest period',()=>{
 const {a}=setup();const v=a.viewReports();
 const sel=v.querySelectorAll('select').find(x=>x.getAttribute('aria-label')==='Месяц отчёта');
 const opts=sel.children.map(o=>o.textContent);
 assert.ok(opts.includes('Сентябрь 2026')||opts.some(o=>/2026$/.test(o)));
 assert.ok(opts.includes('Период с 25 сентября по 3 октября 2026 · уроков: 3'));
 assert.equal(sel.value,'p:l5');
});
test('Lesson card saves and clears «1-й урок периода» without touching marks or money',()=>{
 const {a,d,doc}=setup();a.openLessonCard(les(d,'l2'),false);let dlg=doc.querySelector('#lessonDlg');
 assert.ok(dlg.textContent.includes('2-й урок периода с 25 сентября'));
 const cb=()=>doc.querySelector('#lessonDlg').querySelectorAll('input').find(x=>x.getAttribute('aria-label')==='1-й урок периода: TEST Anna');
 let box=cb();assert.equal(!!box.checked,false);box.checked=true;box.dispatchEvent({type:'change',target:box});
 dlg.querySelectorAll('button').find(x=>x.textContent==='Сохранить').click();
 let l=les(a.getState(),'l2');assert.deepEqual(Array.from(l.starts),['a']);assert.deepEqual({...l.marks.a},{s:'был',ch:true});assert.equal(l.rates.a,10);
 assert.equal(a.lessonNoText(les(a.getState(),'l4')),'2-й урок периода с 27 сентября');
 a.openLessonCard(l,false);dlg=doc.querySelector('#lessonDlg');box=cb();assert.equal(!!box.checked,true);
 box.checked=false;box.dispatchEvent({type:'change',target:box});dlg.querySelectorAll('button').find(x=>x.textContent==='Сохранить').click();
 l=les(a.getState(),'l2');assert.equal(l.starts,undefined);
});
test('Group lesson start applies only to the marked pupil',()=>{
 const {a,d}=setup();
 d.lessons.push({id:'g1',ownerType:'group',ownerId:'g',date:'2026-10-02',time:'15:00',duration:60,marks:{b:{s:'был',ch:true},c:{s:'был',ch:true}},rates:{b:10,c:10},starts:['b'],materialIds:[],per:{},homework:'',result:'',note:'',plan:''},
  {id:'g2',ownerType:'group',ownerId:'g',date:'2026-10-04',time:'15:00',duration:60,marks:{b:{s:'был',ch:true},c:{s:'был',ch:true}},rates:{b:10,c:10},materialIds:[],per:{},homework:'',result:'',note:'',plan:''});
 assert.equal(a.lessonNoText(les(d,'g2'),'b'),'2-й урок периода с 2 октября');
 assert.equal(a.lessonNoText(les(d,'g2'),'c'),'2-е занятие в октябре');
 assert.equal(a.lessonNoText(les(d,'g2')),'2-е занятие в октябре');
 assert.equal(a.reportData('b','p:g1').charged,20);
});
