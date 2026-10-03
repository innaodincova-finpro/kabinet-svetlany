// Pupil filter in «Посещения и оплата»: view-only, month kept, totals stay cabinet-wide.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{boot}=require('./dom-harness.cjs');
const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
function setup(){
 const b=boot(html),a=b.api,d=a.seed();
 d.students=[{id:'a',name:'TEST Anna',cls:'7',type:'индивидуально',rate:20,duration:60,slots:[]},{id:'b',name:'TEST Boris',cls:'8',type:'индивидуально',rate:30,duration:60,slots:[]}];
 d.groups=[];d.routes=[];
 d.lessons=[
  {id:'l1',date:'2026-08-10',time:'10:00',duration:60,ownerType:'student',ownerId:'a',marks:{a:{s:'был',ch:true}},rates:{a:20}},
  {id:'l2',date:'2026-09-10',time:'10:00',duration:60,ownerType:'student',ownerId:'a',marks:{a:{s:'был',ch:true}},rates:{a:20}},
  {id:'l3',date:'2026-09-11',time:'10:00',duration:60,ownerType:'student',ownerId:'b',marks:{b:{s:'был',ch:true}},rates:{b:30}}];
 d.payments=[{id:'p1',studentId:'a',date:'2026-09-12',amount:15},{id:'p2',studentId:'b',date:'2026-09-12',amount:30}];
 a.setState(d);return {...b,a,d};
}
const sel=(v,label)=>v.querySelectorAll('select').find(x=>x.getAttribute('aria-label')===label);
const choose=(s,value)=>{s.value=value;s.dispatchEvent({type:'change',target:s})};
const names=v=>v.querySelectorAll('tbody tr .name').map(n=>n.textContent);
function test(n,f){f();console.log('PASS '+n)}
test('Pupil selector lists active pupils and filters rows without writing records',()=>{
 const {a}=setup();const before=a.getRaw();let v=a.viewMoney();
 choose(sel(v,'Месяц'),'2026-09');v=a.viewMoney();
 const s=sel(v,'Ученик');assert.deepEqual(s.children.map(o=>o.textContent),['Все ученики','TEST Anna · 7 кл.','TEST Boris · 8 кл.']);
 assert.deepEqual(names(v),['TEST Anna','TEST Boris']);
 choose(s,'b');v=a.viewMoney();assert.deepEqual(names(v),['TEST Boris']);
 assert.equal(a.getRaw(),before);
});
test('Month is kept when the pupil changes and the pupil is kept when the month changes',()=>{
 const {a}=setup();let v=a.viewMoney();choose(sel(v,'Месяц'),'2026-08');v=a.viewMoney();
 choose(sel(v,'Ученик'),'a');v=a.viewMoney();assert.equal(sel(v,'Месяц').value,'2026-08');
 choose(sel(v,'Месяц'),'2026-09');v=a.viewMoney();assert.equal(sel(v,'Ученик').value,'a');assert.deepEqual(names(v),['TEST Anna']);
 const cells=v.querySelectorAll('tbody tr')[0].querySelectorAll('td').map(x=>x.textContent);
 assert.equal(cells[1],'1');assert.ok(cells[4].includes('20'));assert.ok(cells[5].includes('15'));
});
test('Totals are labelled cabinet-wide while one pupil is shown; all pupils restores the list',()=>{
 const {a}=setup();let v=a.viewMoney();choose(sel(v,'Месяц'),'2026-09');v=a.viewMoney();
 assert.ok(v.textContent.includes('За месяц начислено'));
 choose(sel(v,'Ученик'),'a');v=a.viewMoney();
 assert.ok(v.textContent.includes('Весь кабинет за месяц: начислено'));assert.ok(v.textContent.includes('выгрузки в Word, Excel и CSV — по всему кабинету'));
 choose(sel(v,'Ученик'),'');v=a.viewMoney();assert.deepEqual(names(v),['TEST Anna','TEST Boris']);assert.ok(!v.textContent.includes('Весь кабинет за месяц'));
});
test('Opened payment history of another pupil closes; own history stays open',()=>{
 const {a}=setup();let v=a.viewMoney();choose(sel(v,'Месяц'),'2026-09');v=a.viewMoney();
 v.querySelectorAll('button').filter(b=>b.textContent==='Платежи')[0].click();v=a.viewMoney();assert.ok(v.textContent.includes('Платежи · TEST Anna'));
 choose(sel(v,'Ученик'),'a');v=a.viewMoney();assert.ok(v.textContent.includes('Платежи · TEST Anna'));
 choose(sel(v,'Ученик'),'b');v=a.viewMoney();assert.ok(!v.textContent.includes('Платежи · TEST Anna'));
});
test('Deleted selected pupil falls back to all pupils',()=>{
 const {a,d}=setup();let v=a.viewMoney();choose(sel(v,'Ученик'),'b');d.students=d.students.filter(s=>s.id!=='b');
 v=a.viewMoney();assert.equal(sel(v,'Ученик').value,'');
});
