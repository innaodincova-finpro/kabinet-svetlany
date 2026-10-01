def change(old,new):
 global s
 assert old in s, 'Missing unified report anchor: '+old[:100]
 s=s.replace(old,new)
a=s.index('function reportBlocks(st, month) {')
b=s.index('/* Тот же отчёт словами',a)
s=s[:a]+(root/'source/unified-report.js').read_text()+'\n\n'+s[b:]
change("function viewReports() {\n  const all = liveStudents();", "function viewReports() {\n  const all = reportStudents();")
change("const months = [...new Set([...S.lessons.map(l => l.date.slice(0,7)), nowMonth])].sort();", "const months = [...new Set([...S.lessons.map(l => l.date.slice(0,7)), ...S.payments.map(p=>p.date.slice(0,7)), nowMonth])].sort();")
change("  const unmarked = lessonsOfStudent(st.id)\n    .filter(l => l.date >= from && l.date <= to && lessonOver(l) && !markOf(l, st.id)).length;", "  const unmarked = reportData(st.id,month).unmarked;")
change("    head('Отчёты родителям', 'Собирается из отметок, тем и результатов занятий за выбранный месяц',", "    head('Отчёты родителям', 'Собирается из отметок, тем и результатов занятий за выбранный месяц',\n      el('button',{class:'btn btn-sm',onclick:()=>editReportLink(st.id)},'Карточки одного ученика'),")
change("      el('select', {onchange: e => { ui.reportMonth", "      el('select', {'aria-label':'Месяц отчёта', onchange: e => { ui.reportMonth")
change("    el('div', {class:'card', style:'margin-bottom:16px'}, bigField('Комментарий репетитора', noteBox)),", "    el('div', {class:'card', style:'margin-bottom:16px'}, reportIds(st.id).length>1 ? el('div',{class:'meta',text:'Связаны карточки: '+reportIds(st.id).map(id=>student(id).name).join(' / ')+'. Это поле редактирует комментарий карточки «'+st.name+'»; в отчёт входят комментарии обеих карточек.'}) : null, bigField('Комментарий репетитора', noteBox)),")
anchor="      !isG ? el('button',{class:'btn btn-sm',onclick:()=>editPastRates(o.id)},'Исправить прошлые начисления') : null,"
change(anchor,anchor+"\n      !isG ? el('button',{class:'btn btn-sm',onclick:()=>editReportLink(o.id)},'Карточки одного ученика') : null,")
change("        S.students = S.students.filter(s => s.id !== id);", "        S.students = S.students.filter(s => s.id !== id);\n        if(S.reportPairs)S.reportPairs=S.reportPairs.filter(p=>!p.includes(id));")
change("      S.students = [];", "      S.students = [];\n      if(S.reportPairs)S.reportPairs=[];")
anchor="  // Missing historical material references are retained, not treated as a fatal error."
change(anchor,"""  if(d.reportPairs!==undefined){
    const linked=new Set(),ids=new Set(d.students.map(st=>st.id));
    if(!Array.isArray(d.reportPairs))throw new Error('Повреждены связи карточек для отчётов');
    for(const pair of d.reportPairs){
      if(!Array.isArray(pair)||pair.length!==2||pair[0]===pair[1]||pair.some(id=>!ids.has(id)||linked.has(id)))throw new Error('Повреждены связи карточек для отчётов');
      pair.forEach(id=>linked.add(id));
    }
  }
"""+anchor)
