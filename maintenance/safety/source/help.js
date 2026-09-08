// Presentation only: preserve original controls and their event handlers.
const helpExpanded = new Set();
function helpDateTime(value) {
  if (!value) return 'ещё не записано';
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return 'дата неизвестна';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return fmtDate(value) + ' · время не записано';
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
function viewHelp() {
  const page = viewHelpContent(), grid = page.querySelector('.grid');
  const cards = Array.from(grid.children), settings = cards[2];
  const section = (title, nodes) => {
    const summary = el('summary', {style:'cursor:pointer;font-weight:600;padding:4px 0;min-height:36px;overflow-wrap:anywhere'}, title);
    const details = el('details', {class:'card help-section'}, summary,
      el('div', {style:'padding-top:12px;min-width:0'}, ...nodes));
    details.open = helpExpanded.has(title);
    details.addEventListener('toggle', () => {
      if (details.open) helpExpanded.add(title); else helpExpanded.delete(title);
    });
    return details;
  };
  const findBlock = title => Array.from(settings.children).find(n => n.querySelector('.lab')?.textContent === title);
  const safety = findBlock('Сохранность данных'), video = findBlock('Видео и доска');
  safety.remove(); video.remove();
  const videoNodes = Array.from(video.children); videoNodes.shift();
  const usageStart = videoNodes.findIndex(n => n.querySelector('input[type="checkbox"]'));
  const usage = usageStart >= 0 ? videoNodes.splice(usageStart) : [];
  const voiceStart = usage.findIndex(n => n.classList.contains('lab') && n.textContent === 'Как диктовать голосом');
  const voice = voiceStart >= 0 ? usage.splice(voiceStart) : [];
  if (voice.length) voice.shift();
  safety.children[0].remove();
  settings.children[0].remove();
  grid.innerHTML = '';
  grid.append(
    section('Самопроверка кабинета', Array.from(cards[0].children)),
    section('Последние действия', Array.from(cards[1].children)),
    section('Настройки и данные', Array.from(settings.children)),
    section('Сохранение и версия кабинета', Array.from(safety.children)),
    section('Видео и доска', videoNodes),
    section('Интерфейс и подсказки', usage),
    section('Голосовой ввод и работа с занятием', voice)
  );
  return page;
}
