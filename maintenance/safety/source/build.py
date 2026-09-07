from pathlib import Path
root=Path(__file__).resolve().parents[1]
s=(root/'source/baseline.html').read_text()
def block(start,end,new):
 global s
 a=s.index(start);b=s.index(end,a);s=s[:a]+new+'\n'+s[b:]
block("  const fileIn = el('input', {type:'file', accept:'.json'",'  const curSel =',"""  const fileIn = el('input', {type:'file', accept:'.json', style:'display:none', onchange: e => {
    const f=e.target.files[0];if(f)safeImportFile(f);e.target.value='';
  }});
""")
block('async function backupNow() {','const lastBackup =',"""async function backupNow() {
  if(dataUnreadable || readOnlyTab || safeBusy || safeImporting){toast('Сначала завершите восстановление или текущее сохранение');return;}
  let handle=null;
  if(canAuto()) {
    try{handle=await window.showSaveFilePicker({suggestedName:'Кабинет Светлана — полная копия '+iso(new Date())+'.json',types:[{description:'Полная копия кабинета',accept:{'application/json':['.json']}}]});}
    catch(e){if(e.name!=='AbortError')toast('Не удалось выбрать файл: '+e.message);return;}
  }
  safeBusy=true;
  try{
    const before=snapshot(),changes=changesSince(),text=await safeBackupBlob(JSON.parse(before));
    if(handle){await safeWriteHandle(handle,text,before);safeComplete(before,changes);toast('Полная копия записана и проверена');}
    else if(nativeSave('Кабинет Светлана — полная копия '+iso(new Date())+'.json',text)){toast('Скачивание полной копии начато. Проверьте файл в «Загрузках».');}
    else throw new Error('Не удалось начать скачивание');
  }catch(e){toast(e.message)}finally{safeBusy=false;if(safePending){safePending=false;autoSaveSoon();}}
}
""")
block('function fileTx(mode, fn) {','const putFile =',"""function fileTx(mode, fn) {
  return openFileDb().then(db=>new Promise((resolve,reject)=>{
    const tx=db.transaction(FILE_STORE,mode);let result;const rq=fn(tx.objectStore(FILE_STORE));
    rq.onsuccess=()=>{result=rq.result};tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(tx.error||rq.error||new Error('Ошибка хранения файла'));
  }));
}
""")
block('function autoTx(mode, fn) {','const canAuto =',"""function autoTx(mode, fn) {
 return new Promise((resolve,reject)=>{
  const rq=indexedDB.open(AUTO_DB,1);
  rq.onupgradeneeded=()=>{if(!rq.result.objectStoreNames.contains(AUTO_STORE))rq.result.createObjectStore(AUTO_STORE)};
  rq.onerror=()=>reject(rq.error);rq.onsuccess=()=>{const db=rq.result;try{
    const tx=db.transaction(AUTO_STORE,mode);let result;const r=fn(tx.objectStore(AUTO_STORE));r.onsuccess=()=>{result=r.result};
    tx.oncomplete=()=>{db.close();resolve(result)};tx.onabort=tx.onerror=()=>{db.close();reject(tx.error||new Error('Не удалось сохранить настройку'))};
  }catch(e){db.close();reject(e)}};
 });
}
""")
block('async function autoSetup() {','/* --- Кабинет открыт в двух окнах',"""async function autoSetup() {
 if(!canAuto())return;
 let h;try{h=await window.showSaveFilePicker({suggestedName:'Кабинет Светлана — полная копия.json',types:[{description:'Копия кабинета',accept:{'application/json':['.json']}}]})}catch(e){return;}
 try{await autoTx('readwrite',s=>s.put(h,'file'));autoHandle=h;autoOn=true;autoFailed=false;safeLastSnapshot=null;await autoSaveNow(true);render();}
 catch(e){safeStatus='Настройка не сохранена: '+e.message;toast(safeStatus);refreshBar();}
}
async function autoOff() {
 if(safeBusy){toast('Дождитесь завершения записи');return;}
 try{await autoTx('readwrite',s=>s.delete('file'));autoHandle=null;autoOn=false;autoFailed=false;clearTimeout(autoTimer);clearTimeout(safeMaxTimer);safeMaxTimer=null;safeStatus='Автосохранение выключено';render();refreshBar();}
 catch(e){toast('Не удалось отключить: '+e.message);}
}
async function autoSaveNow(loud) {
 if(!autoOn||!autoHandle||readOnlyTab||dataUnreadable||safeImporting)return false;
 if(safeBusy){safePending=true;return false;}
 safeBusy=true;const handle=autoHandle;
 try {
  let p=await handle.queryPermission({mode:'readwrite'});
  if(p!=='granted'&&loud)p=await handle.requestPermission({mode:'readwrite'});
  if(p!=='granted')throw new Error('Разрешите запись в ранее выбранный файл кнопкой «Записать сейчас».');
  const before=snapshot(),changes=changesSince();
  if(before===safeLastSnapshot&&!autoFailed)return true;
  safeStatus='Записываем полную копию с вложениями…';refreshBar();
  const text=await safeBackupBlob(JSON.parse(before));
  if(readOnlyTab||dataUnreadable||handle!==autoHandle||!autoOn)throw new Error('Запись остановлена: изменилось рабочее окно');
  await safeWriteHandle(handle,text,before);
  safeComplete(before,changes,true);autoFailed=false;safeStatus='Полная копия записана и проверена';
  if(loud)toast(safeStatus);return true;
 }catch(e){autoFailed=true;safeStatus='Копия не обновлена: '+e.message;if(loud)toast(safeStatus);return false;}
 finally{safeBusy=false;refreshBar();if(typeof cur!=='undefined'&&cur==='help')render();if(safePending){safePending=false;autoSaveSoon();}}
}
function autoSaveSoon() {
 if(!autoOn)return;
 clearTimeout(autoTimer);
 const fire=()=>{clearTimeout(autoTimer);clearTimeout(safeMaxTimer);safeMaxTimer=null;autoSaveNow(false)};
 autoTimer=setTimeout(fire,20000);
 if(!safeMaxTimer)safeMaxTimer=setTimeout(fire,60000);
}

""")
# Bootstrap is deferred until every state variable is initialised.
s=s.replace('dropOldDrafts();\nstartTick();', (root/'source/safety.js').read_text()+'\n'+(root/'source/overrides.js').read_text()+'\ndropOldDrafts();\nstartTick();')
s=s.replace('persist(true);\nshadowSave();\nrefreshBar();\nsetTimeout(offerRecovery, 60);','safeBooting=false;\nrefreshBar();\nsetTimeout(offerRecovery, 60);\nsafeRestoreAuto();')
s=s.replace("const VERSION = '31 августа 2026';", "const VERSION = '6 сентября 2026 · домашние задания 1.2';")
s=s.replace("const putFile = (id, blob) => fileTx('readwrite', st => st.put(blob, id));", "const putFile = (id, blob) => { safeFilePartsCache.delete(id); return fileTx('readwrite', st => st.put(blob, id)); };")
s=s.replace("toast('Файл сохранён');\n    return true;","toast('Скачивание начато');\n    return true;")
s=s.replace("text: autoOn ? 'Автосохранение включено' : 'Автосохранение выключено'", "text: autoFailed ? 'Автосохранение требует внимания' : autoOn ? 'Автосохранение настроено' : 'Автосохранение не настроено'")
s=s.replace("'Кабинет сам обновляет выбранный файл: после отметки занятия и при закрытии окна. Напоминания при этом не показываются.'",'safeSummary()')
s=s.replace("'Один раз выберите файл в облачной папке (Google Диск, Яндекс Диск, OneDrive) — дальше кабинет будет обновлять его сам, без вопросов и окон.'","'Выберите файл в папке OneDrive один раз. Кабинет запоминает выбор. Для записи браузер может потребовать разрешение.'")
s=s.replace("'защищено — браузер не сотрёт данные сам'","'запрошена защита от автоматической очистки; резервная копия всё равно нужна'")
s=s.replace("'Копия — обычный файл. Сохраняйте его в папку, которая синхронизируется с облаком, — тогда данные переживут и поломку компьютера.'","'Полная копия включает записи, методику и вложения. Файл обновляется через 20 секунд после изменений; при непрерывной работе — не реже попытки в минуту. OneDrive отдельно отправляет файл в облако.'")
s=s.replace("el('button', {class:'btn btn-sm', onclick: backupNow}, 'Выгрузить всё в файл'),","el('button', {class:'btn btn-sm', onclick: backupNow}, 'Выгрузить всё в файл'),\n          el('button',{class:'btn btn-sm',onclick:safeRecoveryList},'История и восстановление'),\n          el('button',{class:'btn btn-sm',onclick:()=>autoSaveNow(true)},'Записать сейчас'),")
s=s.replace("put('warn', 'Копия в файл не записалась — браузер не дал доступ.'", "put('warn', safeStatus")
s=s.replace("put('stop', 'Данные не читаются — кабинет пока ничего не записывает.'", "put('stop', 'Данные не читаются — кабинет пока ничего не записывает.'")
s=s.replace("if (!node || !ev) return;", "if (!node || !ev) return;")
s=s.replace("if (readOnlyTab && document.visibilityState !== 'hidden') takeOver(true);", "if (readOnlyTab && document.visibilityState !== 'hidden' && !document.querySelector('dialog[open]')) takeOver(true);")
# Material operations are reversible: retain original blobs for undo/history.
for old,new in [
 ("if (m.fileId) dropFile(m.fileId).catch(() => {});", "/* Keep the original blob for undo and recovery. */"),
 ("if (m && m.fileId) dropFile(m.fileId).catch(() => {});", "/* Keep the previous blob for undo and recovery. */"),
 ("if (m && dropCurrent) { dropFile(m.fileId).catch(() => {});", "if (m && dropCurrent) {"),
 ("try { fileTx('readwrite', st => st.clear()); } catch (e) {}", "/* Keep blobs: clearing the cabinet can be undone. */"),
 (", сам файл тоже будет стёрт из браузера", ", файл останется для отмены и восстановления"),
 ("загруженные файлы удалены из браузера", "загруженные файлы останутся для отмены и восстановления"),
]:
 if old not in s: raise ValueError('Missing material retention patch: '+old)
 s=s.replace(old,new)
exec((root/'source/homework.py').read_text())
(root/'site/index.html').write_text(s)
sw=(root/'site/sw.js').read_text().replace('svetlana-rollback-20260906-1','svetlana-homework-20260906-1').replace('svetlana-safety-20260906-1','svetlana-homework-20260906-1').replace('svetlana-homework-20260906-1','svetlana-homework-20260907-3')
(root/'site/sw.js').write_text(sw)
