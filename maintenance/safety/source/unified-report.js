/* Links aggregate reports only. Original cards, lessons and payments keep their IDs. */
function reportIds(sid) {
  const pair=(S.reportPairs||[]).find(p=>p.includes(sid));
  return pair ? pair.filter(id=>student(id)) : [sid];
}
function reportStudents() {
  const seen=new Set();return liveStudents().filter(st=>{if(seen.has(st.id))return false;reportIds(st.id).forEach(id=>seen.add(id));return true;});
}
function reportEntries(ids) {
  const entries=[],conflicts=[],seen=new Map();
  for(const l of S.lessons){
    const sourceIds=ids.filter(id=>participants(l).some(st=>st.id===id));
    if(!sourceIds.length)continue;
    if(sourceIds.length>1){conflicts.push(fmtDate(l.date)+' '+l.time+': обе карточки участвуют в одном занятии');continue;}
    if(seen.has(l.id)){
      if(seen.get(l.id)!==JSON.stringify(l))conflicts.push('Несовпадающие записи одного занятия: '+fmtDate(l.date));
      continue;
    }
    seen.set(l.id,JSON.stringify(l));entries.push({lesson:l,sid:sourceIds[0]});
  }
  entries.sort((a,b)=>(a.lesson.date+a.lesson.time).localeCompare(b.lesson.date+b.lesson.time));
  if(ids.length>1)entries.forEach((a,i)=>{
    if(!lessonOk(a.lesson))return;
    const b=entries.slice(0,i).find(b=>b.sid!==a.sid&&lessonOk(b.lesson)&&b.lesson.date===a.lesson.date&&toMin(a.lesson.time)<toMin(b.lesson.time)+b.lesson.duration&&toMin(b.lesson.time)<toMin(a.lesson.time)+a.lesson.duration);
    if(b)conflicts.push(fmtDate(a.lesson.date)+' '+a.lesson.time+': занятия связанных карточек пересекаются по времени');
  });
  return {entries,conflicts};
}
function reportData(sid, month) {
  const ids=reportIds(sid),{entries,conflicts}=reportEntries(ids),[y,m]=month.split('-').map(Number);
  const from=`${y}-${pad2(m)}-01`,to=`${y}-${pad2(m)}-${pad2(new Date(y,m,0).getDate())}`;
  const payments=[],seen=new Map();
  for(const p of S.payments.filter(p=>ids.includes(p.studentId))){
    if(seen.has(p.id)){if(seen.get(p.id)!==JSON.stringify(p))conflicts.push('Несовпадающие записи одной оплаты: '+fmtDate(p.date));continue;}
    seen.set(p.id,JSON.stringify(p));payments.push(p);
  }
  const inMonth=entries.filter(({lesson:l})=>lessonOk(l)&&lessonOver(l)&&l.date>=from&&l.date<=to);
  const mine=inMonth.filter(({lesson:l,sid})=>markOf(l,sid));
  const amount=({lesson:l,sid})=>markOf(l,sid)?.ch?rateFor(l,sid):0;
  const formats=['student','group'].map(type=>{
    const rows=mine.filter(e=>(e.lesson.ownerType==='group'?'group':'student')===type);
    const attended=rows.filter(e=>markOf(e.lesson,e.sid).s==='был');
    return {type,label:type==='group'?'Групповые':'Индивидуальные',attended:attended.length,minutes:attended.reduce((n,e)=>n+e.lesson.duration,0),billed:rows.filter(e=>markOf(e.lesson,e.sid).ch).length,charged:rows.reduce((n,e)=>n+amount(e),0)};
  });
  return {ids,entries,inMonth,mine,formats,conflicts,unmarked:inMonth.length-mine.length,
    charged:mine.reduce((n,e)=>n+amount(e),0),paid:payments.filter(p=>p.date>=from&&p.date<=to).reduce((n,p)=>n+(Number(p.amount)||0),0),
    balance:payments.reduce((n,p)=>n+(Number(p.amount)||0),0)-entries.reduce((n,e)=>n+amount(e),0)};
}
function editReportLink(sid) {
  const st=student(sid);if(!st)return;
  const dlg=$('#pickDlg'),original=snapshot(),pair=reportIds(sid),peer=pair.find(id=>id!==sid)||'';
  const label=st=>st.name+' · '+(st.cls||'—')+' класс · '+(st.type||'индивидуально')+(st.archived?' · архив':'')+' · занятий: '+lessonsOfStudent(st.id).length;
  const candidates=S.students.filter(s=>s.id!==sid&&(s.id===peer||reportIds(s.id).length===1));
  const sel=el('select',{id:'reportLinkPeer',style:'width:100%;min-width:0'},el('option',{value:'',selected:!peer},'Без связи — отдельный отчёт'),...candidates.map(s=>el('option',{value:s.id,selected:s.id===peer},label(s))));
  const preview=el('div',{id:'reportLinkPreview','aria-live':'polite'});
  const confirm=el('input',{id:'reportLinkConfirm',type:'checkbox',style:'width:18px;height:18px;flex:0 0 18px;margin:3px 0'});
  let prepared=null;
  sel.addEventListener('change',()=>{prepared=null;confirm.checked=false;preview.textContent='';});
  function prepare(){
    prepared=null;confirm.checked=false;preview.textContent='';
    if(original!==snapshot()){preview.textContent='Записи изменились. Закройте окно и откройте снова.';return;}
    if(sel.value===peer){preview.textContent='Связь не изменилась.';return;}
    const other=sel.value?student(sel.value):null;
    if(sel.value&&(!other||other.id===sid||reportIds(other.id).length>1)){preview.textContent='Эта карточка недоступна для связи.';return;}
    if(other){
      const conflicts=reportEntries([sid,other.id]).conflicts;
      if(conflicts.length){preview.append(el('p',{text:'Связь не создана: нельзя однозначно собрать отчёт. Сначала проверьте эти занятия в исходных карточках.'}),...conflicts.map(t=>el('p',{text:t})));return;}
      preview.append(el('p',{text:'Один отчёт будет включать обе карточки: '+label(st)+'; '+label(other)+'.'}));
      if(peer)preview.append(el('p',{text:'Прежняя связь с «'+student(peer).name+'» будет снята.'}));
    }else preview.append(el('p',{text:'Связь будет снята. Отчёты снова будут отдельными.'}));
    preview.append(el('p',{text:'Ученики, занятия, цены, оплаты и комментарии останутся в исходных карточках. Связь можно снять в этом же окне.'}));
    prepared=sel.value;
  }
  function apply(){
    if(prepared===null){preview.textContent='Сначала нажмите «Проверить связь».';return;}
    if(original!==snapshot()||prepared!==sel.value){prepared=null;preview.textContent='Записи или выбор изменились. Откройте окно заново.';return;}
    if(!confirm.checked){preview.append(el('p',{text:'Подтвердите выбранное действие галочкой.'}));return;}
    if(dataUnreadable||readOnlyTab||pendingSave||storageBroken){preview.textContent='Сейчас запись недоступна. Сначала устраните проблему сохранения.';return;}
    S.reportPairs=(S.reportPairs||[]).filter(p=>!p.includes(sid));
    if(prepared)S.reportPairs.push([sid,prepared]);
    if(save('Связь карточек для отчёта: '+st.name)){dlg.close();toast('Связь для отчёта сохранена');}
    else{prepared=null;preview.textContent='Связь пока не сохранена. Следуйте сообщению о восстановлении записи.';}
  }
  dlg.textContent='';dlg.style.maxWidth='min(640px,96vw)';
  dlg.append(el('div',{class:'dlg-h'},el('h2',{id:'pickDlgT',text:'Карточки одного ученика'}),el('button',{class:'btn btn-ghost btn-sm','aria-label':'Закрыть',onclick:()=>dlg.close()},'✕')),
    el('div',{class:'dlg-b',style:'overflow-wrap:anywhere'},el('b',{text:label(st)}),
      el('p',{class:'meta',text:'Нужно только если один и тот же ученик раньше был заведён дважды. Одной карточки достаточно для индивидуальных и групповых занятий. Не связывайте разных детей, даже если у них один родитель или одинаковая фамилия.'}),
      el('label',{class:'field',for:'reportLinkPeer'},'Вторая карточка этого же ученика',sel),el('button',{class:'btn',onclick:prepare},'Проверить связь'),preview,
      el('label',{for:'reportLinkConfirm',style:'display:flex;gap:10px;margin-top:16px'},confirm,'Подтверждаю выбранное действие; при связывании это один и тот же ученик')),
    el('div',{class:'dlg-f'},el('button',{class:'btn',onclick:()=>dlg.close()},'Отмена'),el('button',{class:'btn btn-primary',onclick:apply},'Сохранить связь')));
  dlg.showModal();
}
function reportBlocks(st, month) {
  month=month||iso(new Date()).slice(0,7);
  const [y,m]=month.split('-').map(Number),data=reportData(st.id,month),B=[];
  B.push({k:'h',t:`Отчёт для родителей — ${st.name}, ${st.cls} класс`},{k:'sub',t:`${MONN[m-1]} ${y} · репетитор ${S.tutor} · составлен ${fmtDate(iso(new Date()))}`});
  if(data.conflicts.length){B.push({k:'b',t:'Отчёт требует проверки'},{k:'p',t:'Связанные карточки содержат неоднозначные записи. Итог не рассчитан. Проверьте записи или снимите связь карточек.'},...data.conflicts.map(t=>({k:'p',t})));return B;}
  const mine=data.mine,attended=mine.filter(e=>markOf(e.lesson,e.sid).s==='был');
  const missed=mine.filter(e=>markOf(e.lesson,e.sid).s==='пропуск').length,moved=mine.filter(e=>markOf(e.lesson,e.sid).s==='перенос').length;
  const short=[['Показатель','Значение'],['Состоялось занятий',attended.length],['Пропущено',missed]];
  if(moved)short.push(['Перенесено',moved]);
  const checks=['сделана','ошибки','частично','нет'].map(s=>({s,n:mine.filter(e=>homeworkCheckFor(e.lesson,e.sid)?.s===s).length})).filter(x=>x.n);
  if(checks.length)short.push(['Домашняя работа',checks.map(x=>HW_LABEL[x.s]+' '+x.n).join(', ')]);
  short.push(['Часов занятий (60 минут)',num2(attended.reduce((n,e)=>n+e.lesson.duration,0)/60)],['Начислено за месяц',cash(data.charged)],['Оплачено за месяц',cash(data.paid)],['Общий баланс по всем записям',data.balance<0?'Долг '+cash(-data.balance):data.balance>0?'Аванс '+cash(data.balance):'Расчёты закрыты']);
  B.push({k:'b',t:'Коротко за месяц'},{k:'table',widths:[3400,5200],rows:short});
  B.push({k:'b',t:'Занятия и начисления по форматам'},{k:'table',widths:[2200,1300,1600,1700,1800],rows:[['Формат','Посещено','Часов (60 мин)','С начислением','Начислено'],...data.formats.map(f=>[f.label,f.attended,num2(f.minutes/60),f.billed,cash(f.charged)]),['Всего',attended.length,num2(attended.reduce((n,e)=>n+e.lesson.duration,0)/60),data.formats.reduce((n,f)=>n+f.billed,0),cash(data.charged)]]},
    {k:'note',t:'Пропуски с начислением включены в стоимость, но не в часы посещения. Оплаты показаны общей суммой без распределения по форматам. Общий баланс учитывает все записи, а не только этот месяц.'});
  if(data.ids.length>1)B.push({k:'note',t:'Отчёт по двум связанным карточкам: '+data.ids.map(id=>student(id).name).join(' / ')+'. Исходные записи сохранены отдельно.'});
  if(mine.length){
    B.push({k:'b',t:'Занятия месяца'},{k:'table',widths:[1400,1800,2200,1800,1400],rows:[['Дата и формат','Тема','Что делали и как получилось','Домашнее задание','Начислено'],...mine.map(({lesson:l,sid})=>{
      const mark=markOf(l,sid),check=homeworkCheckFor(l,sid);
      const hw=check?.s?'Домашняя работа: '+HW_LABEL[check.s]+(check.note?' — '+check.note:'')+'. ':'';
      return [fmtDate(l.date)+' '+l.time+' · '+(l.ownerType==='group'?'групповое':'индивидуальное')+(mark.s!=='был'?' · '+(MARK_LABEL[mark.s]||mark.s)+(mark.reason?': '+mark.reason:''):''),lessonTitle(l),(hw+resultFor(l,sid)).trim()||'—',homeworkFor(l,sid)||'—',cash(mark.ch?rateFor(l,sid):0)];
    })]});
    const topics=[...new Set(attended.map(e=>e.lesson.topicId).filter(Boolean))].map(id=>topic(id)).filter(Boolean);
    if(topics.length)B.push({k:'b',t:'Темы проведённых занятий'},...topics.map(t=>({k:'li',t:t.title})));
    const owners=new Map();
    data.ids.map(student).filter(Boolean).forEach(s=>{owners.set('student:'+s.id,['student',s.id]);if(s.groupId&&group(s.groupId))owners.set('group:'+s.groupId,['group',s.groupId]);});
    const ahead=[...new Map([...owners.values()].flatMap(([type,id])=>upcomingTopics(type,id,3)).map(t=>[t.id,t])).values()];
    if(ahead.length)B.push({k:'b',t:'Что впереди по плану'},...ahead.map(t=>({k:'li',t:t.title})));
  }else B.push({k:'p',t:data.inMonth.length?'Занятия пока не отмечены — после отметки они появятся в отчёте.':'За этот месяц нет прошедших занятий.'});
  for(const id of data.ids){const note=(S.reportNotes||{})[id+':'+month];if(note)B.push({k:'b',t:'Комментарий репетитора'+(data.ids.length>1?' · '+student(id).name:'')},{k:'p',t:note});}
  if(data.unmarked)B.push({k:'note',t:`Не отмечено занятий этого месяца: ${data.unmarked} — в отчёт они не вошли.`});
  B.push({k:'note',t:`Вопросы по отчёту — репетитор ${S.tutor}.`});return B;
}
