/* Lesson date, time and duration checks. Broken records stay in storage
   unchanged and are listed for manual correction; nothing is invented. */
function lessonProblems(l) {
  if (!l || typeof l !== 'object') return ['запись повреждена'];
  const p = [];
  const dateOk = typeof l.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(l.date) && iso(parseISO(l.date)) === l.date;
  const timeOk = typeof l.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(l.time);
  const durOk = typeof l.duration === 'number' && Number.isFinite(l.duration) && l.duration > 0 && l.duration <= 1440;
  if (!dateOk) p.push('не указана дата');
  if (!timeOk) p.push('не указано время');
  if (!durOk) p.push('не указана длительность');
  if (timeOk && durOk && toMin(l.time) + l.duration > 1440) p.push('заканчивается после полуночи');
  return p;
}
function lessonOk(l) { return !lessonProblems(l).length; }
function brokenLessons() { return (S.lessons || []).filter(l => !lessonOk(l)); }
function lessonWhen(l) {
  const dateOk = typeof l.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(l.date);
  const timeOk = typeof l.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(l.time);
  return (dateOk ? fmtDate(l.date) : 'дата не указана') + ' · ' + (timeOk ? l.time : 'время не указано');
}
function brokenLessonsBlock() {
  const list = brokenLessons();
  if (!list.length) return null;
  return el('div', {class:'card', id:'brokenLessons', role:'alert', style:'border-color:var(--stop); margin-bottom:16px'},
    el('b', {text:`Требуют исправления: ${list.length} ${plural(list.length,'занятие','занятия','занятий')}`}),
    el('div', {class:'meta', style:'font-size:12.5px; margin:4px 0 10px',
      text:'У этих занятий не хватает даты, времени или длительности. В расписании они не показываются. Откройте карточку, укажите недостающее и сохраните.'}),
    el('div', {class:'list'}, list.map(l => el('div', {class:'list-row', style:'grid-template-columns:1fr auto; gap:12px'},
      el('div', {},
        el('div', {class:'name', text: ownerName(l)}),
        el('div', {class:'meta', style:'font-size:12.5px', text: [lessonWhen(l), ...lessonProblems(l).filter(x => x !== 'не указана дата' && x !== 'не указано время')].join(' · ')})),
      el('button', {class:'btn btn-sm btn-primary', onclick:() => openLessonCard(l, false)}, 'Исправить')))));
}
