# Remarks of 2 October 2026: pupil filter in payments; upcoming topics by personal history.
# Read-only views: no storage keys, migrations or money records change.
def change(old,new):
 global s
 if s.count(old)!=1: raise ValueError('Current remarks anchor changed: '+old[:90])
 s=s.replace(old,new)

# 1. «Что впереди»: a topic the pupil attended personally (individual or group lesson) is not upcoming.
change("""/* Следующие непройденные темы маршрута; без маршрута — темы расписания. */
function upcomingTopics(type, id, n, sid) {
  const route = routeOf(type, id);
  const seen = new Set();
  if (route) {
    const passed = new Set(passedTopics(type, id, sid).map(t => t.id));
    return (route.topicIds || []).filter(tid => !passed.has(tid) && !seen.has(tid) && seen.add(tid))
      .map(tid => topic(tid)).filter(Boolean).slice(0, n || 3);
  }
  const today = iso(new Date());
  return S.lessons
    .filter(l => l.ownerType === type && l.ownerId === id && l.topicId && !isMarked(l) && l.date >= today)
    .sort((a, b) => (a.date + a.time) < (b.date + b.time) ? -1 : 1)
    .map(l => l.topicId).filter(t => !seen.has(t) && seen.add(t)).map(t => topic(t)).filter(Boolean).slice(0, n || 3);
}""","""/* Темы, на которых ученик был лично: индивидуальные и групповые занятия.
   Пропуск и перенос не считаются. Посещение не означает освоения темы. */
function personalPassedIds(sids) {
  const list = [].concat(sids || []).filter(Boolean);
  return new Set(S.lessons.filter(l => l.topicId && list.some(sid => l.marks?.[sid]?.s === 'был')).map(l => l.topicId));
}
/* Следующие непройденные темы маршрута; без маршрута — темы расписания.
   sid — ученик или связанные карточки одного ученика: учитывается его личная история. */
function upcomingTopics(type, id, n, sid) {
  const route = routeOf(type, id);
  const seen = new Set();
  const sids = [].concat(sid || []).filter(Boolean);
  const passed = sids.length ? personalPassedIds(sids) : new Set(passedTopics(type, id).map(t => t.id));
  if (route) {
    return (route.topicIds || []).filter(tid => !passed.has(tid) && !seen.has(tid) && seen.add(tid))
      .map(tid => topic(tid)).filter(Boolean).slice(0, n || 3);
  }
  const today = iso(new Date());
  return S.lessons
    .filter(l => l.ownerType === type && l.ownerId === id && l.topicId && !isMarked(l) && l.date >= today)
    .sort((a, b) => (a.date + a.time) < (b.date + b.time) ? -1 : 1)
    .map(l => l.topicId).filter(t => !passed.has(t) && !seen.has(t) && seen.add(t)).map(t => topic(t)).filter(Boolean).slice(0, n || 3);
}""")
change("flatMap(([type,id])=>upcomingTopics(type,id,3))", "flatMap(([type,id])=>upcomingTopics(type,id,3,data.ids))")

# 2. «Посещения и оплата»: choose one pupil; the selected month is kept.
change("""  const rows = liveStudents().map(st => {
    const inMonth = lessonsOfStudent(st.id).filter(l => l.date >= from && l.date <= to);""","""  const moneyPupils = liveStudents();
  if (ui.moneyFilter && !moneyPupils.some(st => st.id === ui.moneyFilter)) ui.moneyFilter = '';
  if (ui.moneyFilter && ui.moneyStudent && ui.moneyStudent !== ui.moneyFilter) ui.moneyStudent = null;
  const rows = moneyPupils.filter(st => !ui.moneyFilter || st.id === ui.moneyFilter).map(st => {
    const inMonth = lessonsOfStudent(st.id).filter(l => l.date >= from && l.date <= to);""")
change("""      el('select', {onchange: e => { ui.moneyMonth = e.target.value; render(); }},
        ...months.map(m => { const [y,mo] = m.split('-'); return el('option', {value:m, selected:m===ui.moneyMonth}, `${MONN[+mo-1]} ${y}`); })),
      el('span', {style:'flex:1'}),
      el('span', {class:'meta', html: `За месяц начислено ${money(totalCharged)} · получено ${money(totalPaid)}`})),""","""      el('select', {'aria-label':'Месяц', onchange: e => { ui.moneyMonth = e.target.value; render(); }},
        ...months.map(m => { const [y,mo] = m.split('-'); return el('option', {value:m, selected:m===ui.moneyMonth}, `${MONN[+mo-1]} ${y}`); })),
      el('select', {'aria-label':'Ученик', onchange: e => { ui.moneyFilter = e.target.value; if (ui.moneyStudent && ui.moneyFilter && ui.moneyStudent !== ui.moneyFilter) ui.moneyStudent = null; render(); }},
        el('option', {value:'', selected:!ui.moneyFilter}, 'Все ученики'),
        ...moneyPupils.map(st => el('option', {value:st.id, selected:st.id===ui.moneyFilter}, st.name + (st.cls ? ' · ' + st.cls + ' кл.' : '')))),
      el('span', {style:'flex:1'}),
      el('span', {class:'meta', html: `${ui.moneyFilter ? 'Весь кабинет за месяц: начислено' : 'За месяц начислено'} ${money(totalCharged)} · получено ${money(totalPaid)}`})),""")
change("""    el('div', {class:'meta', style:'margin-top:14px'},
      `Столбцы «Занятий»""","""    ui.moneyFilter ? el('div', {class:'meta', style:'margin-top:14px'}, 'Показан один ученик. Итоги месяца, долги, предоплаты и выгрузки в Word, Excel и CSV — по всему кабинету.') : null,
    el('div', {class:'meta', style:'margin-top:14px'},
      `Столбцы «Занятий»""")

change('1 октября 2026 · тарифы 1.8', '3 октября 2026 · оплата и темы 1.8.1')
