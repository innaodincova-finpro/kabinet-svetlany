# Fail closed if legacy anchors change; the generated HTML remains reproducible.
a=s.index('  const addSlot = () => openSlotPicker',s.index('function standingCard('))
b=s.index('\n  const rows =',a)
s=s[:a]+"  const addSlot = () => editStandingSlot(type, id, o);\n"+s[b:]
a=s.index("      el('button', {class:'btn btn-ghost btn-sm', onclick:() => openSlotPicker",s.index('function standingCard('))
b=s.index("      el('button', {class:'btn btn-danger btn-sm'",a)
s=s[:a]+"      el('button', {class:'btn btn-ghost btn-sm', onclick:() => editStandingSlot(type, id, o, s)}, 'Изменить'),\n"+s[b:]
s=s.replace("o.slots = slotsOf(o).filter((x, j) => j !== i); save('Убран постоянный день');", "o.slots = slotsOf(o).filter(x => x !== s); save('Убран постоянный день');")
s=s.replace("'Занятое время не занимается повторно — если день уже кем-то занят, он просто пропускается. Отдельное занятие переносится или удаляется в своей карточке.'", "'Изменение отдельного занятия в календаре не меняет постоянное расписание. Для изменения постоянного времени нажмите «Изменить» у нужного дня. Там можно также перенести будущие занятия.'")
s=s.replace('dropOldDrafts();\nstartTick();',(root/'source/standing.js').read_text()+'\ndropOldDrafts();\nstartTick();')
s=s.replace('</style>', '\n#pickDlg .dlg-b{min-height:0;overflow-y:auto} #pickDlg label{display:grid;gap:6px;min-width:0} #pickDlg input,#pickDlg select{width:100%;min-width:0;box-sizing:border-box}\n</style>',1)
s=s.replace('8 сентября 2026 · помощь 1.3','13 сентября 2026 · расписание 1.4')
