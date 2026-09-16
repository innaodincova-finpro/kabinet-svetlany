// Synthetic fixture only: route topics appear without future lessons.
const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async function(page,fixture,out,spec){
 const d=fixture();d.lessons=[];d.payments=[];
 d.topicBank={'5':['t1','t2','t3','t4'].map(id=>({id,title:'ROUTE '+id}))};
 d.routes=[{id:'r',ownerType:'group',ownerId:'g',topicIds:['t2','t1','t3','t4']}];
 await page.evaluate(d=>localStorage.setItem('tochka-resheniya-v2',JSON.stringify(d)),d);
 page.once('dialog',x=>x.accept());await page.reload();
 const before=await page.evaluate(()=>localStorage.getItem('tochka-resheniya-v2'));
 const menu=page.locator('#menuBtn');if(await menu.isVisible())await menu.click();
 await page.locator('#nav button').filter({hasText:'Ученики'}).click();
 await page.locator('#view .list-row').filter({has:page.locator('.name',{hasText:'TEST GROUP'})}).getByRole('button',{name:'Открыть',exact:true}).click();
 await page.getByText('Впереди: ROUTE t2 · ROUTE t1 · ROUTE t3',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>localStorage.getItem('tochka-resheniya-v2')),before,'Opening route card does not write records');
 await page.screenshot({path:path.join(out,spec.name+'-upcoming-route.png')});
 console.log('PASS upcoming route',spec.name);
};
