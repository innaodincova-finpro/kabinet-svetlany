# Period by lessons (6 October 2026): the tutor marks «1-й урок периода» in a lesson card.
# A pupil's period runs from that lesson to the next marked first lesson; the parent
# report can cover such a period across months. Additive field lesson.starts (pupil IDs);
# no storage keys, migrations or money records change.
def change(old,new):
 global s
 if s.count(old)!=1: raise ValueError('Lesson periods anchor changed: '+old[:90])
 s=s.replace(old,new)

# Helpers and lesson numbering inside a period.
change("""function lessonCounts(l, sid) {
  if (!l || !l.date) return null;""","""/* ── Период по урокам ──
   Репетитор сама отмечает в карточке занятия «1-й урок периода».
   Период ученика — от этого урока до следующего отмеченного первого урока.
   Урок считается, если ученик был или пропуск начислен; не отмеченный ещё урок
   тоже получает номер. Пропуск без начисления и перенос не считаются. */
const isPeriodStart = (l, sid) => Array.isArray(l?.starts) && l.starts.includes(sid);
const lessonKey = l => l.date + ' ' + l.time;
function periodStarts(ids) {
  ids = [].concat(ids || []);
  return S.lessons.filter(l => l && l.date && ids.some(id => isPeriodStart(l, id)))
    .sort((a, b) => lessonKey(a).localeCompare(lessonKey(b)));
}
const periodCounted = (l, sid) => { const m = markOf(l, sid); return !m || m.s === 'был' || !!m.ch; };
function periodLessons(sid, start) {
  const next = periodStarts(sid).find(x => lessonKey(x) > lessonKey(start));
  return lessonsOfStudent(sid)
    .filter(x => lessonKey(x) >= lessonKey(start) && (!next || lessonKey(x) < lessonKey(next)) && periodCounted(x, sid))
    .sort((a, b) => lessonKey(a).localeCompare(lessonKey(b)));
}
function lessonCounts(l, sid) {
  if (!l || !l.date) return null;
  const psid = sid || (l.ownerType === 'student' ? l.ownerId : null);
  const start = psid ? periodStarts(psid).filter(x => lessonKey(x) <= lessonKey(l)).pop() : null;
  if (start) {
    const list = periodLessons(psid, start), i = list.findIndex(x => x.id === l.id);
    return i < 0 ? null : {n: i + 1, total: list.length, start};
  }""")
change("""  return c ? `${c.n}-е занятие в ${MONP[+l.date.slice(5, 7) - 1]}` : '';""",
"""  if (c && c.start) return `${c.n}-й урок периода с ${fmtDate(c.start.date)}`;
  return c ? `${c.n}-е занятие в ${MONP[+l.date.slice(5, 7) - 1]}` : '';""")

# Lesson card: per-pupil checkbox, kept in the form draft and saved with the lesson.
change("""  const marks = JSON.parse(JSON.stringify(savedExtras.marks || draft.marks || {}));""",
"""  const marks = JSON.parse(JSON.stringify(savedExtras.marks || draft.marks || {}));
  const starts = new Set(savedExtras.starts || draft.starts || []);""")
change("""      const chargeCb = el('input', {type:'checkbox', style:'width:auto', checked: m.ch, disabled: !m.s,
        onchange: e => { m.ch = e.target.checked; updateSum(); }});""","""      const chargeCb = el('input', {type:'checkbox', style:'width:auto', checked: m.ch, disabled: !m.s,
        onchange: e => { m.ch = e.target.checked; updateSum(); }});
      const startCb = el('input', {type:'checkbox', style:'width:auto', checked: starts.has(st.id), 'aria-label': '1-й урок периода: ' + st.name,
        onchange: e => { if (e.target.checked) starts.add(st.id); else starts.delete(st.id); body.dispatchEvent(new Event('input',{bubbles:true})); }});
      const saved = S.lessons.find(x => x.id === draft.id && x.date === dateIn.value && x.time === timeIn.value);
      const no = saved && !isNew ? lessonNoText(saved, st.id) : '';""")
