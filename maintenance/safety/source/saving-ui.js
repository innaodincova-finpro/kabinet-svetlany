// Presentation state only; records, attachments and saved file handles keep their keys.
let savingIssue = '';
const SAVING_RECEIPT_KEY = 'svetlana-copy-receipt-v1';
function savingError(code,message){const e=new Error(message);e.copyCode=code;return e;}
function savingBlocked(){return ['empty','newer','unreadable'].includes(savingIssue);}
function savingLocalText(){
  if(dataUnreadable)return 'Не удалось открыть сохранённые записи в этом браузере. Восстановите их из копии.';
  if(pendingSave||storageBroken)return 'Последние изменения не записаны в браузере. Сохраните введённое из окна ошибки.';
  if(readOnlyTab)return 'Это окно открыто для просмотра. Для изменений используйте рабочее окно кабинета.';
  if(!S.students.length&&!S.lessons.length)return 'В этом браузере нет учеников и занятий. Методика и настройки могут быть сохранены.';
  return 'Ученики и занятия открыты в этом браузере. Записи на другом устройстве здесь не отображаются автоматически.';
}
function savingCopyText(){
  if(savingIssue==='empty')return 'Резервный файл не обновлён: в этом браузере нет учеников и занятий. Существующий файл оставлен без изменений.';
  if(savingIssue==='newer')return 'Резервный файл не обновлён: в нём более новые записи. Существующий файл оставлен без изменений.';
  if(savingIssue==='unreadable')return 'Резервный файл не обновлён: его содержимое не удалось проверить. Существующий файл оставлен без изменений.';
  if(safeBusy)return 'Создаётся резервная копия. Дождитесь завершения.';
  if(savingIssue==='permission')return 'Для обновления резервного файла нужно разрешить запись.';
  if(autoFailed)return 'Резервная копия не обновлена. Повторите попытку или сохраните отдельную копию.';
  if(!autoOn)return 'Автоматическое создание резервной копии не настроено.';
  if(safeLastSnapshot===snapshot())return 'Резервная копия текущих записей создана, содержимое файла проверено.';
  return 'Автоматическое создание копии включено. Последние изменения ещё не подтверждены в резервном файле.';
}
function savingReceiptText(){
  try{
    const r=JSON.parse(localStorage.getItem(SAVING_RECEIPT_KEY)||'null');
    if(r&&r.source===location.pathname&&r.at&&Number.isFinite(Date.parse(r.at)))
      return (r.kind==='auto'?'Последняя автоматическая копия':'Последняя отдельная копия')+': '+helpDateTime(r.at)+'. Файл: '+r.file+'. Проверен после записи; повторно сейчас не проверялся.';
  }catch{}
  const old=helpBackupTime();
  return old?'Ранее отмечалось создание копии: '+helpDateTime(old)+'. Это старая отметка; по ней нельзя подтвердить содержимое выбранного файла.':'Дата создания резервной копии пока не подтверждена.';
}
function savingActions(){
  if(savingBlocked())return [['Посмотреть доступные копии',safeRecoveryList],['Выбрать другой файл',autoSetup]];
  if(savingIssue==='permission')return [['Разрешить запись',()=>autoSaveNow(true)]];
  return [['Повторить создание копии',()=>autoSaveNow(true)]];
}
function savingPanel(note,group,section){
  const button=(label,fn)=>el('button',{class:'btn btn-sm',onclick:fn},label);
  const blocked=dataUnreadable||readOnlyTab||pendingSave||storageBroken;
  const actions=blocked?[]:autoOn?(autoFailed?savingActions():[['Обновить резервную копию',()=>autoSaveNow(true)]]):[];
  const canFile=canAuto();
  return el('div',{},
    el('b',{},'Записи на этом устройстве'),note(savingLocalText()),
    note('Последнее сохранение в браузере: '+helpDateTime(helpSavedTime())),
    el('b',{},'Резервная копия в файле'),note(savingCopyText()),
    autoHandle?note('Выбранный файл на этом устройстве: '+autoHandle.name):null,
    note(savingReceiptText()),
    group(...actions.filter(([label])=>canFile||label==='Посмотреть доступные копии').map(([label,fn])=>button(label,fn)),
      !blocked?button('Скачать отдельную копию',backupNow):null,
      !blocked&&!autoOn&&canFile?button('Настроить резервную копию',autoSetup):null),
    section('Как сохраняются записи','Пояснения и настройка автоматической копии',[
      note('Все даты и время относятся к этому браузеру и указаны по местному времени устройства. Название кабинета и имя файла не подтверждают, чьи записи в них находятся.'),
      note('Запись в браузере и резервный файл — два разных места хранения. Копия включает записи, методику и вложения. Скачивание файла само по себе не подтверждает, что он сохранился на диске.'),
      note(canFile?'После изменений кабинет пробует обновить выбранный файл через 20 секунд. Для записи браузер может запросить разрешение.':'В этом браузере автоматическая запись в выбранный файл недоступна. Используйте скачивание отдельной копии.'),
      note('Если файл находится в папке OneDrive, его отправкой в облако занимается OneDrive. Кабинет не подтверждает завершение этой отправки.'),
      autoOn&&!blocked?button('Выключить автоматическую копию',autoOff):null,
      autoOn&&!blocked&&canFile?button('Выбрать другой файл',autoSetup):null
    ],true));
}
