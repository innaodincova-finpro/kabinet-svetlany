// Synthetic fixture only: «1-й урок периода» in the lesson card and a period parent report.
const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async function(page,fixture,out,spec){
 const d=fixture(),today=new Date().toISOString().slice(0,10);
 const prev=new Date(Date.UTC(+today.slice(0,4),+today.slice(5,7)-2,20)).toISOString().slice(0,10);
 const base={ownerType:'group',ownerId:'g',duration:60,topicId:null,materialIds:[],homework:'',per:{},result:'',note:'',plan:'',rates:{a:10,b:10}};
 d.lessons=[{...base,id:'pp1',date:prev,time:'10:00',marks:{a:{s:'был',ch:true},b:{s:'был',ch:true}}},
  {...base,id:'pp2',date:today,time:'09:00',marks:{a:{s:'был',ch:true},b:{s:'был',ch:true}}}];
 d.payments=[];
 await page.evaluate(d=>localStorage.setItem('tochka-resheniya-v2',JSON.stringify(d)),d);
 page.once('dialog',x=>x.accept().catch(()=>{}));await page.reload();
 const menu=page.locator('#menuBtn'),nav=async name=>{if(await menu.isVisible())await menu.click();await page.locator('#nav button').filter({hasText:name}).click();};
 await nav('Расписание');await nav('Сегодня');
 await page.locator('#view button.lesson').filter({hasText:'09:00'}).first().click();
 const dlg=page.locator('#lessonDlg');await dlg.waitFor({state:'visible'});
 await dlg.getByLabel('1-й урок периода: TEST A',{exact:true}).check();
 await dlg.getByRole('button',{name:'Сохранить',exact:true}).click();await dlg.waitFor({state:'hidden'});
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('tochka-resheniya-v2')).lessons.find(l=>l.id==='pp2'));
 assert.deepEqual(saved.starts,['a']);assert.deepEqual(saved.marks.a,{s:'был',ch:true});assert.equal(saved.starts.includes('b'),false);
 page.once('dialog',x=>x.accept().catch(()=>{}));await page.reload();
 await nav('Отчёты родителям');
 await page.getByLabel('Ученик в отчётах',{exact:true}).selectOption('a');
 assert.equal(await page.getByLabel('Месяц отчёта',{exact:true}).inputValue(),'p:pp2','Latest period opens by default');
 await page.locator('#view').getByText(/Период с .* · уроков: 1 · репетитор/).first().waitFor();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 assert.ok(overflow<=1,'No horizontal page overflow: '+overflow);
 await page.screenshot({path:path.join(out,spec.name+'-lesson-period.png')});
 await page.getByLabel('Ученик в отчётах',{exact:true}).selectOption('b');
 assert.match(await page.getByLabel('Месяц отчёта',{exact:true}).inputValue(),/^\d{4}-\d{2}$/,'Pupil without periods keeps months');
 console.log('PASS lesson periods',spec.name);
};
