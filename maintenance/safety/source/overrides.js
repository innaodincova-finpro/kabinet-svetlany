async function safeWriteHandle(handle,text,before) {
  // Keep the last on-disk version before touching the OneDrive file.
  const existing=await handle.getFile();
  if(existing.size) {
    await safeHistory(existing,'Предыдущая копия файла');
    const now=JSON.parse(before);
    if(!now.students.length&&!now.lessons.length)throw savingError('empty','Пустой кабинет не заменит существующий файл');
    const prefix=await existing.slice(0,4*1024*1024).text(),at=prefix.indexOf(',"'+SAFE_META+'":');
    let old;
    try{old=JSON.parse(at>=0?prefix.slice(0,at)+'}':prefix);safePrepare(old)}
    catch(e){throw savingError('unreadable','Существующий файл не удалось проверить. Он не перезаписан; выберите отдельный файл копии.');}
    if(Date.parse(old.updatedAt)>Date.parse(now.updatedAt))throw savingError('newer','В файле есть более новая копия. Откройте «История и восстановление», чтобы выбрать её.');
  }
  if(readOnlyTab||dataUnreadable)throw new Error('Окно больше не имеет права записи');
  const stream=await handle.createWritable();
  try{await stream.write(text);if(readOnlyTab||dataUnreadable)throw new Error('Рабочее окно изменилось');await stream.close();}
  catch(e){try{await stream.abort()}catch{}throw e;}
  const saved=await handle.getFile();
  if(!await safeSameFile(saved,text instanceof Blob?text:new Blob([text])))throw new Error('Проверка записанного файла не пройдена. Предыдущая копия сохранена в истории.');
}
function safeComplete(before,changes,isAuto=false,fileName='') {
  safeLastAt=new Date().toISOString();
  if(snapshot()===before){if(isAuto)safeLastSnapshot=before;if(changesSince()===changes)resetChanges();}
  else safePending=true;
  try{localStorage.setItem('tochka-backup',iso(new Date()));localStorage.setItem('svetlana-backup-verified-at',safeLastAt)}catch{}
  try{localStorage.setItem(SAVING_RECEIPT_KEY,JSON.stringify({at:safeLastAt,kind:isAuto?'auto':'manual',file:fileName,source:location.pathname}));}catch{}
  saveLamp('ok','Записи сохранены в браузере');
}
function persist(quiet) {
  if(typeof pendingSave!=='undefined' && pendingSave && !pendingRetrying)return false;
  if(safeBooting||readOnlyTab||dataUnreadable||safeImporting){if(!quiet)render();return false;}
  try{
    const current=localStorage.getItem(KEY);
    if(current!==safeKnownRaw){readOnlyTab=true;safeStatus='Данные изменены в другом окне. Откройте рабочее окно.';refreshBar();return false;}
    safePrepare(S);
    S.updatedAt=new Date().toISOString();const next=JSON.stringify(S);
    if(current&&current!==next)localStorage.setItem('svetlana-safety-before-save',current);
    localStorage.setItem(KEY,next);safeKnownRaw=next;storageBroken=false;shadowSave();saveLamp('ok','в браузере '+nowHM());
    if(current!==next)autoSaveSoon();
  }catch(e){storageBroken=true;safeStatus='Не удалось сохранить в браузере: '+e.message;saveLamp('bad','НЕ СОХРАНЕНО');refreshBar();return false;}
  if(!quiet)render();
  return true;
}
function load() {
  dataUnreadable=false;
  try {
    const raw=localStorage.getItem(KEY),shadow=localStorage.getItem(KEY+'-shadow');safeKnownRaw=raw;
    for(const [k,v]of [[KEY,raw],[KEY+'-shadow',shadow]])if(v!==null&&!localStorage.getItem('svetlana-rollback-20260906:'+k))localStorage.setItem('svetlana-rollback-20260906:'+k,v);
    if(raw)return safePrepare(JSON.parse(raw));
    if(shadow)return safePrepare(JSON.parse(shadow).d);
  }catch(e){safeStatus='Запись не прочитана: '+e.message;}
  dataUnreadable=true;return seed();
}
function offerRecovery(){if(dataUnreadable)safeRecoveryList();}
function shadowSave(){
  if(dataUnreadable||readOnlyTab||storageBroken||safeImporting)return;
  try{const raw=localStorage.getItem(KEY);if(raw!==JSON.stringify(S))return;localStorage.setItem(KEY+'-shadow',JSON.stringify({at:new Date().toISOString(),d:S}));}catch{}
}
// An unrelated tab changing the shared legacy record must never be overwritten.
window.addEventListener('storage',e=>{if(e.key===KEY && e.newValue!==safeKnownRaw){readOnlyTab=true;refreshBar();}});
window.addEventListener('beforeunload',e=>{
  if(safeBusy||safeImporting||(autoOn&&(autoFailed||safeLastSnapshot!==snapshot()))){e.preventDefault();e.returnValue='';}
});
