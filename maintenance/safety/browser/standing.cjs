// Runs inside the existing synthetic CI browser suite, never against production.
const assert=require('node:assert/strict');
module.exports=async function(page,fixture,out,spec){
 const fs=require('node:fs'),path=require('node:path');
 const d=fixture();d.students=[{id:'schedule',name:'TEST SCHEDULE',type:'индивидуально',cls:'5',duration:60,rate:10,format:'офлайн',slots:[{dow:4,time:'11:00'},{dow:0,time:'12:00'}]}];d.groups=[];d.lessons=[];d.payments=[];d.dayEnd=13;
 await page.evaluate(d=>localStorage.setItem('tochka-resheniya-v2',JSON.stringify(d)),d);
 page.once('dialog',d=>d.accept());await page.reload();
 async function open(){const menu=page.locator('#menuBtn');if(await menu.isVisible())await menu.click();await page.locator('#nav button').filter({hasText:'Ученики'}).click();await page.locator('#view .list-row').filter({hasText:'TEST SCHEDULE'}).getByRole('button',{name:'Открыть',exact:true}).click();}
 await open();
 let card=page.locator('#view .card').filter({hasText:'Постоянное расписание'});
 await card.getByRole('button',{name:'Изменить',exact:true}).first().click();
 const dlg=page.locator('#pickDlg');assert.equal(await dlg.getByLabel('Время начала',{exact:true}).inputValue(),'12:00');
 await dlg.getByLabel('Время начала',{exact:true}).fill('15:37');await dlg.getByRole('button',{name:'Проверить изменения',exact:true}).click();
 await dlg.getByRole('button',{name:'Сохранить',exact:true}).click();await dlg.waitFor({state:'hidden'});
 await page.reload();await open();card=page.locator('#view .card').filter({hasText:'Постоянное расписание'});
 assert.match(await card.innerText(),/15:37/);assert.match(await card.innerText(),/11:00/);
 await card.getByRole('button',{name:'+ Добавить день',exact:true}).click();
 // A wrapping select label includes its option text in Playwright's label lookup.
 await dlg.getByLabel(/^День недели/).selectOption('2');await dlg.getByLabel('Время начала',{exact:true}).fill('18:45');
 await dlg.getByRole('button',{name:'Проверить изменения',exact:true}).click();
 const box=await dlg.boundingBox();assert(box && box.x>=0 && box.x+box.width<=spec.width+1,'Dialog fits viewport');
 await dlg.getByRole('button',{name:'Сохранить',exact:true}).scrollIntoViewIfNeeded();
 await page.screenshot({path:path.join(out,spec.name+'-standing.png')});
 await dlg.getByRole('button',{name:'Сохранить',exact:true}).click();await dlg.waitFor({state:'hidden'});
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('tochka-resheniya-v2')));
 assert.deepEqual(saved.students[0].slots,[{dow:4,time:'11:00'},{dow:0,time:'15:37'},{dow:2,time:'18:45'}]);
 console.log('PASS standing schedule',spec.name);
};
