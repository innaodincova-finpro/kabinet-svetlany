const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {boot}=require('./dom-harness.cjs');
const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
function setup(){
 const b=boot(html),a=b.api,d=a.seed();
 d.students=['a','b'].map(id=>({id,name:'TEST '+id,type:'группа',groupId:'g',cls:'5',rate:10,duration:60,slots:[]}));
 d.groups=[{id:'g',name:'TEST GROUP',memberIds:['a','b'],cls:'5',rate:10,duration:60,slots:[]}];
 d.topicBank={'5':['t1','t2','t3','t4'].map(id=>({id,title:'TOPIC '+id}))};
 d.routes=[{id:'r',ownerType:'group',ownerId:'g',topicIds:['t2','t1','t3','t4']}];
 d.lessons=[];a.setState(d);return {...b,a,d};
}
const ids=x=>Array.from(x,t=>t.id);
function check(name,fn){fn();console.log('PASS',name)}
check('Upcoming route topics render without scheduled lessons and do not change state or storage',()=>{
 const {a,d,raw}=setup();const before=JSON.stringify(d),storage=JSON.stringify(raw);
 assert.deepEqual(ids(a.upcomingTopics('group','g',3)),['t2','t1','t3']);
 a.setPerson('g:g');const card=a.viewPersonCard();
 assert.ok(card.textContent.includes('Впереди: TOPIC t2 · TOPIC t1 · TOPIC t3'));
 assert.equal(JSON.stringify(d),before);assert.equal(JSON.stringify(raw),storage);
});
check('Route reorder changes upcoming order; scheduled topics outside route do not replace it',()=>{
 const {a,d}=setup();d.routes[0].topicIds=['t3','t1'];d.lessons=[{ownerType:'group',ownerId:'g',topicId:'t4',date:'2099-01-01',time:'10:00',marks:{}}];
 assert.deepEqual(ids(a.upcomingTopics('group','g',3)),['t3','t1']);
});
check('Upcoming respects each group pupil attendance including absence and transfer',()=>{
 const {a,d}=setup();d.lessons=[{ownerType:'group',ownerId:'g',topicId:'t2',date:'2026-01-01',time:'10:00',marks:{a:{s:'был'},b:{s:'пропуск'}}}];
 assert.deepEqual(ids(a.upcomingTopics('group','g',3,'a')),['t1','t3','t4']);
 assert.deepEqual(ids(a.upcomingTopics('group','g',3,'b')),['t2','t1','t3']);
 a.setPerson('s:b');assert.ok(a.viewPersonCard().textContent.includes('Впереди: TOPIC t2 · TOPIC t1 · TOPIC t3'));
 d.lessons[0].marks.b.s='перенос';assert.equal(a.upcomingTopics('group','g',3,'b')[0].id,'t2');
});
check('Missing and duplicate route topics do not consume upcoming slots',()=>{
 const {a,d}=setup();d.routes[0].topicIds=['missing','t1','t1','t2','t3'];
 assert.deepEqual(ids(a.upcomingTopics('group','g',3)),['t1','t2','t3']);
});
check('Empty and completed routes stay empty without modifying saved route',()=>{
 const {a,d}=setup();d.routes[0].topicIds=[];assert.deepEqual(ids(a.upcomingTopics('group','g',3)),[]);
 d.routes[0].topicIds=['t1'];d.lessons=[{ownerType:'group',ownerId:'g',topicId:'t1',date:'2026-01-01',time:'10:00',marks:{a:{s:'был'}}}];
 const before=JSON.stringify(d);assert.deepEqual(ids(a.upcomingTopics('group','g',3)),[]);assert.equal(JSON.stringify(d),before);
});
check('Without a route upcoming falls back to scheduled topics',()=>{
 const {a,d}=setup();d.routes=[];d.lessons=[{ownerType:'group',ownerId:'g',topicId:'t4',date:'2099-01-01',time:'10:00',marks:{}}];
 assert.deepEqual(ids(a.upcomingTopics('group','g',3)),['t4']);
});
check('Individual route excludes passed topics and keeps other owners separate',()=>{
 const {a,d}=setup();d.routes.push({ownerType:'student',ownerId:'solo',topicIds:['t3','t1','t2']});
 d.lessons=[{ownerType:'student',ownerId:'solo',topicId:'t3',date:'2026-01-01',time:'10:00',marks:{solo:{s:'был'}}}];
 assert.deepEqual(ids(a.upcomingTopics('student','solo',3,'solo')),['t1','t2']);
 assert.deepEqual(ids(a.upcomingTopics('group','g',3)),['t2','t1','t3']);
});

check('Group upcoming excludes a topic the pupil attended in an individual lesson; absence does not count',()=>{
 const {a,d}=setup();d.lessons=[{ownerType:'student',ownerId:'a',topicId:'t2',date:'2026-01-02',time:'10:00',marks:{a:{s:'был'}}},
  {ownerType:'student',ownerId:'b',topicId:'t2',date:'2026-01-02',time:'12:00',marks:{b:{s:'пропуск'}}}];
 assert.deepEqual(ids(a.upcomingTopics('group','g',3,'a')),['t1','t3','t4']);
 assert.deepEqual(ids(a.upcomingTopics('group','g',3,'b')),['t2','t1','t3']);
 a.setPerson('s:a');assert.ok(a.viewPersonCard().textContent.includes('Впереди: TOPIC t1 · TOPIC t3 · TOPIC t4'));
});
check('Individual upcoming excludes a topic the pupil attended in the group',()=>{
 const {a,d}=setup();d.routes.push({ownerType:'student',ownerId:'a',topicIds:['t1','t2','t3']});
 d.lessons=[{ownerType:'group',ownerId:'g',topicId:'t1',date:'2026-01-01',time:'10:00',marks:{a:{s:'был'},b:{s:'был'}}}];
 assert.deepEqual(ids(a.upcomingTopics('student','a',3,'a')),['t2','t3']);
});
check('Without a route scheduled topics already attended by the pupil are not upcoming',()=>{
 const {a,d}=setup();d.routes=[];d.lessons=[{ownerType:'student',ownerId:'a',topicId:'t4',date:'2026-01-01',time:'10:00',marks:{a:{s:'был'}}},
  {ownerType:'group',ownerId:'g',topicId:'t4',date:'2099-01-01',time:'10:00',marks:{}},{ownerType:'group',ownerId:'g',topicId:'t3',date:'2099-01-02',time:'10:00',marks:{}}];
 assert.deepEqual(ids(a.upcomingTopics('group','g',3,'a')),['t3']);
 assert.deepEqual(ids(a.upcomingTopics('group','g',3,'b')),['t4','t3']);
});
check('Parent report «Что впереди» uses the pupil personal history, not other members',()=>{
 const {a,d}=setup();const m=new Date().toISOString().slice(0,7);
 d.lessons=[{id:'x',ownerType:'group',ownerId:'g',topicId:'t2',date:m+'-01',time:'00:00',duration:60,marks:{a:{s:'был',ch:true},b:{s:'пропуск',ch:false}},rates:{a:10,b:10}}];
 const ahead=st=>{const B=a.reportBlocks(d.students.find(s=>s.id===st),m),i=B.findIndex(x=>x.t==='Что впереди по плану');return i<0?[]:Array.from(B.slice(i+1).filter(x=>x.k==='li').map(x=>x.t).slice(0,3))};
 assert.deepEqual(ahead('a'),['TOPIC t1','TOPIC t3','TOPIC t4']);
 const before=JSON.stringify(d);a.reportBlocks(d.students[1],m);assert.equal(JSON.stringify(d),before);
});
