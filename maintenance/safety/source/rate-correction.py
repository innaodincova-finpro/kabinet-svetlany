anchor="      el('button', {class:'btn btn-sm', onclick:() => isG ? editGroup(o.id) : editStudent(o.id)}, 'Редактировать'),"
assert anchor in s
s=s.replace(anchor,anchor+"\n      !isG ? el('button',{class:'btn btn-sm',onclick:()=>editPastRates(o.id)},'Исправить прошлые начисления') : null,")
anchor='dropOldDrafts();\nstartTick();'
assert anchor in s
s=s.replace(anchor,(root/'source/rate-correction.js').read_text()+'\n'+anchor)
