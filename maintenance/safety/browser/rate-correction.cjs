const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async function(page,fixture,out,spec){
 const d=JSON.parse(JSON.stringify(fixture()));d.students[0].individualRate=30;d.students[0].groupRates={g:7.5};
 const base={date:'2026-09-01',time:'10:00',duration:60,ownerType:'group',ownerId:'g',members:['a','b'],marks:{a:{s:'был',ch:true},b:{s:'был',ch:true}},rates:{a:10,b:10},per:{a:{result:'KEEP RESULT'}},homework:'KEEP HW',materialIds:['KEEP PDF']};
 d.lessons=[{...structuredClone(base),id:'past-g'},{...structuredClone(base),id:'past-i',date:'2026-09-02',ownerType:'student',ownerId:'a',rates:{a:40},marks:{a:{s:'был',ch:true}}},{...structuredClone(base),id:'untouched',date:'2026-09-03'}];d.payments=[{id:'pay',studentId:'a',amount:25,date:'2026-09-01'}];
 await page.evaluate(d=>localStorage.setItem('tochka-resheniya-v2',JSON.stringify(d)),d);page.removeAllListeners('dialog');page.once('dialog',x=>x.accept());await page.reload();page.removeAllListeners('dialog');
 async function open(){const menu=page.locator('#menuBtn');if(await menu.isVisible())await menu.click();await page.locator('#nav button').filter({hasText:'Ученики'}).click();await page.locator('#view .list-row').filter({has:page.locator('.name',{hasText:/^TEST A(?: |$)/})}).getByRole('button',{name:'Открыть',exact:true}).click();await page.getByRole('button',{name:'Исправить прошлые начисления',exact:true}).click();}
 const dlg=page.locator('#pickDlg');
 async function select(){await dlg.locator('#ratesFrom').fill('2026-09-01');await dlg.locator('#ratesTo').fill('2026-09-30');await dlg.getByRole('button',{name:'Показать занятия',exact:true}).click();await dlg.locator('[data-lesson-id="past-g"]').check();await dlg.locator('[data-lesson-id="past-i"]').check();await dlg.getByRole('button',{name:'Проверить изменения',exact:true}).click();}
 await open();await select();assert.match(await dlg.locator('#ratesPreview').innerText(),/50.*37,5/);
 await dlg.getByRole('button',{name:'Применить пересчёт',exact:true}).click();assert.match(await dlg.locator('#ratesPreview').innerText(),/Подтвердите/);
 await dlg.getByRole('button',{name:'Отмена',exact:true}).click();let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('tochka-resheniya-v2')));assert.deepEqual(saved.lessons,d.lessons);
 await open();await select();await dlg.locator('#ratesConfirm').check();const size=await dlg.evaluate(e=>({w:e.clientWidth,s:e.scrollWidth}));assert(size.s<=size.w+2,'Correction fits viewport');await page.screenshot({path:path.join(out,spec.name+'-rate-correction.png')});
 await dlg.getByRole('button',{name:'Применить пересчёт',exact:true}).click();await dlg.waitFor({state:'hidden'});await page.reload();
 saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('tochka-resheniya-v2')));const expected=structuredClone(d.lessons);expected[0].rates.a=7.5;expected[1].rates.a=30;assert.deepEqual(saved.lessons,expected);assert.deepEqual(saved.payments,d.payments);
 await open();await dlg.locator('#ratesFrom').fill('2026-09-01');await dlg.locator('#ratesTo').fill('2026-09-30');await dlg.getByRole('button',{name:'Показать занятия',exact:true}).click();assert(await dlg.locator('[data-lesson-id="past-g"]').isDisabled());await dlg.getByRole('button',{name:'Отмена',exact:true}).click();
 console.log('PASS selected historical correction',spec.name);
};
