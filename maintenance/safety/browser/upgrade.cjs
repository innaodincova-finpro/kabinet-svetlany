// Upgrade on one origin and one persistent browser profile, using synthetic data only.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {boot}=require('../tests/dom-harness.cjs'),{KEY,BASE,fixture,storageEqual,correctionEqual}=require('../tests/upgrade-fixture.cjs');
async function snapshot(page){return page.evaluate(async()=>{
 const storage=Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]));
 async function encode(v){
  if(v instanceof Blob)return {kind:'Blob',type:v.type,bytes:Array.from(new Uint8Array(await v.arrayBuffer()))};
  if(v instanceof ArrayBuffer)return {kind:'ArrayBuffer',bytes:Array.from(new Uint8Array(v))};
  if(ArrayBuffer.isView(v))return {kind:v.constructor.name,bytes:Array.from(new Uint8Array(v.buffer,v.byteOffset,v.byteLength))};
  if(v instanceof Date)return {kind:'Date',value:v.toISOString()};
  if(Array.isArray(v))return Promise.all(v.map(encode));
  if(v&&typeof v==='object')return Object.fromEntries(await Promise.all(Object.keys(v).sort().map(async k=>[k,await encode(v[k])])));
  return v;
 }
 const databases=[];
 for(const info of (await indexedDB.databases()).sort((a,b)=>a.name.localeCompare(b.name))){
  const db=await new Promise((resolve,reject)=>{const q=indexedDB.open(info.name);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
  const stores=[];
  for(const name of Array.from(db.objectStoreNames).sort()){
   const records=await new Promise((resolve,reject)=>{const tx=db.transaction(name,'readonly'),rows=[];const q=tx.objectStore(name).openCursor();q.onsuccess=()=>{const c=q.result;if(c){rows.push([c.key,c.value]);c.continue()}};tx.oncomplete=()=>resolve(rows);tx.onerror=()=>reject(tx.error)});
   stores.push({name,records:await encode(records)});
  }
  databases.push({name:info.name,version:db.version,stores});db.close();
 }
 return {storage,databases};
});}
async function visit(page){
 const labels=await page.locator('#nav button').allTextContents();
 for(const label of labels){
  const menu=page.locator('#menuBtn');if(await menu.isVisible())await menu.click();
  await page.locator('#nav button').filter({hasText:label}).click();
  if(label.includes('Расписание'))for(const mode of ['День','Неделя','Месяц'])await page.locator('#view .seg button').filter({hasText:mode}).click();
 }
}
module.exports=async function(origin,out,spec,pdf){
 const root=path.resolve(__dirname,'../../..');
 const oldHTML=execFileSync('git',['show',BASE+':index.html'],{cwd:root,maxBuffer:8*1024*1024}).toString();
 const newHTML=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const today=new Date().toISOString().slice(0,10),data=fixture(boot(oldHTML).api.seed,today);
 let upgrading=false;const errors=[],external=[],failures=[],stages=[];
 const context=await spec.engine.launchPersistentContext('',{headless:true,viewport:{width:spec.width,height:spec.height},timezoneId:'UTC',serviceWorkers:'block'});
 const page=await context.newPage();page.setDefaultTimeout(12000);
 page.on('pageerror',e=>{if(upgrading)errors.push(e.message)});
 await context.route('**/*',route=>{
  const u=new URL(route.request().url());if(u.origin!==origin){external.push(u.href);return route.abort()}
  if(u.pathname==='/upgrade-test')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Synthetic fixture setup</title>'});
  if(u.pathname==='/'||u.pathname==='/index.html')return route.fulfill({contentType:'text/html',body:upgrading?newHTML:oldHTML});
  return route.continue();
 });
 const check=(stage,fn)=>{try{fn();stages.push({stage,passed:true})}catch(e){stages.push({stage,passed:false,error:e.message});failures.push(stage+': '+e.message)}};
 try{
  await page.goto(origin+'/upgrade-test');
  await page.evaluate(async({data,key,bytes})=>{
   localStorage.setItem(key,JSON.stringify(data));localStorage.setItem('tochka-tour-v1','done');
   localStorage.setItem('svetlana-test-preserve','UNCHANGED SENTINEL');
   for(const item of [{name:'tochka-files',store:'files',key:'upgrade-pdf',value:new Blob([new Uint8Array(bytes)],{type:'application/pdf'})},{name:'svetlana-safety-v1',store:'records',key:'upgrade-sentinel',value:{note:'KEEP RECOVERY'}}]){
    const db=await new Promise((resolve,reject)=>{const q=indexedDB.open(item.name,1);q.onupgradeneeded=()=>q.result.createObjectStore(item.store);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
    await new Promise((resolve,reject)=>{const tx=db.transaction(item.store,'readwrite');tx.objectStore(item.store).put(item.value,item.key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();
   }
  },{data,key:KEY,bytes:Array.from(pdf())});
  await page.goto(origin);await visit(page);
  // Write through the old application's real save handler, not through the new version.
  const settings=page.locator('#view .help-section').nth(4);await settings.locator(':scope > summary').click();
  await page.getByLabel('Имя репетитора',{exact:true}).fill('TEST UPGRADE TUTOR');
  await page.getByLabel('Имя репетитора',{exact:true}).press('Tab');
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).tutor,KEY),'TEST UPGRADE TUTOR');
  await page.reload();await visit(page);
  const before=await snapshot(page);assert(before.databases.some(d=>d.name==='tochka-files'));
  upgrading=true;await page.reload();await visit(page);
  const opened=await snapshot(page);
  check('old-to-new all storage',()=>storageEqual(before.storage,opened.storage));
  check('old-to-new all IndexedDB',()=>assert.deepEqual(opened.databases,before.databases));
  await page.reload();await visit(page);
  const reloaded=await snapshot(page);
  check('new reload all storage',()=>storageEqual(before.storage,reloaded.storage));
  check('new reload all IndexedDB',()=>assert.deepEqual(reloaded.databases,before.databases));
  const menu=page.locator('#menuBtn');if(await menu.isVisible())await menu.click();
  await page.locator('#nav button').filter({hasText:'Расписание'}).click();
  await page.locator('#brokenLessons').getByRole('button',{name:'Исправить',exact:true}).click();
  const dlg=page.locator('#lessonDlg');await dlg.locator('input[type=time]').fill('15:15');await dlg.getByRole('button',{name:'Сохранить',exact:true}).click();await dlg.waitFor({state:'hidden'});
  const corrected=await snapshot(page);
  check('only selected lesson changes',()=>correctionEqual(JSON.parse(reloaded.storage[KEY]),JSON.parse(corrected.storage[KEY])));
  check('correction preserves IndexedDB and PDF',()=>assert.deepEqual(corrected.databases,before.databases));
  await page.reload();const final=await snapshot(page);
  check('correction survives reload',()=>correctionEqual(JSON.parse(reloaded.storage[KEY]),JSON.parse(final.storage[KEY])));
  check('final IndexedDB and PDF',()=>assert.deepEqual(final.databases,before.databases));
  check('runtime errors',()=>assert.deepEqual(errors,[]));check('no external requests',()=>assert.deepEqual(external,[]));
  fs.writeFileSync(path.join(out,spec.name+'-upgrade.json'),JSON.stringify({baseline:BASE,testedCommit:process.env.TESTED_COMMIT||'',stages},null,2));
  assert.deepEqual(failures,[],'Upgrade preservation failed');
  console.log('PASS upgrade preservation',spec.name);
 }finally{await context.close()}
};
