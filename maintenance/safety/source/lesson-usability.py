# Additive UI changes: keep existing lesson identifiers and per-student records.
def change(old, new):
 global s
 if old not in s: raise ValueError('Missing usability anchor: '+old[:100])
 s=s.replace(old,new)

change('  const opts = liveStudents();\n  if (!ui.reportId', '''  const all = liveStudents();
  const classes = [...new Set(all.map(st => String(st.cls || '')))].sort((a,b) => +a - +b);
  if (ui.reportClass && !classes.includes(ui.reportClass)) ui.reportClass = '';
  const opts = all.filter(st => !ui.reportClass || String(st.cls || '') === ui.reportClass);
  if (!ui.reportId''')
change("    el('div', {class:'filters'},\n      el('select', {onchange: e => { ui.reportId", """    el('div', {class:'filters'},
      el('select', {'aria-label':'Класс в отчётах', onchange:e => { ui.reportClass=e.target.value; render(); }},
        el('option', {value:'', selected:!ui.reportClass}, 'Все классы'),
        ...classes.filter(Boolean).map(c => el('option', {value:c, selected:c===ui.reportClass}, c+' класс'))),
      el('select', {'aria-label':'Ученик в отчётах', onchange: e => { ui.reportId""")
change("  const topicSel = el('select', {});", """  const topicSel = el('select', {});
  const lessonTitleIn = el('input', {type:'text', 'aria-label':'Название занятия', placeholder:'Например, Математическая викторина', value:draft.lessonTitle || ''});
  const freeTopicBtn = el('button', {type:'button', class:'btn btn-sm', onclick:() => {
    pickTopic(''); topicSel.dispatchEvent(new Event('change',{bubbles:true})); lessonTitleIn.focus();
  }}, 'Без привязки к программе');""")
change("'Тема'), topicSel, topicBtn, topicPanel)),", """'Тема'), topicSel, topicBtn, topicPanel,
        freeTopicBtn, bigField('Название занятия (необязательно)', lessonTitleIn),
        el('div', {class:'meta', text:'Можно указать своё название. Для урока вне программы нажмите «Без привязки к программе».'}))),""")
change('[ownerSel, topicSel, dateIn, timeIn, durSel, planIn, noteIn, resIn, hwIn, tellIn, restIn]', '[ownerSel, topicSel, dateIn, timeIn, durSel, planIn, noteIn, resIn, hwIn, tellIn, restIn, lessonTitleIn]')
change('    ownerSel.value, topicSel.value, dateIn.value', '    lessonTitleIn.value, ownerSel.value, topicSel.value, dateIn.value')
change('ownerType: ot, ownerId: oid, topicId: topicSel.value || null,', 'ownerType: ot, ownerId: oid, topicId: topicSel.value || null, lessonTitle: lessonTitleIn.value.trim(),')
change('function viewReports() {', """function lessonTitle(l, fallback = 'Тема не назначена') {
  return (l.lessonTitle || '').trim() || (l.topicId ? topic(l.topicId)?.title : '') || fallback;
}
function viewReports() {""")
for old,new in [
 ("text: t ? t.title : 'Тема не назначена'", 'text: lessonTitle(l)'),
 ("(l.topicId ? (topic(l.topicId)?.title || '') : 'тема не назначена')", "lessonTitle(l)"),
 ("t ? t.title : el('span', {style:'color:var(--warn)'}, 'Тема не назначена')", 'lessonTitle(l)'),
 ("(t ? t.title : 'Тема не назначена')", 'lessonTitle(l)'),
 ("t ? t.title : 'тема не указана'", 'lessonTitle(l)'),
 ("t ? t.title : '', m ?", "lessonTitle(l, ''), m ?"),
 ("const t = l.topicId ? (topic(l.topicId) || {}).title : '';", "const t = lessonTitle(l, '');"),
 ("${t ? t.title : 'не указана'}", '${lessonTitle(l)}'),
]: change(old,new)
change("  function renderPer() {", "  let perStudent = '';\n  const perExpanded = new Set();\n  function renderPer() {")
change("    for (const st of people) {\n      const cur = perData", """    if (perStudent && !people.some(st => st.id === perStudent)) perStudent = '';
    perBox.append(el('select', {'aria-label':'Ученик в групповом занятии', onchange:e => { perStudent=e.target.value; renderPer(); }},
      el('option', {value:'', selected:!perStudent}, 'Все ученики'),
      ...people.map(st => el('option', {value:st.id, selected:st.id===perStudent}, st.name))));
    for (const st of people.filter(st => !perStudent || st.id === perStudent)) {
      const cur = perData""")
change("perBox.append(el('div', {style:'padding:10px 0; border-top:1px solid var(--line-soft)'},\n        el('div', {class:'name', style:'margin-bottom:6px', text: st.name}),", """perBox.append(el('details', {class:'per-pupil', open:perStudent===st.id || perExpanded.has(st.id) ? true : null,
        ontoggle:e => { if(e.target.open) perExpanded.add(st.id); else perExpanded.delete(st.id); },
        style:'padding:10px 0; border-top:1px solid var(--line-soft)'},
        el('summary', {class:'name', style:'cursor:pointer; margin-bottom:6px', text: st.name}),""")
change('16 сентября 2026 · маршрут 1.6', '30 сентября 2026 · занятия 1.7')
change("(t ? ' · ' + t.title : '')", "(lessonTitle(fut, '') ? ' · ' + lessonTitle(fut, '') : '')")
change("topicId: topicSel.value || null\n        }))", "topicId: topicSel.value || null, lessonTitle:lessonTitleIn.value.trim()\n        }))")
change("${t ? t.title : 'не назначена'}", '${lessonTitle(l)}')
