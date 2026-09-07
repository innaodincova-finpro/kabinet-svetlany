const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {boot}=require('./dom-harness.cjs');
const html=fs.readFileSync(process.argv[2] || path.join(__dirname,'../site/index.html'),'utf8');
const pause=()=>new Promise(resolve=>setImmediate(resolve));
async function setup(){
 const b=boot(html),a=b.api,d=a.seed();
 d.materials=[{id:'m1',title:'Test PDF',fileId:'original',fileName:'test.pdf',size:8}];
 a.setState(d);a.persist(true);await a.putFile('original',new Blob(['%PDF-old']));
 return {...b,a,d};
}
function button(root,text){const found=root.querySelectorAll('button').find(x=>x.textContent===text);assert(found,'Button '+text);return found;}
(async()=>{
 {
  const {a,doc}=await setup();
  button(a.viewMaterials(),'Удалить').click();button(doc.querySelector('#askDlg'),'Удалить').click();
  await pause();assert.equal(a.getState().materials.length,0);
  a.undo();assert.equal(a.getState().materials[0].fileId,'original');assert.equal(await(await a.getFile('original')).text(),'%PDF-old');
  console.log('PASS Deleting a material and undoing restores its original binary');
 }
 {
  const {a,doc}=await setup();
  a.editMaterial('m1');const dlg=doc.querySelector('#formDlg');
  const file=dlg.querySelectorAll('input').find(x=>x.getAttribute('type')==='file');assert(file);
  const blob=new Blob(['%PDF-new']);blob.name='replacement.pdf';file.files=[blob];
  button(dlg,'Сохранить').click();for(let i=0;i<5;i++)await pause();
  const fresh=a.getState().materials[0].fileId;assert.notEqual(fresh,'original');
  assert.equal(await(await a.getFile(fresh)).text(),'%PDF-new');a.undo();
  assert.equal(a.getState().materials[0].fileId,'original');assert.equal(await(await a.getFile('original')).text(),'%PDF-old');
  console.log('PASS Replacing a material and undoing restores its original binary');
 }
 {
  const {a,doc}=await setup();
  button(a.viewHelp(),'Очистить всё').click();button(doc.querySelector('#askDlg'),'Очистить всё').click();await pause();
  assert.equal(a.getState().materials.length,0);a.undo();
  assert.equal(a.getState().materials[0].fileId,'original');assert.equal(await(await a.getFile('original')).text(),'%PDF-old');
  console.log('PASS Clearing the cabinet and undoing retains the PDF');
 }
})().catch(e=>{console.error(e);process.exitCode=1});