change("""        el('label', {class:'row', style:'gap:7px; margin-left:auto'}, chargeCb,
          el('span', {class:'meta', html: 'начислить ' + money(rate)}))));""","""        el('label', {class:'row', style:'gap:7px; margin-left:auto'}, chargeCb,
          el('span', {class:'meta', html: 'начислить ' + money(rate)}))));
      afterBox.append(el('div', {class:'row', style:'gap:12px; margin:-4px 0 8px 132px; flex-wrap:wrap'},
        el('label', {class:'row', style:'gap:7px', title:'С этого урока начинается новый период: счёт уроков и отчёт родителям'}, startCb,
          el('span', {class:'meta', text:'1-й урок периода'})),
        no ? el('span', {class:'meta', text: no}) : null));""")
change("""    () => ({solution, hwChecks, perData, marks, hwCheck}));""",
"""    () => ({solution, hwChecks, perData, marks, hwCheck, starts: [...starts]}));""")
change("""JSON.stringify(marks), JSON.stringify(solution), JSON.stringify(hwChecks), JSON.stringify(perData)
  ]);""","""JSON.stringify(marks), JSON.stringify(solution), JSON.stringify(hwChecks), JSON.stringify(perData), JSON.stringify([...starts])
  ]);""")
change("""    data.done = Object.keys(data.marks).length > 0;""","""    data.done = Object.keys(data.marks).length > 0;
    const startIds = participants(data).map(st => st.id).filter(id => starts.has(id));
    if (startIds.length) data.starts = startIds;""")
change("""          if (l.marks && l.marks[id]) delete l.marks[id];""","""          if (l.marks && l.marks[id]) delete l.marks[id];
          if (Array.isArray(l.starts)) { l.starts = l.starts.filter(x => x !== id); if (!l.starts.length) delete l.starts; }""")

# Report: a period key «p:<lessonId>» next to calendar months.
change("""function reportData(sid, month) {
  const ids=reportIds(sid),{entries,conflicts}=reportEntries(ids),[y,m]=month.split('-').map(Number);
  const from=`${y}-${pad2(m)}-01`,to=`${y}-${pad2(m)}-${pad2(new Date(y,m,0).getDate())}`;""","""/* Отчётный период: календарный месяц «2026-09» или период по урокам «p:<id первого урока>». */
function reportPeriod(sid, key) {
  key = String(key || '');
  if (key.startsWith('p:')) {
    const ids = reportIds(sid), starts = periodStarts(ids), i = starts.findIndex(l => l.id === key.slice(2));
    if (i >= 0) {
      const a = starts[i], b = starts[i + 1] || null, ak = lessonKey(a), bk = b ? lessonKey(b) : '9999';
      const has = l => lessonKey(l) >= ak && lessonKey(l) < bk;
      const held = reportEntries(ids).entries.filter(e => has(e.lesson) && lessonOk(e.lesson) && lessonOver(e.lesson) && markOf(e.lesson, e.sid) && periodCounted(e.lesson, e.sid));
      const end = held.length ? held[held.length - 1].lesson.date : a.date;
      return {key, byLessons: true, start: a, next: b, count: held.length, has,
        hasDate: d => d >= a.date && (!b || d < b.date),
        label: `Период с ${fmtDate(a.date)}${a.date.slice(0, 4) !== end.slice(0, 4) ? ' ' + a.date.slice(0, 4) : ''} по ${fmtDate(end)} ${end.slice(0, 4)} · уроков: ${held.length}`};
    }
  }
  if (!/^\\d{4}-\\d{2}$/.test(key)) key = iso(new Date()).slice(0, 7);
  const [y, m] = key.split('-').map(Number), from = `${y}-${pad2(m)}-01`, to = `${y}-${pad2(m)}-${pad2(new Date(y, m, 0).getDate())}`;
  return {key, byLessons: false, has: l => l.date >= from && l.date <= to, hasDate: d => d >= from && d <= to, label: `${MONN[m - 1]} ${y}`};
}
function reportData(sid, month) {
  const ids=reportIds(sid),{entries,conflicts}=reportEntries(ids),P=reportPeriod(sid,month);""")
