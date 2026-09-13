/* Explicit recurring-rule editor. Existing lessons move only after preview. */
function standingPlan(type, id, oldSlot, nextSlot, from, lessons = S.lessons) {
  const changes = [], conflicts = [];
  const now = new Date(), today = iso(now), nowMinutes = now.getHours()*60+now.getMinutes();
  for (const l of lessons) {
    if (l.ownerType !== type || l.ownerId !== id || !l.auto || l.done || isMarked(l) || l.date < from || l.date < today) continue;
    if (l.date === today && toMin(l.time) <= nowMinutes) continue;
    if ((parseISO(l.date).getDay()+6)%7 !== oldSlot.dow || l.time !== oldSlot.time) continue;
    const date = iso(addDays(parseISO(l.date), nextSlot.dow-oldSlot.dow));
    if (date < from || date < today || (date === today && toMin(nextSlot.time) <= nowMinutes)) {
      conflicts.push(`${fmtDate(l.date)}: новая дата или время раньше начала переноса`); continue;
    }
    if (toMin(nextSlot.time)+Number(l.duration)>1440) {
      conflicts.push(`${fmtDate(date)}: занятие заканчивается после полуночи`); continue;
    }
    changes.push({id:l.id, beforeDate:l.date, beforeTime:l.time, date, time:nextSlot.time, duration:l.duration});
  }
  const moving = new Set(changes.map(c=>c.id));
  const fixed = lessons.filter(l=>!moving.has(l.id));
  changes.forEach((c,i)=>{
    const other = [...fixed,...changes.slice(0,i)].find(l=>l.date===c.date && toMin(c.time)<toMin(l.time)+Number(l.duration) && toMin(l.time)<toMin(c.time)+Number(c.duration));
    if (other) conflicts.push(`${fmtDate(c.date)} ${c.time}: пересечение с занятием в ${other.time}`);
  });
  return {changes,conflicts};
}
function editStandingSlot(type,id,o,oldSlot=null) {
  const dlg=$('#pickDlg'), original=JSON.stringify(slotsOf(o));
  const originalIndex=oldSlot ? slotsOf(o).indexOf(oldSlot) : -1;
  const dow=el('select',{id:'standingDay'},...DOW.map((name,i)=>el('option',{value:i,selected:i===(oldSlot?.dow??0)},name)));
  const time=el('input',{id:'standingTime',type:'time',step:60,value:oldSlot?.time||'15:00'});
  const scope=el('select',{id:'standingScope'},el('option',{value:'rule'},'Только постоянное расписание'),el('option',{value:'future'},'Также перенести будущие занятия'));
  const from=el('input',{id:'standingFrom',type:'date',value:iso(new Date()),min:iso(new Date())});
  const note=el('div',{class:'meta',text:'Укажите время точно, например 15:30. Рабочие часы календаря не ограничивают ввод.'});
  const preview=el('div',{id:'standingPreview','aria-live':'polite',style:'overflow-wrap:anywhere'});
  let prepared=null;
  const invalidate=()=>{prepared=null;preview.textContent='';};
  [dow,time,scope,from].forEach(n=>{n.addEventListener('input',invalidate);n.addEventListener('change',invalidate);});
  function prepare(){
    prepared=null;preview.textContent='';
    const next={dow:Number(dow.value),time:time.value};
    if(!Number.isInteger(next.dow)||next.dow<0||next.dow>6||!/^([01]\d|2[0-3]):[0-5]\d$/.test(next.time)) {preview.textContent='Укажите день недели и время в формате ЧЧ:ММ.';return;}
    if(toMin(next.time)+Number(o.duration)>1440){preview.textContent='Занятие должно закончиться до полуночи.';return;}
    if(JSON.stringify(slotsOf(o))!==original || (oldSlot && originalIndex<0)){preview.textContent='Расписание изменилось. Закройте окно и откройте его снова.';return;}
    if(slotsOf(o).some((s,i)=>i!==originalIndex && s.dow===next.dow && toMin(next.time)<toMin(s.time)+Number(o.duration) && toMin(s.time)<toMin(next.time)+Number(o.duration))){preview.textContent='Этот день и время пересекаются с другим постоянным занятием.';return;}
    if(oldSlot && oldSlot.dow===next.dow && oldSlot.time===next.time){preview.textContent='День и время не изменились.';return;}
    let plan={changes:[],conflicts:[]};
    if(oldSlot && scope.value==='future'){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(from.value)||iso(parseISO(from.value))!==from.value||from.value<iso(new Date())){preview.textContent='Выберите сегодняшнюю или будущую дату.';return;}
      plan=standingPlan(type,id,oldSlot,next,from.value);
    }
    preview.append(el('div',{text:(oldSlot?slotLabel(oldSlot)+' → ':'')+slotLabel(next)}));
    if(plan.conflicts.length){preview.append(el('div',{text:'Изменения не применены. Устраните пересечения или выберите другое время.'}),...plan.conflicts.map(t=>el('div',{class:'meta',text:t})));return;}
    preview.append(el('div',{text:plan.changes.length?`Будет перенесено занятий: ${plan.changes.length}.`:'Уже созданные занятия останутся на своих датах и времени.'}));
    if(plan.changes.length)preview.append(el('details',{},el('summary',{text:'Посмотреть все переносы'}),...plan.changes.map(c=>el('div',{class:'meta',text:`${fmtDate(c.beforeDate)} ${c.beforeTime} → ${fmtDate(c.date)} ${c.time}`}))));
    prepared={next,plan,snapshot:snapshot()};
  }
  function apply(){
    if(!prepared){prepare();if(prepared)preview.append(el('div',{class:'meta',text:'Проверьте результат и нажмите «Сохранить» ещё раз.'}));return;}
    if(prepared.snapshot!==snapshot()){invalidate();preview.textContent='Записи изменились. Нажмите «Проверить изменения» ещё раз.';return;}
    if(dataUnreadable||readOnlyTab||pendingSave){preview.textContent='Сейчас запись недоступна. Сначала устраните проблему сохранения.';return;}
    const {next,plan}=prepared;
    o.slots=oldSlot?slotsOf(o).map((s,i)=>i===originalIndex?next:s):[...slotsOf(o),next];
    const changes=new Map(plan.changes.map(c=>[c.id,c]));
    S.lessons.forEach(l=>{const c=changes.get(l.id);if(c){l.date=c.date;l.time=c.time;}});
    if(save('Постоянное расписание: '+slotLabel(next))){dlg.close();toast('Сохранено: '+slotLabel(next)+(plan.changes.length?` · перенесено ${plan.changes.length}`:''));}
    else {prepared=null;preview.textContent='Изменения пока не сохранены. Следуйте сообщению о восстановлении записи.';}
  }
  dlg.textContent='';dlg.style.maxWidth='min(620px,96vw)';
  dlg.append(el('div',{class:'dlg-h'},el('h2',{id:'pickDlgT',text:oldSlot?'Изменить постоянный день':'Добавить постоянный день'}),el('button',{class:'btn btn-ghost btn-sm',onclick:()=>dlg.close(),'aria-label':'Закрыть'},'✕')),
    el('div',{class:'dlg-b'},el('label',{for:'standingDay'},'День недели',dow),el('label',{for:'standingTime'},'Время начала',time),note,
      oldSlot?el('label',{for:'standingScope'},'Что изменить',scope):null,
      oldSlot?el('label',{for:'standingFrom'},'Переносить занятия начиная с',from):null,
      oldSlot?el('div',{class:'meta',text:'Перенос затронет только автоматически расставленные занятия с прежним днём и временем. Проведённые, отмеченные и отдельно перенесённые занятия сохранятся. Новый день выбирается в той же неделе.'}):null,
      el('button',{class:'btn',onclick:prepare},'Проверить изменения'),preview),
    el('div',{class:'dlg-f'},el('button',{class:'btn',onclick:()=>dlg.close()},'Отмена'),el('button',{class:'btn btn-primary',onclick:apply},'Сохранить')));
  dlg.showModal();
}
