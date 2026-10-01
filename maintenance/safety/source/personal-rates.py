# Additive tariffs; preserve legacy semantics until explicitly edited.
def change(old,new):
 global s
 if old not in s: raise ValueError('Missing personal-rate anchor: '+old[:90])
 s=s.replace(old,new)
change("function liveRate(l, sid) {\n  if (l.ownerType === 'group') { const g = group(l.ownerId); return g ? g.rate : 0; }", """function personalGroupRate(st, gid) {
  const v = st?.groupRates?.[gid];
  return v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null;
}
function validTariff(v) { return String(v).trim() !== '' && Number.isFinite(Number(v)) && Number(v) >= 0; }
function liveRate(l, sid) {
  if (l.ownerType === 'group') { const g = group(l.ownerId), personal = personalGroupRate(student(sid), l.ownerId); return personal ?? (g ? g.rate : 0); }""")
change("  if (st.rate) return st.rate;", "  if (validTariff(st.individualRate ?? '')) return Number(st.individualRate);\n  if (st.rate) return st.rate;")
change("  const rate = el('input', {type:'number', value:st?.rate ?? 50, min:0});", """  const rate = el('input', {type:'number', 'aria-label':'Цена индивидуального занятия', value:st ? liveRate({ownerType:'student'},st.id) : 50, min:0, step:'0.01'});
  const groupRates = {...(st?.groupRates || {})};
  let rateGroupId = st?.groupId || '';
  const groupRate = el('input', {type:'number', 'aria-label':'Персональная цена в группе', min:0, step:'0.01', value:groupRates[rateGroupId] ?? '', placeholder:'По ставке группы'});
  function captureGroupRate() { if(rateGroupId) { if(groupRate.value.trim()==='')delete groupRates[rateGroupId]; else groupRates[rateGroupId]=groupRate.value; } }
  grp.addEventListener('change',()=>{captureGroupRate();rateGroupId=grp.value;groupRate.value=groupRates[rateGroupId] ?? '';groupRate.disabled=!rateGroupId;});
  groupRate.disabled=!rateGroupId;""")
# Keep existing form draft field indexes: add new input at the end.
change("el('span',{},'Ставка'), rate)", "el('span',{},'Цена индивидуального занятия'), rate)")
change("    bigField('Заметка', note)\n  ], () => {\n    if (!name.value.trim()) return 'Введите имя.';", """    bigField('Заметка', note),
    el('label', {class:'field'}, el('span',{},'Персональная цена в выбранной группе'), groupRate),
    el('div', {class:'meta', text:'Пусто — общая ставка группы. 0 — бесплатно. Индивидуальные и групповые уроки могут быть у одного ученика. Уже отмеченные занятия сохраняют прежнюю цену.'})
  ], () => {
    if (!name.value.trim()) return 'Введите имя.';
    captureGroupRate();
    if (!validTariff(rate.value) || Object.values(groupRates).some(v=>!validTariff(v))) return 'Цена должна быть числом не меньше нуля.';""")
change("format:fmt.value, duration:+dur.value, rate:+rate.value || 0, payMode: payMode.value,", "format:fmt.value, duration:+dur.value, rate:+rate.value, individualRate:+rate.value, groupRates:Object.fromEntries(Object.entries(groupRates).map(([k,v])=>[k,Number(v)])), payMode: payMode.value,")
change("    if (st) {\n      S.groups.forEach", "    S.lessons.forEach(freezeLesson);\n    if (st) {\n      S.groups.forEach")
# Group editor: append rate fields after existing fields to preserve old drafts.
change("  const boxes = S.students.map(s => {", """  const memberRates = S.students.map(st => ({sid:st.id, input:el('input',{type:'number', min:0, step:'0.01', 'aria-label':'Цена в группе: '+st.name, value:personalGroupRate(st,id) ?? '', placeholder:'По ставке группы'})}));
  const boxes = S.students.map(s => {""")
change("el('span',{},'Ставка с участника'), rate)", "el('span',{},'Общая ставка с участника'), rate)")
change("el('div', {style:'display:grid;gap:6px;margin-top:8px'}, boxes))\n  ], () => {", """el('div', {style:'display:grid;gap:6px;margin-top:8px'}, boxes)),
    el('details', {}, el('summary', {text:'Персональные цены участников'}),
      el('div', {class:'meta', text:'Цены применяются только к выбранным участникам. Пусто — общая ставка группы; 0 — бесплатно. Прошлые отмеченные занятия не пересчитываются.'}),
      ...memberRates.map(r=>el('label',{class:'field'},el('span',{text:student(r.sid).name}),r.input)))
  ], () => {""")
change("    const memberIds = boxes.map(b => b.querySelector('input')).filter(i => i.checked).map(i => i.dataset.sid);", """    const memberIds = boxes.map(b => b.querySelector('input')).filter(i => i.checked).map(i => i.dataset.sid);
    if (!validTariff(rate.value) || memberRates.some(r=>memberIds.includes(r.sid)&&r.input.value.trim()!==''&&!validTariff(r.input.value))) return 'Цена должна быть числом не меньше нуля.';
    S.lessons.forEach(freezeLesson);""")
change("    S.students.forEach(s => {\n      if (memberIds.includes(s.id))", """    memberRates.filter(r=>memberIds.includes(r.sid)).forEach(r=>{
      const st=student(r.sid);st.groupRates={...(st.groupRates||{})};
      if(r.input.value.trim()==='')delete st.groupRates[gid];else st.groupRates[gid]=Number(r.input.value);
    });
    S.students.forEach(s => {
      if (memberIds.includes(s.id))""")
change("text: isG ? 'Ставка с участника' : 'Ставка за занятие'", "text: isG ? 'Общая ставка с участника' : 'Индивидуальное занятие'")
change("html:money(o.rate)", "html:money(isG ? o.rate : liveRate({ownerType:'student'},o.id))")
change("    !isG && o.note ?", """    !isG && o.groupId ? el('div', {class:'lv'}, el('div',{class:'lab',text:'Цена в группе'}), el('div',{class:'val',html:money(liveRate({ownerType:'group',ownerId:o.groupId},o.id))}), el('div',{class:'meta',text:personalGroupRate(o,o.groupId)===null?'По общей ставке группы':'Персональная цена'})) : null,
    !isG && o.note ?""")
change("const rate = st.rate || (st.groupId ? (group(st.groupId)?.rate || 0) : 0);", "const rate = liveRate(st.type==='группа' && st.groupId ? {ownerType:'group',ownerId:st.groupId} : {ownerType:'student'},st.id);")
change('30 сентября 2026 · занятия 1.7', '1 октября 2026 · тарифы 1.8')
