const fs=require('node:fs'),assert=require('node:assert/strict');
const {boot}=require('./dom-harness.cjs');
const html=fs.readFileSync('index.html','utf8');
function setup(){const b=boot(html),a=b.api,d=a.seed();
 d.students=['a','b'].map((id,i)=>({id,name:'TEST '+id,cls:String(5+i),type:'группа',groupId:'g',rate:10,duration:60,slots:[]}));
 d.groups=[{id:'g',name:'TEST GROUP',memberIds:['a','b'],cls:'5',rate:10,duration:60,slots:[]}];
 d.topicBank={'5':[{id:'t',title:'Дроби',sec:'Раздел дробей',goals:'Цель дробей'}]};
 d.lessons=[{id:'l',ownerType:'group',ownerId:'g',date:'2026-09-01',time:'10:00',duration:60,topicId:'t',marks:{a:{s:'был',ch:true},b:{s:'был',ch:true}},per:{a:{result:'OLD A'},b:{result:'OLD B'}},materialIds:[]}];
 d.payments=[{id:'payment',studentId:'a',amount:500,date:'2026-09-01'}];a.setState(d);a.save('fixture');return b;}
const find=(n,tag,label)=>n.querySelectorAll(tag).find(x=>x.getAttribute('aria-label')===label);
const button=(n,label)=>n.querySelectorAll('button').find(x=>x.textContent===label).click();
const change=(n,value)=>{n.value=value;n.dispatchEvent({type:'change',bubbles:true})};
function test(name,fn){fn();console.log('PASS '+name)}
test('Report class filters pupils without modifying records or notes',()=>{
 const {api:a}=setup();const before=a.getRaw();let v=a.viewReports();change(find(v,'select','Класс в отчётах'),'6');v=a.viewReports();
 const sel=find(v,'select','Ученик в отчётах');assert.equal(sel.children.length,1);assert.equal(sel.value,'b');assert.equal(a.getRaw(),before);
 change(find(v,'select','Класс в отчётах'),'');assert.equal(find(a.viewReports(),'select','Ученик в отчётах').children.length,2);
});
test('Personal text survives pupil switches, save and reopening; other pupil and payment preserved',()=>{
 const {api:a,doc}=setup();a.openLessonCard(a.getState().lessons[0],false);let dlg=doc.querySelector('#lessonDlg');
 const filter=()=>find(dlg,'select','Ученик в групповом занятии');change(filter(),'a');
 let ta=dlg.querySelectorAll('textarea').find(x=>x.value==='OLD A');ta.value='NEW A';ta.dispatchEvent({type:'input',bubbles:true});
 change(filter(),'b');assert(dlg.querySelectorAll('textarea').some(x=>x.value==='OLD B'));change(filter(),'a');assert(dlg.querySelectorAll('textarea').some(x=>x.value==='NEW A'));
 button(dlg,'Сохранить');assert.equal(a.getState().lessons[0].per.a.result,'NEW A');assert.equal(a.getState().lessons[0].per.b.result,'OLD B');assert.equal(a.getState().payments[0].amount,500);
 const re=boot(html,{storage:{'tochka-resheniya-v2':a.getRaw()}});assert.equal(re.api.getState().lessons[0].per.a.result,'NEW A');
});
test('Free title saves without topic, appears in report and does not complete curriculum topic',()=>{
 const {api:a,doc}=setup();a.openLessonCard(a.getState().lessons[0],false);const dlg=doc.querySelector('#lessonDlg');
 find(dlg,'input','Название занятия').value='Математическая викторина';button(dlg,'Без привязки к программе');button(dlg,'Сохранить');
 const d=a.getState(),l=d.lessons[0];assert.equal(l.lessonTitle,'Математическая викторина');assert.equal(l.topicId,null);
 assert.equal(a.passedTopics('group','g','a').length,0);const report=JSON.stringify(a.reportBlocks(d.students[0],'2026-09'));assert(report.includes('Математическая викторина'));assert(!report.includes('Цель дробей'));
 a.openLessonCard(l,false);assert.equal(find(doc.querySelector('#lessonDlg'),'input','Название занятия').value,'Математическая викторина');
});
