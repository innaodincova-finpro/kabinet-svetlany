# Lesson date/time/duration guard. Every anchor must exist exactly as expected.
def fix(old,new,count=1):
 global s
 if s.count(old)!=count: raise ValueError('Lesson time patch anchor: %d x %s'%(s.count(old),old[:90]))
 s=s.replace(old,new)
# Unknown time never throws; it becomes "not a number" and is filtered out below.
fix("const toMin = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };",
    "const toMin = t => { const m = /^(\\d{1,2}):(\\d{2})$/.exec(String(t ?? '')); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN; };")
fix("const fmtDate = s => { const d = parseISO(s); return `${d.getDate()} ${MON[d.getMonth()]}`; };",
    "const fmtDate = s => { if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(String(s ?? ''))) return 'дата не указана'; const d = parseISO(s); return `${d.getDate()} ${MON[d.getMonth()]}`; };")
fix("const lessonsOn = d => S.lessons.filter(l => l.date === d).sort(",
    "const lessonsOn = d => S.lessons.filter(l => l.date === d && lessonOk(l)).sort(")
fix("const lessonEnd = l => toMin(l.time) + l.duration;",
    "const lessonEnd = l => toMin(l.time) + Number(l.duration);")
fix("""  const s = toMin(time), e = s + duration;
  return S.lessons.filter(l => l.date === date && l.id !== exceptId)""",
"""  const s = toMin(time), e = s + Number(duration);
  if (!Number.isFinite(s) || !Number.isFinite(e)) return null;
  return S.lessons.filter(l => l.date === date && l.id !== exceptId && lessonOk(l))""")
# Week grid: one broken record must not hide the week.
fix("""  const week = S.lessons.filter(l => days.includes(l.date));
  // рабочие часы, расширенные под то, что реально стоит на этой неделе
  let H0 = S.dayStart, H1 = S.dayEnd;""",
"""  const week = S.lessons.filter(l => days.includes(l.date) && lessonOk(l));
  // рабочие часы, расширенные под то, что реально стоит на этой неделе
  const hourOr = (v, d) => Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 24 ? Number(v) : d;
  let H0 = hourOr(S.dayStart, 8), H1 = hourOr(S.dayEnd, 21);""")
fix("const starting = S.lessons.filter(l => l.date === dISO && toMin(l.time) >= h*60",
    "const starting = week.filter(l => l.date === dISO && toMin(l.time) >= h*60")
# Broken lessons are listed where the tutor looks for lessons.
fix("""    body,
    el('div', {class:'meta', style:'margin-top:12px'}, 'Контроль пересечений""",
"""    brokenLessonsBlock(),
    body,
    el('div', {class:'meta', style:'margin-top:12px'}, 'Контроль пересечений""")
fix("""    markCard ? el('div', {style:'margin-bottom:22px'}, markCard) : null,
    backupCard,""",
"""    brokenLessonsBlock(),
    markCard ? el('div', {style:'margin-bottom:22px'}, markCard) : null,
    backupCard,""")
fix("const unmarkedLessons = () => S.lessons.filter(needsMark)",
    "const unmarkedLessons = () => S.lessons.filter(l => lessonOk(l) && needsMark(l))")
# Counters show the same lessons as the grid; the rest are in the correction list.
fix("const inMonthCount = S.lessons.filter(l => l.date.slice(0,7) === iso(first).slice(0,7)).length;",
    "const inMonthCount = S.lessons.filter(l => lessonOk(l) && l.date.slice(0,7) === iso(first).slice(0,7)).length;")
fix("const cnt = S.lessons.filter(l => l.date >= iso(monday) && l.date <= iso(end)).length;",
    "const cnt = S.lessons.filter(l => lessonOk(l) && l.date >= iso(monday) && l.date <= iso(end)).length;")
# Calendar export: only complete lessons that were not cancelled or moved.
fix("""    .filter(l => l.date >= today && l.date <= last)
    .sort((a, b) => (a.date + a.time) < (b.date + b.time) ? -1 : 1);
  const now = new Date();""",
"""    .filter(l => lessonOk(l) && l.date >= today && l.date <= last)
    .filter(l => { const ms = Object.values(l.marks || {}).map(m => m && m.s).filter(Boolean); return !ms.length || ms.some(x => x !== 'пропуск' && x !== 'перенос'); })
    .sort((a, b) => (a.date + a.time) < (b.date + b.time) ? -1 : 1);
  const now = new Date();""")
# Lesson card: required date, time, owner and duration; input stays in the form.
fix("  const timeIn = el('input', {type:'time', value:draft.time, step:300});",
    "  const timeIn = el('input', {type:'time', value:draft.time, step:60});")
