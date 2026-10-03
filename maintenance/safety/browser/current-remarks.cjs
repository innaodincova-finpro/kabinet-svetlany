// Synthetic fixture only: pupil filter in payments and personal upcoming topics.
const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async function(page,fixture,out,spec){
 const d=fixture(),today=new Date().toISOString().slice(0,10),month=today.slice(0,7);
 const prev=new Date(Date.UTC(+month.slice(0,4),+month.slice(5,7)-2,15)).toISOString().slice(0,10);
 d.topicBank={'5':['t1','t2','t3','t4'].map(id=>({id,title:'ROUTE '+id}))};
 d.routes=[{id:'r',ownerType:'group',ownerId:'g',topicIds:['t1','t2','t3','t4']}];
 d.lessons=[{id:'solo',ownerType:'student',ownerId:'a',date:prev,time:'10:00',duration:60,topicId:'t1',marks:{a:{s:'был',ch:true}},rates:{a:10},materialIds:[],homework:'',per:{},result:'',note:'',plan:''},
  {id:'grp',ownerType:'group',ownerId:'g',date:today,time:'09:00',duration:60,topicId:'t2',marks:{a:{s:'был',ch:true},b:{s:'пропуск',ch:false}},rates:{a:10,b:10},materialIds:[],homework:'',per:{},result:'',note:'',plan:''}];
 d.payments=[{id:'pa',studentId:'a',date:today,amount:10},{id:'pb',studentId:'b',date:prev,amount:5}];
 await page.evaluate(d=>localStorage.setItem('tochka-resheniya-v2',JSON.stringify(d)),d);
 page.once('dialog',x=>x.accept());await page.reload();
 const before=await page.evaluate(()=>localStorage.getItem('tochka-resheniya-v2'));
 const menu=page.locator('#menuBtn'),nav=async name=>{if(await menu.isVisible())await menu.click();await page.locator('#nav button').filter({hasText:name}).click();};
 await nav('Посещения и оплата');
 const pupil=page.getByLabel('Ученик',{exact:true}),mon=page.getByLabel('Месяц',{exact:true}),rows=page.locator('#view tbody tr .name');
 await mon.selectOption(prev.slice(0,7));await pupil.selectOption('b');
 assert.equal(await rows.count(),1);assert.match(await rows.first().innerText(),/TEST B/);
 assert.equal(await mon.inputValue(),prev.slice(0,7),'Month kept after choosing pupil');
 await mon.selectOption(month);assert.equal(await pupil.inputValue(),'b','Pupil kept after changing month');
 await page.getByText('Весь кабинет за месяц: начислено',{exact:false}).waitFor();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 assert.ok(overflow<=1,'No horizontal page overflow: '+overflow);
 await page.screenshot({path:path.join(out,spec.name+'-money-filter.png'),fullPage:true});
 await pupil.selectOption('');assert.equal(await rows.count(),2);
 await nav('Ученики');
 const open=async name=>{await page.locator('#view .list-row').filter({has:page.locator('.name',{hasText:name})}).first().getByRole('button',{name:'Открыть',exact:true}).click();};
 await open('TEST A');await page.getByText('Впереди: ROUTE t3 · ROUTE t4',{exact:true}).waitFor();
 await page.screenshot({path:path.join(out,spec.name+'-upcoming-personal.png')});
 await nav('Ученики');await open('TEST B');await page.getByText('Впереди: ROUTE t1 · ROUTE t2 · ROUTE t3',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>localStorage.getItem('tochka-resheniya-v2')),before,'Viewing does not write records');
 console.log('PASS current remarks',spec.name);
};
