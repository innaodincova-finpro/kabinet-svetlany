import json
def change(old,new):
 global s
 assert old in s, 'Missing report layout anchor: '+old[:100]
 s=s.replace(old,new)
css=(root/'source/report-layout.css').read_text().replace('__REPORT_FONT__',(root/'source/report-font.base64').read_text().strip())
s=s.replace('</head>','<style>'+css+'</style>\n</head>',1)
change('function reportBlocks(st, month) {','const REPORT_STYLE='+json.dumps(css,ensure_ascii=False)+';\n'+(root/'source/report-layout.js').read_text()+'\nfunction reportBlocks(st, month) {')
change("    el('div', {class:'report', text}));","    reportView(blocks));")
anchor="      el('button',{class:'btn btn-sm',onclick:()=>editReportLink(st.id)},'Карточки одного ученика'),"
change(anchor,anchor+"\n      el('button',{class:'btn btn-sm',onclick:()=>printParentReport(st,month)},'Печать / сохранить PDF'),")
# Keep calculations and existing content unchanged; move financial detail to the end.
a=s.index("  B.push({k:'b',t:'Занятия и начисления по форматам'}",s.index('function reportBlocks'))
b=s.index('  if(data.ids.length>1)',a)
cost=s[a:b].replace("t:'Занятия и начисления по форматам'","t:'Стоимость занятий'")
s=s[:a]+s[b:]
anchor="  B.push({k:'note',t:`Вопросы по отчёту — репетитор ${S.tutor}.`});return B;"
change(anchor,cost+anchor)
# Replace cramped five-column lesson table with readable dated paragraphs.
a=s.index("    B.push({k:'b',t:'Занятия месяца'}",s.index('function reportBlocks'))
b=s.index('    const topics=',a)
s=s[:a]+'''    B.push({k:'b',t:'Результаты и наблюдения по занятиям'});
    for(const {lesson:l,sid} of mine){
      const mark=markOf(l,sid),check=homeworkCheckFor(l,sid);
      const heading=fmtDate(l.date)+' '+l.time+' · '+(l.ownerType==='group'?'групповое':'индивидуальное')+' · '+lessonTitle(l);
      B.push({k:'p',t:heading});
      if(mark.s!=='был')B.push({k:'li',t:(MARK_LABEL[mark.s]||mark.s)+(mark.reason?' — '+mark.reason:'')});
      if(resultFor(l,sid))B.push({k:'li',t:resultFor(l,sid)});
      if(homeworkFor(l,sid))B.push({k:'li',t:'Домашнее задание: '+homeworkFor(l,sid)});
      if(check?.s)B.push({k:'li',t:'Проверка ДЗ: '+HW_LABEL[check.s]+(check.note?' — '+check.note:'')});
      B.push({k:'note',t:'Начислено за занятие: '+cash(mark.ch?rateFor(l,sid):0)});
    }
''' + s[b:]
