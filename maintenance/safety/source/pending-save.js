// Failed writes are kept separately; never install them over a changed base.
let pendingSave = null, pendingRetrying = false, pendingDurable = false;
function pendingCapture(label) {
  if (pendingSave) { pendingShow(); return; }
  const record = {kind:'svetlana-pending-save',id:'svetlana-pending:'+crypto.randomUUID(),
    at:new Date().toISOString(),base:safeKnownRaw,data:snapshot(),label:label || 'Изменение'};
  pendingSave=record; pendingDurable=false;
  try { localStorage.setItem(record.id,JSON.stringify(record)); pendingDurable=true; } catch {}
  // IndexedDB is an independent fallback when localStorage is full.
  safeTx('readwrite',s=>s.put(record,record.id)).then(()=>{
    if(pendingSave===record){pendingDurable=true;pendingShow();}
  }).catch(()=>{if(pendingSave===record)pendingShow();});
  if(record.base) S=safePrepare(JSON.parse(record.base));
  queueMicrotask(pendingShow);
}
function pendingShow() {
  if(!pendingSave)return;
  let dlg=document.getElementById('pendingSaveDlg');
  if(!dlg){dlg=el('dialog',{id:'pendingSaveDlg'});document.body.append(dlg);
    dlg.addEventListener('cancel',e=>e.preventDefault());}
  dlg.textContent='';
  dlg.append(el('div',{class:'dlg-h'},el('h2',{},'Изменение не записано')),
    el('div',{class:'dlg-b'},
      el('p',{},pendingDurable ? 'Ввод сохранён отдельно для повторной попытки. Основные данные пока не изменены.' : 'Ввод пока удерживается только в этом окне. Не закрывайте страницу — сначала скачайте копию.'),
      el('p',{},'Изменение: '+pendingSave.label+' · '+helpDateTime(pendingSave.at)),
      el('p',{},'Если другое окно уже изменило данные, автоматическая замена будет запрещена.')),
    el('div',{class:'dlg-f'},
      el('button',{class:'btn',onclick:pendingExport},'Скачать ввод с вложениями'),
      el('button',{class:'btn',disabled:!pendingDurable,onclick:()=>{
        pendingSave=null;dlg.close();S=load();lastSnap=snapshot();render();refreshBar();
      }},'Вернуться к записанным данным'),
      el('button',{class:'btn btn-primary',onclick:pendingRetry},'Повторить запись')));
  if(!dlg.open)dlg.showModal();
  saveLamp('bad','НЕ СОХРАНЕНО');
}
async function pendingExport() {
  const rec=pendingSave;if(!rec)return;
  try{const blob=await safeBackupBlob(JSON.parse(rec.data));if(!nativeSave('Светлана — незаписанный ввод.json',blob))throw new Error('Браузер не начал скачивание');}
  catch(e){toast('Не удалось подготовить копию: '+e.message);}
}
async function pendingRetry() {
  const rec=pendingSave;if(!rec)return false;
  if(localStorage.getItem(KEY)!==rec.base || readOnlyTab || dataUnreadable){
    toast('Запись запрещена: основная база изменилась или рабочим стало другое окно. Ввод сохранён отдельно.');return false;
  }
  const previous=S;S=safePrepare(JSON.parse(rec.data));pendingRetrying=true;
  let ok;try{ok=persist(true);}finally{pendingRetrying=false;}
  if(!ok){S=previous;pendingShow();return false;}
  if(lastSnap){hist.push({label:rec.label,at:nowHM(),snap:lastSnap});if(hist.length>20)hist.shift();redo=[];}
  lastSnap=snapshot();bumpChanges();
  // Keep the recovery record as resolved, so an in-flight fallback cannot revive it.
  const done={...rec,resolved:true};
  try{localStorage.setItem(rec.id,JSON.stringify(done));}catch{}
  await safeTx('readwrite',s=>s.put(done,rec.id)).catch(()=>{});
  pendingSave=null;document.getElementById('pendingSaveDlg')?.close();render();refreshBar();
  toast('Изменение записано');return true;
}
async function pendingRecover() {
  const found=new Map();
  try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith('svetlana-pending:')){
    try{const r=JSON.parse(localStorage.getItem(k));found.set(k,r);}catch{}
  }}}catch{}
  try{for(const r of await safeTx('readonly',s=>s.getAll())||[]){
    if(r?.kind==='svetlana-pending-save' && (!found.get(r.id)?.resolved || r.resolved))found.set(r.id,r);
  }}catch{}
  const records=[...found.values()].filter(r=>r.kind==='svetlana-pending-save'&&!r.resolved);
  records.sort((a,b)=>a.at.localeCompare(b.at));
  if(!pendingSave&&records.length){pendingSave=records[0];pendingDurable=true;pendingShow();}
}
function save(label) {
  clearTimeout(saveTimer);
  if(pendingSave){if(safeKnownRaw)S=safePrepare(JSON.parse(safeKnownRaw));queueMicrotask(pendingShow);return false;}
  if(!persist(true)){pendingCapture(label);return false;}
  if(lastSnap){hist.push({label:label||'Изменение',at:nowHM(),snap:lastSnap});if(hist.length>20)hist.shift();redo=[];}
  lastSnap=snapshot();bumpChanges();autoSaveSoon();render();return true;
}
window.addEventListener('beforeunload',e=>{if(pendingSave){e.preventDefault();e.returnValue='';}});
