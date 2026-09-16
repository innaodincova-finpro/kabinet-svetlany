// Synthetic records only. Shared expectations are independent of application migration code.
const assert=require('node:assert/strict');
const KEY='tochka-resheniya-v2';
const BASE='7b96f766a945c8dfb7609a13c9124f02f6e6911d';
function fixture(seed,date){
 const d=seed();d.reportNotes={a:'PRIVATE REPORT A',b:'PRIVATE REPORT B'};
 d.students=['a','b'].map(id=>({id,name:'TEST '+id,groupId:'g',type:'группа',cls:'5',duration:60,rate:25,payMode:'за занятие',format:'офлайн',slots:[]}));
 d.groups=[{id:'g',name:'TEST GROUP',memberIds:['a','b'],cls:'5',duration:60,rate:30,payMode:'за занятие',format:'офлайн',slots:[]}];
 const lesson=(id,time,extra={})=>({id,ownerType:'group',ownerId:'g',date,time,duration:60,topicId:null,marks:{},materialIds:[],homework:'',result:'',note:'KEEP '+id,plan:'',...extra});
 d.lessons=[
  lesson('held','09:00',{done:true,members:['a','b'],rates:{a:18,b:19},marks:{a:{s:'был',ch:true},b:{s:'был',ch:true}},homework:'COMMON HOMEWORK',materialIds:['pdf'],hwSolution:{text:'COMMON SOLUTION',fileId:'upgrade-pdf',fileName:'test.pdf'},hwChecks:{a:{s:'ошибки',note:'ONLY A'},b:{s:'частично',note:'ONLY B'}},per:{a:{homework:'PERSONAL A',note:'PRIVATE A',hwSolution:{text:'SOLUTION A',fileId:'upgrade-pdf',fileName:'test.pdf'}},b:{homework:'PERSONAL B',note:'PRIVATE B'}}}),
  lesson('absent','11:00',{done:true,members:['a','b'],rates:{a:20,b:21},marks:{a:{s:'пропуск',ch:false,reason:'TEST REASON'},b:{s:'перенос',ch:false}}}),
  lesson('odd','13:00',{duration:45}),lesson('broken','',{homework:'KEEP BROKEN HOMEWORK'})
 ];
 d.payments=[{id:'p',studentId:'a',lessonId:'held',date,amount:18,note:'PAID'}];
 d.materials=[{id:'pdf',title:'TEST PDF',type:'pdf',fileId:'upgrade-pdf',fileName:'test.pdf',cls:'5'}];
 return d;
}
function storageEqual(before,after){
 const trim=s=>Object.fromEntries(Object.entries(s).filter(([k])=>k!=='tochka-place').sort(([a],[b])=>a.localeCompare(b)));
 const a=trim(after),b=trim(before);
 assert.deepEqual(Object.keys(a),Object.keys(b),'Storage key set changed');
 for(const key of Object.keys(b))assert.ok(a[key]===b[key],'Storage value changed: '+key);
}
function correctionEqual(before,after){
 assert.equal(after.lessons.length,before.lessons.length);
 assert.deepEqual(after.lessons.map(l=>l.id),before.lessons.map(l=>l.id));
 for(const old of before.lessons){
  const now=after.lessons.find(l=>l.id===old.id);
  if(old.id==='broken'){assert.equal(now.time,'15:15');continue;}
  const expected=structuredClone(old);
  if(Object.keys(old.marks||{}).length){
   if(old.ownerType==='group'&&!Array.isArray(old.members))expected.members=before.groups.find(g=>g.id===old.ownerId).memberIds.slice();
   expected.rates||={};
   for(const sid of Object.keys(old.marks))if(expected.rates[sid]==null)expected.rates[sid]=old.ownerType==='group'?before.groups.find(g=>g.id===old.ownerId).rate:before.students.find(s=>s.id===sid).rate;
  }
  assert.deepEqual(now,expected,'Unrelated lesson changed: '+old.id);
 }
 for(const key of Object.keys(before))if(!['lessons','updatedAt'].includes(key))assert.deepEqual(after[key],before[key],'Unrelated data changed: '+key);
}
module.exports={KEY,BASE,fixture,storageEqual,correctionEqual};