change("""  const inMonth=entries.filter(({lesson:l})=>lessonOk(l)&&lessonOver(l)&&l.date>=from&&l.date<=to);""",
"""  const inMonth=entries.filter(({lesson:l})=>lessonOk(l)&&lessonOver(l)&&P.has(l));""")
change("""  return {ids,entries,inMonth,mine,formats,conflicts,unmarked:inMonth.length-mine.length,""",
"""  return {ids,entries,inMonth,mine,formats,conflicts,period:P,unmarked:inMonth.length-mine.length,""")
change("""paid:payments.filter(p=>p.date>=from&&p.date<=to).reduce(""","""paid:payments.filter(p=>P.hasDate(p.date)).reduce(""")
change("""  const [y,m]=month.split('-').map(Number),data=reportData(st.id,month),B=[];""",
"""  const data=reportData(st.id,month),P=data.period,per=P.byLessons?'период':'месяц',B=[];""")
change("""{k:'sub',t:`${MONN[m-1]} ${y} · репетитор""","""{k:'sub',t:`${P.label} · репетитор""")
change("""['Начислено за месяц',cash(data.charged)],['Оплачено за месяц',cash(data.paid)]""","""['Начислено за '+per,cash(data.charged)],['Оплачено за '+per,cash(data.paid)]""")
change("""B.push({k:'b',t:'Коротко за месяц'},""","""B.push({k:'b',t:'Коротко за '+per},""")
change("""'Занятия пока не отмечены — после отметки они появятся в отчёте.':'За этот месяц нет прошедших занятий.'""",
"""'Занятия пока не отмечены — после отметки они появятся в отчёте.':'За этот '+per+' нет прошедших занятий.'""")
change("""`Не отмечено занятий этого месяца: ${data.unmarked}""","""`Не отмечено занятий за этот ${per}: ${data.unmarked}""")
change("""Общий баланс учитывает все записи, а не только этот месяц.'});""","""Общий баланс учитывает все записи, а не только этот '+per+'.'+(P.byLessons?' Период начинается с урока, отмеченного «1-й урок периода», и длится до следующего такого урока. Уроки считаются, если ученик был или пропуск начислен. Оплаты — по датам платежей в пределах периода.':'')});""")
change("""    + 'Вот сухие данные за месяц:\\n\\n'""","""    + 'Вот сухие данные за выбранный период:\\n\\n'""")

# Reports screen: the pupil's periods are offered after the months.
change("""  if (!ui.reportMonth || !months.includes(ui.reportMonth)) ui.reportMonth = nowMonth;
  const month = ui.reportMonth;
  const [ry, rm] = month.split('-').map(Number);
  const monthName = `${MONN[rm-1]} ${ry}`;""","""  const periods = periodStarts(reportIds(st.id)).map(l => 'p:' + l.id);
  if (!ui.reportMonth || (!months.includes(ui.reportMonth) && !periods.includes(ui.reportMonth))) ui.reportMonth = periods.length ? periods[periods.length - 1] : nowMonth;
  const month = ui.reportMonth;
  const [ry, rm] = month.split('-').map(Number);
  const monthName = reportPeriod(st.id, month).label;""")
change("""'Собирается из отметок, тем и результатов занятий за выбранный месяц',""",
"""'Собирается из отметок, тем и результатов занятий за выбранный месяц или период по урокам',""")
change("""      el('select', {'aria-label':'Месяц отчёта', onchange: e => { ui.reportMonth = e.target.value; render(); }},
        ...months.map(m => { const [y, mo] = m.split('-'); return el('option', {value:m, selected:m===month}, `${MONN[+mo-1]} ${y}`); }))),""",
"""      el('select', {'aria-label':'Месяц отчёта', onchange: e => { ui.reportMonth = e.target.value; render(); }},
        ...months.map(m => { const [y, mo] = m.split('-'); return el('option', {value:m, selected:m===month}, `${MONN[+mo-1]} ${y}`); }),
        ...periods.map(p => el('option', {value:p, selected:p===month}, reportPeriod(st.id, p).label)))),""")

change('3 октября 2026 · оплата и темы 1.8.1', '6 октября 2026 · период по урокам 1.9')
