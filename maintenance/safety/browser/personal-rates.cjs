const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async function(page,fixture,out,spec){
 const d=JSON.parse(JSON.stringify(fixture()));d.payments=[{id:'test-payment',studentId:'a',amount:25,date:new Date().toISOString().slice(0,10)}];d.students.push({...d.students[0],id:'c',name:'TEST C'});d.groups[0].memberIds.push('c');
 await page.evaluate(d=>localStorage.setItem('tochka-resheniya-v2',JSON.stringify(d)),d);page.removeAllListeners('dialog');page.once('dialog',x=>x.accept());await page.reload();page.removeAllListeners('dialog');
 async function open(name){const menu=page.locator('#menuBtn');if(await menu.isVisible())await menu.click();await page.locator('#nav button').filter({hasText:'Ученики'}).click();await page.locator('#view .list-row').filter({has:page.locator('.name',{hasText:new RegExp('^'+name+'(?: |$)')})}).getByRole('button',{name:'Открыть',exact:true}).click();await page.getByRole('button',{name:'Редактировать',exact:true}).click();}
 await open('TEST GROUP');const dlg=page.locator('#formDlg');await dlg.locator('summary').filter({hasText:'Персональные цены участников'}).click();
 await dlg.getByLabel('Цена в группе: TEST A',{exact:true}).fill('7.5');await dlg.getByLabel('Цена в группе: TEST B',{exact:true}).fill('7.5');
 await dlg.getByRole('button',{name:'Сохранить',exact:true}).click();await dlg.waitFor({state:'hidden'});await page.reload();
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('tochka-resheniya-v2')));assert.equal(saved.students[0].groupRates.g,7.5);assert.equal(saved.students[1].groupRates.g,7.5);assert.equal(saved.students[2].groupRates.g,undefined);assert.equal(saved.groups[0].rate,10);
 await open('TEST A');await dlg.getByLabel('Цена индивидуального занятия',{exact:true}).fill('15');assert.equal(await dlg.getByLabel('Персональная цена в группе',{exact:true}).inputValue(),'7.5');
 const size=await dlg.evaluate(e=>({w:e.clientWidth,s:e.scrollWidth}));assert(size.s<=size.w+2,'Tariff form fits width');await page.screenshot({path:path.join(out,spec.name+'-personal-rates.png')});
 await dlg.getByRole('button',{name:'Сохранить',exact:true}).click();await dlg.waitFor({state:'hidden'});await page.reload();saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('tochka-resheniya-v2')));assert.equal(saved.students[0].individualRate,15);assert.equal(saved.students[0].groupRates.g,7.5);assert.deepEqual(saved.payments,d.payments);
 console.log('PASS personal rates',spec.name);
};
