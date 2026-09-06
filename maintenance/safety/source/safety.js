/* Safety maintenance release. Storage names are deliberately unchanged. */
const SAFE_META = '__svetlanaBackup';
const SAFE_DB = 'svetlana-safety-v1';
let safeBusy = false, safeImporting = false, safePending = false;
let safeMaxTimer = null, safeBooting = true, safeKnownRaw = null;
let safeStatus = 'Проверяем настройку автосохранения…', safeLastSnapshot = null;
let safeLastAt = '', safeError = '', safeHistoryQueue = Promise.resolve();
const safeFilePartsCache=new Map();
async function safeEncodeBlob(blob){
  if(typeof FileReader==='function')return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(new Blob([String(r.result).split(',')[1]]));r.onerror=()=>reject(r.error);r.readAsDataURL(blob)});
  return new Blob([safe64(new Uint8Array(await blob.arrayBuffer()))]);
}

function safePrepare(input) {
  const d = JSON.parse(JSON.stringify(input));
  if (!d || ![2,3].includes(d.v)) throw new Error('Неизвестный формат кабинета');
  for (const key of ['students','groups','lessons','payments','materials','routes']) {
    if (!Array.isArray(d[key])) throw new Error('В копии нет раздела: ' + key);
    const ids = new Set();
    for (const x of d[key]) {
      if (!x || typeof x !== 'object' || typeof x.id !== 'string' || !x.id || ids.has(x.id) || ['__proto__','constructor','prototype'].includes(x.id)) throw new Error('Повреждены идентификаторы: ' + key);
      ids.add(x.id);
    }
  }
  if (!d.topicBank || typeof d.topicBank !== 'object' || Array.isArray(d.topicBank) || typeof d.tutor !== 'string') throw new Error('Нет методики или настроек');
  for (const topics of Object.values(d.topicBank)) if (!Array.isArray(topics) || topics.some(t=>!t || typeof t.title !== 'string')) throw new Error('Повреждён список тем');
  for (const g of d.groups) if (!Array.isArray(g.memberIds)) throw new Error('Повреждён состав группы');
  // Missing historical material references are retained, not treated as a fatal error.
  delete d[SAFE_META];
  return migrate(d);
}
function safeRefs(d) {
  const refs = [];
  const visit = x => { if (!x || typeof x !== 'object') return; if (typeof x.fileId === 'string' && x.fileId) refs.push(x); for (const [k,v] of Object.entries(x)) if (k !== SAFE_META && v && typeof v === 'object') visit(v); };
  visit(d); return refs;
}
async function safeDigest(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function safe64(bytes) { let s=''; for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768)); return btoa(s); }
function safeBytes(s) { const raw=atob(s); return Uint8Array.from(raw,c=>c.charCodeAt(0)); }
async function safeBundle(state, strict = true) {
  const d = safePrepare(state), files = [], missing = [];
  for (const id of new Set(safeRefs(d).map(x=>x.fileId))) {
    const blob = await getFile(id);
    if (!blob) { missing.push(id); continue; }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    files.push({id,type:blob.type,size:bytes.length,sha256:await safeDigest(bytes),base64:safe64(bytes)});
  }
  if (strict && missing.length) throw new Error('Не найдены вложения: ' + missing.length + '. Прежняя копия не перезаписана. Откройте «Материалы».');
  d[SAFE_META] = {format:'svetlana-full-v1',at:new Date().toISOString(),complete:!missing.length,missing,files,stateSha256:await safeDigest(new TextEncoder().encode(JSON.stringify(d)))};
  return d;
}
async function safeBackupBlob(state,strict=true) {
  const d=safePrepare(state),json=JSON.stringify(d);
  const meta={format:'svetlana-full-v1',at:new Date().toISOString(),complete:true,missing:[],stateSha256:await safeDigest(new TextEncoder().encode(json))};
  const parts=[];
  let first=true;const needed=new Set(safeRefs(d).map(x=>x.fileId));
  for(const id of safeFilePartsCache.keys())if(!needed.has(id))safeFilePartsCache.delete(id);
  for(const id of needed){
    const file=await getFile(id);
    if(!file){if(strict)throw new Error('Не найдено вложение. Прежняя копия не перезаписана. Откройте «Материалы».');meta.complete=false;meta.missing.push(id);continue;}
    let cached=safeFilePartsCache.get(id);
    if(!cached||cached.size!==file.size||cached.type!==file.type){
      cached={size:file.size,type:file.type,sha256:await safeDigest(await file.arrayBuffer()),parts:[]};
      for(let i=0;i<file.size;i+=3*1024*1024)cached.parts.push(await safeEncodeBlob(file.slice(i,i+3*1024*1024)));
      safeFilePartsCache.set(id,cached);
    }
    const info={id,type:file.type,size:file.size,sha256:cached.sha256};
    if(!first)parts.push(',');first=false;
    parts.push(JSON.stringify(info).slice(0,-1),',"base64":"');
    // Divisible by three: base64 chunks concatenate without intermediate padding.
    parts.push(...cached.parts);
    parts.push('"}');
  }
  return new Blob([json.slice(0,-1),',"'+SAFE_META+'":',JSON.stringify(meta).slice(0,-1),',"files":[',...parts,']}}'],{type:'application/json'});
}
async function safeSameFile(a,b){
  if(a.size!==b.size)return false;
  for(let i=0;i<a.size;i+=4*1024*1024){if(await safeDigest(await a.slice(i,i+4*1024*1024).arrayBuffer())!==await safeDigest(await b.slice(i,i+4*1024*1024).arrayBuffer()))return false;}
  return true;
}
async function safeDecode(text) {
  const original = JSON.parse(text), meta = original && original[SAFE_META];
  if (meta) {
    if (meta.format !== 'svetlana-full-v1' || !Array.isArray(meta.files)) throw new Error('Неизвестный формат полной копии');
    const raw = {...original}; delete raw[SAFE_META];
    if (await safeDigest(new TextEncoder().encode(JSON.stringify(raw))) !== meta.stateSha256) throw new Error('Контрольная сумма записей не совпадает');
  }
  const data = safePrepare(original), files = [], ids = new Set();
  for (const f of meta?.files || []) {
    if (!f || typeof f.id !== 'string' || ids.has(f.id) || typeof f.base64 !== 'string') throw new Error('Повреждён список вложений');
    const bytes = safeBytes(f.base64);
    if (bytes.length !== f.size || await safeDigest(bytes) !== f.sha256) throw new Error('Повреждено вложение');
    ids.add(f.id); files.push({id:f.id,blob:new Blob([bytes],{type:f.type||'application/octet-stream'})});
  }
  if (meta?.complete && safeRefs(data).some(x=>!ids.has(x.fileId))) throw new Error('Полная копия не содержит всех вложений');
  return {data,files,full:!!meta?.complete};
}
function safeTx(mode, fn) {
  return new Promise((resolve,reject)=>{
    const rq=indexedDB.open(SAFE_DB,1);
    rq.onupgradeneeded=()=>rq.result.createObjectStore('records');
    rq.onerror=()=>reject(rq.error);
    rq.onsuccess=()=>{const db=rq.result;try {const tx=db.transaction('records',mode);let result;const r=fn(tx.objectStore('records')); if(r)r.onsuccess=()=>{result=r.result};tx.oncomplete=()=>{db.close();resolve(result)};tx.onabort=tx.onerror=()=>{db.close();reject(tx.error||new Error('Не удалось сохранить защитную копию'))};}catch(e){db.close();reject(e)}};
  });
}
function safeHistory(text, reason) {
  const work=safeHistoryQueue.catch(()=>{}).then(async()=>{
    const list=await safeTx('readonly',s=>s.get('history'))||[];
    if(list[0]?.text===text)return;
    list.unshift({at:new Date().toISOString(),reason,...(text instanceof Blob?{file:text}:{text})});
    await safeTx('readwrite',s=>s.put(list.slice(0,3),'history'));
  }); safeHistoryQueue=work; return work;
}
async function safeWriteFiles(files) {
  if(!files.length)return;
  const db=await openFileDb();
  await new Promise((resolve,reject)=>{const tx=db.transaction(FILE_STORE,'readwrite');tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||new Error('Не записаны вложения'));const st=tx.objectStore(FILE_STORE);for(const f of files)st.put(f.blob,f.id)});
}
async function safeInstall(bundle) {
  if(readOnlyTab || safeImporting || safeBusy)throw new Error('Дождитесь сохранения и используйте рабочее окно кабинета');
  safeImporting=true;
  try {
    const before=JSON.stringify(S), beforeRaw=localStorage.getItem(KEY), data=safePrepare(bundle.data);
    const source = !dataUnreadable ? await safeBackupBlob(S,false) : beforeRaw;
    if(source)await safeHistory(source,'Перед восстановлением');
    const remap=new Map(), files=[];
    for(const f of bundle.files){const id='restore-'+crypto.randomUUID();remap.set(f.id,id);files.push({id,blob:f.blob});}
    for(const ref of safeRefs(data))if(remap.has(ref.fileId))ref.fileId=remap.get(ref.fileId);
    await safeWriteFiles(files);
    if(readOnlyTab || JSON.stringify(S)!==before || localStorage.getItem(KEY)!==beforeRaw)throw new Error('Кабинет изменился во время восстановления. Повторите загрузку.');
    if(beforeRaw)localStorage.setItem('svetlana-safety-before-import',beforeRaw);
    const text=JSON.stringify(data);localStorage.setItem(KEY,text);safeKnownRaw=text;
    const previous=S;S=data;dataUnreadable=false;storageBroken=false;lastSnap=snapshot();
    hist=[{label:'До восстановления',at:nowHM(),snap:JSON.stringify(previous)}];redo=[];
    shadowSave();bumpChanges();safeLastSnapshot=null;
    let missing=0;for(const id of new Set(safeRefs(S).map(x=>x.fileId)))if(!await getFile(id))missing++;
    safeStatus=missing?'Записи восстановлены; отсутствуют вложения: '+missing:'Копия восстановлена';
    toast(safeStatus);render();refreshBar();
  } finally {safeImporting=false;autoSaveSoon();}
}
async function safeImportFile(file) {
  try {
    const decoded=await safeDecode(await file.text());
    ask('Восстановить кабинет из копии?',
      'Ученики: '+decoded.data.students.length+'. Занятия: '+decoded.data.lessons.length+'. Оплаты: '+decoded.data.payments.length+'.\n'+(decoded.full?'Копия включает вложения.':'Это копия записей; наличие вложений проверим в браузере.')+'\nТекущее состояние будет сохранено отдельно перед заменой.',
      'Восстановить',()=>safeInstall(decoded).catch(e=>toast(e.message)),true);
  }catch(e){toast('Копия не загружена: '+e.message)}
}
async function safeRecoveryList() {
  const dlg=$('#pickDlg');dlg.textContent='';const body=el('div',{class:'dlg-b'});
  dlg.append(el('div',{class:'dlg-h'},el('h2',{},'Восстановление')),body,el('div',{class:'dlg-f'},el('button',{class:'btn',onclick:()=>dlg.close()},'Закрыть')));dlg.showModal();
  const input=el('input',{type:'file',accept:'.json',style:'display:none',onchange:e=>{const f=e.target.files[0];if(f){dlg.close();safeImportFile(f)}}});
  body.append(input,el('button',{class:'btn',onclick:()=>input.click()},'Загрузить копию из файла'));
  const candidates=[];
  for(const key of [KEY,KEY+'-shadow','svetlana-safety-before-save','svetlana-safety-before-import','svetlana-rollback-20260906:'+KEY,'svetlana-rollback-20260906:'+KEY+'-shadow']){
    try{const raw=localStorage.getItem(key);if(raw){const obj=JSON.parse(raw);candidates.push({reason:key.includes('shadow')?'Запасная запись браузера':'Сохранённая запись браузера',text:obj.d?JSON.stringify(obj.d):raw})}}catch{}
  }
  try{candidates.push(...await safeTx('readonly',s=>s.get('history'))||[])}catch(e){body.append(el('p',{},'Не удалось прочитать историю копий: '+e.message))}
  const seen=new Set();let shown=0;for(const item of candidates){
    if(item.file){body.append(el('div',{class:'card'},el('p',{},item.reason+' · '+item.at+' · '+fmtSize(item.file.size)),el('button',{class:'btn',onclick:()=>{dlg.close();safeImportFile(item.file)}},'Выбрать копию')));shown++;continue;}
    if(seen.has(item.text))continue;seen.add(item.text);try{const d=JSON.parse(item.text);safePrepare(d);body.append(el('div',{class:'card'},el('p',{},item.reason+' · '+(item.at||d.updatedAt||'без даты')+' · '+d.students.length+' учеников, '+d.lessons.length+' занятий'),el('button',{class:'btn',onclick:()=>{dlg.close();safeImportFile(new Blob([item.text]))}},'Выбрать копию')));shown++}catch{}
  }
  if(!shown)body.append(el('p',{},'В браузере не найдены копии. Можно загрузить файл из OneDrive.'));
}
function safeSummary() {
  return (autoHandle?'Файл: '+autoHandle.name+'. ':'')+safeStatus+(safeLastAt?' Последняя проверенная запись: '+new Date(safeLastAt).toLocaleString('ru-RU')+'.':'')+' Отправку в облако выполняет OneDrive; кабинет проверяет запись файла, но не доставку в облако.';
}
function safeNotice() { safeError='';if(typeof cur!=='undefined'&&cur==='help')render();refreshBar(); }
async function safeRestoreAuto() {
  if(!canAuto()){safeStatus='Автосохранение в файл недоступно в этом браузере';safeNotice();return;}
  try {
    const h=await autoTx('readonly',s=>s.get('file'));
    if(!h){safeStatus='Файл автосохранения не выбран';safeNotice();return;}
    autoHandle=h;autoOn=true;
    const p=await h.queryPermission({mode:'readwrite'});
    if(p!=='granted'){autoFailed=true;safeStatus='Нужно разрешить запись в ранее выбранный файл';safeNotice();return;}
    safeStatus='Доступ к прежнему файлу подтверждён; готовим полную копию';safeNotice();
    await autoSaveNow(false);
  }catch(e){autoFailed=true;safeStatus='Не удалось прочитать настройку автосохранения: '+e.message;safeNotice();}
}
