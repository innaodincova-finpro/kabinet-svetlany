const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {boot}=require('./dom-harness.cjs');
const html=fs.readFileSync(path.join(__dirname,'../../../index.html'),'utf8');
function setup(empty=false){const b=boot(html),a=b.api,d=a.seed();b.win.showSaveFilePicker=async()=>{throw Error('Picker must not open in read-only tests')};if(!empty)d.students=[{id:'test',name:'TEST',rate:10,duration:60}];d.updatedAt='2026-09-08T08:00:00Z';a.setState(d);a.putRaw(JSON.stringify(d));a.load();return {b,a,d};}
function file(content,permission='granted'){let text=content;return {name:'TEST-copy.json',writes:0,queryPermission:async()=>permission,requestPermission:async()=>permission,getFile:async()=>new Blob([text]),createWritable:async function(){this.writes++;let next;return {write:async v=>{next=v instanceof Blob?await v.text():v},close:async()=>{text=next},abort:async()=>{}}},text:()=>text};}
function first(a){return a.viewHelp().querySelector('.help-section');}
(async()=>{
 for(const type of ['empty','newer','unreadable']){
  const {a,d,b}=setup(type==='empty'),old=JSON.stringify({...d,updatedAt:'2099-01-01T00:00:00Z'}),h=file(type==='unreadable'?'broken':old);a.setAuto(h);
  assert.equal(await a.autoSaveNow(false),false);assert.equal(h.writes,0);assert.equal(h.text(),type==='unreadable'?'broken':old);
  const n=first(a),buttons=n.querySelectorAll('button').map(x=>x.textContent);
  assert(buttons.includes('Посмотреть доступные копии'));assert(!buttons.includes('Повторить создание копии'));assert(!buttons.includes('Обновить резервную копию'));
  assert.match(n.textContent,/оставлен без изменений/);assert.doesNotMatch(b.doc.querySelector('#safeBar').textContent,/Записать сейчас/);
  console.log('PASS Protected '+type+' copy shows recovery actions without writing');
 }
 {const {a}=setup(),h=file('original','prompt');a.setAuto(h);await a.autoSaveNow(false);assert.equal(h.writes,0);assert.match(first(a).textContent,/Разрешить запись/);console.log('PASS Permission refusal offers explicit permission action');}
 {const {a,b}=setup();b.raw['tochka-backup']='2026-09-08';assert.match(first(a).textContent,/08\.09\.2026 · время не записано/);assert.match(first(a).textContent,/старая отметка/);assert.doesNotMatch(first(a).textContent,/Последняя проверенная копия/);console.log('PASS Legacy date retains year and does not claim verification');}
 {const {a,b}=setup(),h=file('');a.setAuto(h);assert.equal(await a.autoSaveNow(false),true);const text=first(a).textContent;assert.match(text,/Последняя автоматическая копия: \d{2}\.\d{2}\.\d{4}.*\d{2}:\d{2}/);assert.match(text,/TEST-copy.json/);assert.match(text,/повторно сейчас не проверялся/);assert.match(b.doc.querySelector('#saveState').textContent,/Записи сохранены в браузере/);console.log('PASS Successful copy has file identity and complete date receipt');}
})().catch(e=>{console.error(e);process.exitCode=1});
