// Synthetic data only: an incomplete lesson must not hide the current week and must be fixable.
const assert=require('node:assert/strict');
module.exports=async function(page,fixture,out,spec){
 const path=require('node:path');
 const d=fixture(),now=new Date(),mon=new Date(now.getFullYear(),now.getMonth(),now.getDate()-((now.getDay()+6)%7));
 const day=i=>{const x=new Date(mon);x.setDate(x.getDate()+i);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;};
 d.students=[{id:'t',name:'TEST TIME',type:'индивидуально',cls:'5',duration:60,rate:10,format:'офлайн',payMode:'за занятие',slots:[]}];d.groups=[];d.payments=[];
 d.lessons=[0,1,2].map(i=>({id:'w'+i,ownerType:'student',ownerId:'t',date:day(i),time:i===1?'':'10:00',duration:60,topicId:null,marks:{},materialIds:[],homework:'',result:'',note:''}));
 await page.evaluate(d=>localStorage.setItem('tochka-resheniya-v2',JSON.stringify(d)),d);
 page.once('dialog',x=>x.accept());await page.reload();
 const menu=page.locator('#menuBtn');const go=async()=>{if(await menu.isVisible())await menu.click();await page.locator('#nav button').filter({hasText:'Расписание'}).click();await page.locator('#view .seg button').filter({hasText:'Неделя'}).click();};
 await go();
 assert.ok(await page.locator('#view .hcell').count()>=13,'Week grid is shown despite an incomplete lesson');
 assert.equal(await page.locator('#view .week .wl').count(),2);
 const block=page.locator('#brokenLessons');await block.waitFor();
 await page.screenshot({path:path.join(out,spec.name+'-lesson-time.png')});
 await block.getByRole('button',{name:'Исправить',exact:true}).click();
 const dlg=page.locator('#lessonDlg');
 await dlg.getByRole('button',{name:'Сохранить',exact:true}).click();
 await dlg.getByText('Не сохранено: укажите время',{exact:false}).waitFor();
 await dlg.locator('input[type=time]').fill('12:00');
 await dlg.getByRole('button',{name:'Сохранить',exact:true}).click();await dlg.waitFor({state:'hidden'});
 assert.equal(await block.count(),0,'Correction list disappears after the fix');
 assert.equal(await page.locator('#view .week .wl').count(),3);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('tochka-resheniya-v2')).lessons.find(l=>l.id==='w1'));
 assert.equal(saved.time,'12:00');
 console.log('PASS lesson time',spec.name);
};
