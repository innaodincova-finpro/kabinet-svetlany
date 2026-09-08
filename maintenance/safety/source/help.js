const HELP_RELEASE_AT = '2026-09-08T09:06:18.872107+00:00';
// Presentation only: preserve original controls and their event handlers.

function helpDateTime(value) {
  if (!value) return 'ещё не записано';
  if (/^\d{2}:\d{2}$/.test(value)) return value + ' · дата не записана';
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return 'дата неизвестна';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split('-').reverse().join('.') + ' · время не записано';
  return d.toLocaleString('ru-RU', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
}
function helpBackupTime() {
  try {
    const stamp = localStorage.getItem('svetlana-backup-verified-at');
    return stamp && iso(new Date(stamp)) === lastBackup() ? stamp : lastBackup();
  } catch { return lastBackup(); }
}
function helpSavedTime() {
  try { return JSON.parse(safeKnownRaw || '{}').updatedAt || ''; } catch { return ''; }
}
// Reuse existing controls: their storage and confirmation handlers stay intact.
function viewHelp() {
  const old = viewHelpContent(), cards = Array.from(old.querySelector('.grid').children);
  const settings = cards[2];
  const note = text => el('p',{class:'meta',style:'margin:8px 0;line-height:1.55'},text);
  const group = (...nodes) => el('div',{class:'row',style:'gap:8px;flex-wrap:wrap'},...nodes);
  const take = label => {
    const n = Array.from(settings.querySelectorAll('button')).find(n=>n.textContent===label);
    if(!n)throw new Error('Missing help control: '+label);
    return n;
  };
  const section = (title, hint, nodes, nested=false) => el('details',{
    class:nested?'help-topic':'card help-section',style:'padding:10px 14px;margin:0;min-width:0'},
    el('summary',{style:'cursor:pointer;min-height:32px;line-height:1.5;overflow-wrap:anywhere'},
      el('strong',{},title),el('span',{class:'meta',style:'display:block;margin-left:16px;font-size:12px'},hint)),
    el('div',{style:'padding-top:10px;min-width:0'},...nodes));
  const find = title => Array.from(settings.children).find(n=>n.querySelector('.lab')?.textContent===title);
  const safety=find('Сохранность данных'),video=find('Видео и доска');

  const fileInput=settings.querySelector('input[type="file"]');
  const settingsFields=Array.from(settings.children).filter(n=>n.classList.contains('two'));
  const boardField=Array.from(video.children).find(n=>n.tagName==='LABEL'&&n.querySelector('input:not([type="checkbox"])'));
  const boardButton=take('Завести доску');
  const motion=Array.from(video.children).find(n=>n.querySelector('input[type="checkbox"]'));
  const tour=take('Показать подсказки для новичка');
  const history=cards[1];
  history.querySelector('.lab').textContent='Изменения в текущем сеансе';
  const topics=[
    ['Занятия и домашние задания','Запись результата и решения',[
      note('Откройте занятие в расписании. Запишите результат и домашнее задание, затем нажмите «Сохранить». Если запись не удалась, форма останется открытой с пояснением.'),
      note('Решение можно ввести текстом или приложить PDF. Кнопка «Открыть PDF решения» позволяет проверить выбранный файл. Для группового занятия доступны отдельные записи и проверка по каждому ученику.')]],
    ['Голосовой ввод','Как надиктовать текст',[
      note('Поставьте курсор в поле. На Windows включите диктовку сочетанием Win+H, на телефоне — микрофоном клавиатуры. Доступность зависит от устройства.'),
      note('Если рядом с полем есть «Голос», нажмите её и разрешите микрофон. После диктовки проверьте текст. В карточке занятия «Разложить по полям» помогает распределить рассказ; результат также нужно проверить.')]],
    ['Календарь и отчёты родителям','Перенос расписания и подготовка отчёта',[
      note('Кнопка «В календарь» в расписании выгружает занятия на выбранный период. После изменений выгрузите расписание заново — ранее выгруженный файл сам не обновляется.'),
      note('В «Посещениях и оплате» кнопка «Счёт за месяц» готовит расчёт. В «Отчётах родителям» доступны результаты занятий. Готовый текст отправляете вы сами.')]]
  ];
  const page=el('div',{},head('Помощь','Выберите нужный раздел. Нажмите на название, чтобы открыть или закрыть его.'),
    el('div',{class:'grid',style:'grid-template-columns:minmax(0,1fr);gap:8px'},
      section('Сохранение и резервные копии','Проверить сохранение и создать копию',[
        savingPanel(note,group,section)]),
      section('Восстановление данных','Открыть прежнюю копию или загрузить файл',[
        note('Выберите копию в истории или загрузите файл. Перед заменой проверьте предложенные сведения о копии.'),
        group(take('История и восстановление'),take('Загрузить из файла')),fileInput,
        section('Восстановить тематическую программу','Вернуть исходные темы 5–8 классов',[
          note('Это действие может заменить ваши заметки к темам. Сначала сохраните полную копию.'),take('Восстановить программу 5–8')],true)]),
      section('Как работать с кабинетом','Занятия, домашние задания, диктовка и отчёты',[
        tour,...topics.map(([t,h,n])=>section(t,h,n,true))]),
      section('Видео и доска','Открыть видеозанятие и настроить доску',[
        note('Ссылки на видео находятся в карточках учеников и групп. Ссылку на свою доску можно указать ниже. Она будет общей для занятий.'),boardField,boardButton,
        section('Как пользоваться доской','Учебник, отдельное окно и сохранение рисунка',[
          note('В материалах откройте страницу учебника и нажмите «На доску». Вставьте изображение на доске сочетанием Ctrl+V. Если копирование недоступно, сохраните изображение и добавьте его на доску.'),
          note('«Видео в уголке» открывает отдельное окно. Возможность держать его поверх остальных зависит от браузера.'),
          note('Нужный рисунок сохраните средствами доски. Сохранение кабинета не является резервной копией внешней доски. Ссылками на комнаты делитесь только с участниками занятия.')],true)]),
      section('Настройки кабинета','Имя, валюта, рабочие часы и оформление',[
        ...settingsFields,note('Рабочие часы определяют видимую сетку расписания. Занятия за её пределами также отображаются.'),motion]),
      section('История действий','Посмотреть изменения и отменить последний шаг',Array.from(history.children)),
      section('Проверка и обновление кабинета','Версия программы и пункты, требующие внимания',[
        note('Версия: '+VERSION),note('Обновление программы подготовлено: '+helpDateTime(HELP_RELEASE_AT)),
        note('Время местное. Это дата подготовки установленной версии, а не время сохранения ваших записей.'),
        section('Проверить заполнение кабинета','Ученики, группы, занятия и методика',Array.from(cards[0].children),true)]),
      section('Очистка и демонстрационные данные','Редкие действия, которые заменяют или удаляют записи',[
        note('Перед этими действиями сохраните полную копию. Для обычной работы они не нужны.'),
        group(take('Загрузить пример'),take('Убрать учеников и занятия'),take('Очистить всё')),
        note('«Убрать учеников и занятия» удаляет также оплаты, сохраняя методику и материалы. «Очистить всё» очищает и темы с материалами.')])
    ));
  return page;
}
