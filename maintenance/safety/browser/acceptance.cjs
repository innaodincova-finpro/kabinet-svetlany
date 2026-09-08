// Real browser acceptance on synthetic records only. No production URLs or credentials.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const {boot}=require('../tests/dom-harness.cjs');
const root=path.resolve(__dirname,'../../..'),out=path.join(__dirname,'results');fs.mkdirSync(out,{recursive:true});
function fixture(){
 const d=boot(fs.readFileSync(path.join(root,'index.html'),'utf8')).api.seed();
 const today=new Date().toISOString().slice(0,10);
 d.students=['a','b'].map(id=>({id,name:'TEST '+id.toUpperCase(),type:'группа',groupId:'g',cls:'5',rate:10,duration:60,format:'офлайн',payMode:'за занятие'}));
 d.groups=[{id:'g',name:'TEST GROUP',memberIds:['a','b'],cls:'5',rate:10,duration:60,format:'офлайн',slots:[]}];
 const marks={a:{s:'был',ch:true},b:{s:'был',ch:true}};
 d.lessons=['09:00','11:00'].map((time,i)=>({id:i?'next':'old',ownerType:'group',ownerId:'g',date:today,time,duration:60,topicId:null,marks:structuredClone(marks),materialIds:[],homework:i?'':'COMMON_TASK',per:i?{}:{a:{homework:'TASK_A'},b:{homework:'TASK_B'}},result:'',note:'',plan:''}));
 return d;
}
function pdf(){
 const stream='BT /F1 20 Tf 30 120 Td (TEST SOLUTION 42) Tj ET';
 const objs=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
 let s='%PDF-1.4\n',offsets=[0];objs.forEach((o,i)=>{offsets.push(Buffer.byteLength(s));s+=`${i+1} 0 obj\n${o}\nendobj\n`;});const xref=Buffer.byteLength(s);s+=`xref\n0 6\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;return Buffer.from(s);
}
const server=http.createServer((req,res)=>{
 const name=new URL(req.url,'http://localhost').pathname;
 const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'html':'text/html','js':'text/javascript','png':'image/png','webmanifest':'application/manifest+json'})[path.extname(file).slice(1)]||'application/octet-stream');res.end(b);});
});
const results=[];
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 for(const spec of [{name:'chromium-desktop',engine:chromium,width:1366,height:900},{name:'chromium-mobile-390',engine:chromium,width:390,height:844},{name:'chromium-mobile-320',engine:chromium,width:320,height:740},{name:'webkit-mobile-390',engine:webkit,width:390,height:844}]){
  let context,page;const errors=[],requests=[];
  try{
   // Use a fresh disk-backed profile: non-persistent contexts are private mode.
   context=await spec.engine.launchPersistentContext('',{headless:true,viewport:{width:spec.width,height:spec.height},timezoneId:'UTC'});
   await context.route('**/*',route=>{if(new URL(route.request().url()).origin===origin)return route.continue();requests.push(route.request().url());return route.abort();});
   await context.addInitScript(({state,origin})=>{if(location.origin===origin&&!localStorage.getItem('tochka-resheniya-v2')){localStorage.setItem('tochka-resheniya-v2',JSON.stringify(state));localStorage.setItem('tochka-tour-v1','done');}}, {state:fixture(),origin});
   page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
   await page.clock.setFixedTime(new Date(new Date().toISOString().slice(0,10)+'T15:00:00Z'));
   await page.goto(origin);await page.locator('#view button.lesson').filter({hasText:'09:00'}).click();
   const dlg=page.locator('#lessonDlg');await dlg.waitFor({state:'visible'});
   const editors=dlg.locator('details').filter({has:page.locator('summary', {hasText:'Подготовить решение этого ДЗ'})});
   assert.equal(await editors.count(),3,'Shared and two personal editors');
   const personal=editors.nth(1);await personal.locator('summary').click();
   await personal.locator('textarea').fill('PERSONAL_A_ANSWER_42');
   await personal.locator('input[type=file]').setInputFiles({name:'test-solution.pdf',mimeType:'application/pdf',buffer:pdf()});
   await personal.getByText('Прикреплён: test-solution.pdf',{exact:true}).waitFor();
   await personal.getByRole('button',{name:'Открыть PDF решения',exact:true}).click();
   const immediateViewer=page.locator('#pickDlg');await immediateViewer.getByText('1 из 1',{exact:true}).waitFor();
   await immediateViewer.getByRole('button',{name:'✕',exact:true}).click();
   // A second tab revokes writing while the original form stays open.
   const rawBefore=await page.evaluate(()=>localStorage.getItem('tochka-resheniya-v2'));
   const other=await context.newPage();await other.goto(origin);
   await page.getByRole('button',{name:'Продолжить здесь',exact:true}).waitFor();
   await dlg.getByRole('button',{name:'Сохранить',exact:true}).click();
   assert(await dlg.isVisible(),'Rejected save keeps form open');
   assert.equal(await page.evaluate(()=>localStorage.getItem('tochka-resheniya-v2')),rawBefore,'Rejected save preserves primary');
   await page.getByText('Занятие не сохранено',{exact:true}).waitFor();
   await other.close();
   await page.reload();await page.locator('#view button.lesson').filter({hasText:'09:00'}).click();
   const recovered=dlg.locator('details').filter({has:page.locator('summary',{hasText:'Подготовить решение этого ДЗ'})}).nth(1);
   await recovered.locator('summary').click();
   assert.equal(await recovered.locator('textarea').inputValue(),'PERSONAL_A_ANSWER_42','Uncommitted solution restored from draft');
   await recovered.getByText('Прикреплён: test-solution.pdf',{exact:true}).waitFor();
   await dlg.getByRole('button',{name:'Сохранить',exact:true}).click();await dlg.waitFor({state:'hidden'});
   await page.reload();await page.locator('#view button.lesson').filter({hasText:'09:00'}).click();
   const again=dlg.locator('details').filter({has:page.locator('summary',{hasText:'Подготовить решение этого ДЗ'})}).nth(1);await again.locator('summary').click();
   assert.equal(await again.locator('textarea').inputValue(),'PERSONAL_A_ANSWER_42');await again.getByText('Прикреплён: test-solution.pdf',{exact:true}).waitFor();
   await dlg.getByRole('button',{name:'Отмена',exact:true}).click();await dlg.waitFor({state:'hidden'});
   await page.locator('#view button.lesson').filter({hasText:'11:00'}).click();
   await dlg.getByText('Проверяем: TASK_A',{exact:true}).waitFor();await dlg.getByText('Проверяем: TASK_B',{exact:true}).waitFor();
   const answers=dlg.locator('details').filter({has:page.locator('summary',{hasText:'Решение ДЗ',exact:true})});
   assert.equal(await answers.count(),1,'Personal answer is not assigned to other pupil');await answers.locator('summary').click();
   await answers.getByText('PERSONAL_A_ANSWER_42',{exact:true}).waitFor();
   await answers.getByRole('button',{name:'Открыть PDF решения',exact:true}).click();
   const viewer=page.locator('#pickDlg');await viewer.waitFor({state:'visible'});await viewer.locator('.pdf-wrap').waitFor({state:'visible'});
   await page.waitForFunction(()=>{const c=document.querySelector('#pickDlg canvas');return c&&c.width>0&&c.height>0&&document.querySelector('#pickDlg .pdf-wrap').style.display!=='none';});
   await viewer.getByText('1 из 1',{exact:true}).waitFor();
   assert(await viewer.locator('canvas').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let ink=0;for(let i=0;i<d.length;i+=4)if(d[i+3]&&d[i]<100&&d[i+1]<100&&d[i+2]<100)ink++;return ink>20;}),'PDF must contain rendered ink');
   // Wait for the opening animation, then verify the canvas receives pointer hits.
   await viewer.evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));
   await viewer.locator('canvas').click({trial:true});
   assert(await viewer.locator('canvas').evaluate(c=>{const r=c.getBoundingClientRect();return document.elementFromPoint((Math.max(0,r.left)+Math.min(innerWidth,r.right))/2,(Math.max(0,r.top)+Math.min(innerHeight,r.bottom))/2)===c;}),'PDF canvas is actually on top and inside the viewport');
   await page.screenshot({path:path.join(out,spec.name+'-pdf.png')});await viewer.getByRole('button',{name:'✕',exact:true}).click();
   const checkFields=dlg.locator('select').filter({has:page.locator('option',{hasText:'Не проверено',exact:true})});
   await checkFields.nth(0).selectOption('ошибки');await checkFields.nth(1).selectOption('частично');
   const notes=dlg.getByPlaceholder('Номер задания, ошибка ученика, что нужно повторить');await notes.nth(0).fill('ONLY_A_ERROR');await notes.nth(1).fill('ONLY_B_ERROR');
   const save=dlg.getByRole('button',{name:'Сохранить',exact:true});await save.scrollIntoViewIfNeeded();
   assert(await save.isVisible()&&await save.isEnabled(),'Save accessible');
   const bounds=await save.boundingBox();assert(bounds&&bounds.x>=0&&bounds.x+bounds.width<=spec.width+1,'Save fits screen');
   const overflow=await dlg.evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth}));assert(overflow.scroll<=overflow.width+2,'Lesson dialog horizontal overflow '+JSON.stringify(overflow));
   await page.screenshot({path:path.join(out,spec.name+'-form.png')});await save.click();await dlg.waitFor({state:'hidden'});
   await page.reload();
   const menu=page.locator('#menuBtn');if(await menu.isVisible())await menu.click();
   await page.locator('#nav button').filter({hasText:'Отчёты'}).click();
   const pupil=page.locator('#view select').filter({has:page.locator('option',{hasText:'TEST A'})});
   await pupil.selectOption('a');let text=await page.locator('#view').innerText();assert(text.includes('ONLY_A_ERROR')&&!text.includes('ONLY_B_ERROR'),'A report isolation');
   await pupil.selectOption('b');text=await page.locator('#view').innerText();assert(text.includes('ONLY_B_ERROR')&&!text.includes('ONLY_A_ERROR'),'B report isolation');
   if(await menu.isVisible())await menu.click();
   await page.locator('#nav button').filter({hasText:'Помощь'}).click();
   const help=page.locator('#view .help-section');
   await help.first().waitFor({state:'visible'});
   assert.equal(await help.count(),7,'Help has seven collapsible sections');
   assert.equal(await page.locator('#view .help-section[open]').count(),0,'Help initially collapsed');
   const beforeHelp=await page.evaluate(()=>localStorage.getItem('tochka-resheniya-v2'));
   await page.screenshot({path:path.join(out,spec.name+'-help.png')});
   for(let i=0;i<7;i++){
    const block=help.nth(i);await block.locator('summary').click();
    assert(await block.evaluate(n=>n.open),'Section expands');
    assert(await page.locator('#view').evaluate(n=>n.scrollWidth<=n.clientWidth+2),'Help fits viewport');
    if(i===3){const t=await block.innerText();assert(/сборка .*\d{2}:\d{2}/.test(t),'Build has hours and minutes');assert(/Последнее сохранение в браузере: .*\d{2}:\d{2}/.test(t),'Saved record has hours and minutes');}
    await block.locator('summary').click();assert(await block.evaluate(n=>!n.open),'Section collapses');
   }
   assert.equal(await page.evaluate(()=>localStorage.getItem('tochka-resheniya-v2')),beforeHelp,'Help interaction does not mutate records');
   assert.deepEqual(errors,[],'No browser runtime errors');assert.deepEqual(requests,[],'No external requests');
   results.push({name:spec.name,passed:true,scenarios:['save-reload-personal-text-and-PDF','next-lesson-personal-answer','PDF-canvas-render','separate-checks-and-reports','narrow-form-controls']});console.log('PASS',spec.name);
  }catch(e){results.push({name:spec.name,passed:false,error:e.stack,errors,requests});console.error('FAIL',spec.name,e.message);if(page){await page.screenshot({path:path.join(out,spec.name+'-failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,spec.name+'-failure.html'),await page.content().catch(()=>''));}}
  finally{if(context)await context.close();}
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({testedCommit:process.env.TESTED_COMMIT||'',results},null,2));
 if(results.some(r=>!r.passed))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