fix("  const durSel = el('select', {}, ...[60,90,120].map(d => el('option', {value:d, selected:+draft.duration === d}, d + ' мин')));",
"""  const durChoices = [60, 90, 120];
  const durKnown = typeof draft.duration === 'number' && Number.isFinite(draft.duration) && draft.duration > 0;
  if (durKnown && !durChoices.includes(draft.duration)) durChoices.push(draft.duration);
  const durSel = el('select', {},
    durKnown ? null : el('option', {value:'', selected:true}, '— укажите —'),
    ...durChoices.sort((a, b) => a - b).map(d => el('option', {value:d, selected:durKnown && draft.duration === d}, d + ' мин')));""")
fix("""    lessonDraft.write();
    const clash = overlaps(dateIn.value, timeIn.value, +durSel.value, draft.id);""",
"""    lessonDraft.write();
    {
      const missing = [];
      const ownerParts = String(ownerSel.value || '').split(':');
      if (!lessonOk({date:dateIn.value, time:'00:00', duration:1})) missing.push([dateIn, 'дату']);
      if (!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(timeIn.value)) missing.push([timeIn, 'время']);
      if (!(Number(durSel.value) > 0)) missing.push([durSel, 'длительность']);
      if (ownerParts.length !== 2 || !ownerParts[0] || !ownerParts[1]) missing.push([ownerSel, 'ученика или группу']);
      [dateIn, timeIn, durSel, ownerSel].forEach(n => n.removeAttribute('aria-invalid'));
      if (missing.length) {
        missing.forEach(([n]) => n.setAttribute('aria-invalid', 'true'));
        warn.textContent = 'Не сохранено: укажите ' + missing.map(x => x[1]).join(', ') + '. Всё введённое осталось в карточке.';
        toast('Занятие не сохранено');
        missing[0][0].focus();
        return;
      }
      if (toMin(timeIn.value) + Number(durSel.value) > 1440) {
        timeIn.setAttribute('aria-invalid', 'true');
        warn.textContent = 'Не сохранено: занятие должно закончиться до полуночи.';
        toast('Занятие не сохранено'); timeIn.focus(); return;
      }
    }
    const clash = overlaps(dateIn.value, timeIn.value, +durSel.value, draft.id);""")
fix(": `${fmtDate(draft.date)} · ${draft.time}` + (lessonNoText(L)",
    ": lessonWhen(draft) + (lessonNoText(L)")
fix("`${ownerName(draft)}, ${fmtDate(draft.date)} в ${draft.time}. Запись исчезнет",
    "`${ownerName(draft)}, ${lessonWhen(draft)}. Запись исчезнет")
# Recurring schedule never creates lessons without a known duration.
fix("      if (overlaps(dISO, s.time, o.duration)) { skipped++; continue; }",
    "      if (!(Number(o.duration) > 0) || !lessonOk({date:dISO, time:s.time, duration:Number(o.duration)})) { skipped++; continue; }\n      if (overlaps(dISO, s.time, o.duration)) { skipped++; continue; }")
fix("    if(toMin(next.time)+Number(o.duration)>1440){",
    "    if(!(Number(o.duration)>0)){preview.textContent='Сначала укажите длительность занятия в карточке.';return;}\n    if(toMin(next.time)+Number(o.duration)>1440){")
# Import confirmation names incomplete lessons before anything is replaced.
fix("'. Оплаты: '+decoded.data.payments.length+'.\\n'",
    "'. Оплаты: '+decoded.data.payments.length+'.\\n'+(decoded.data.lessons.filter(l=>!lessonOk(l)).length?'Занятий без даты, времени или длительности: '+decoded.data.lessons.filter(l=>!lessonOk(l)).length+'. После восстановления они будут в списке «Требуют исправления».\\n':'')")
fix('dropOldDrafts();\nstartTick();', (root/'source/lesson-time.js').read_text()+'\ndropOldDrafts();\nstartTick();')
# One release date everywhere in Help (audit item 14).
RELEASE_AT='2026-09-16T06:36:16Z'
fix("const VERSION = '13 сентября 2026 · расписание 1.4';", "const VERSION = '16 сентября 2026 · расписание 1.5';")
fix("helpDateTime('2026-09-08T06:07:31Z')", "helpDateTime('%s')"%RELEASE_AT)
fix("const HELP_RELEASE_AT = '2026-09-08T09:06:18.872107+00:00';", "const HELP_RELEASE_AT = '%s';"%RELEASE_AT)
