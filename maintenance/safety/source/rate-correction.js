/* Explicit, selected historical correction. No migration or automatic repricing. */
function rateCorrectionRows(sid, from, to) {
  const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&iso(parseISO(v))===v;
  if(!student(sid)||!validDate(from)||!validDate(to)||from>to)return null;
  return lessonsOfStudent(sid).filter(l=>lessonOk(l)&&lessonOver(l)&&l.date>=from&&l.date<=to&&markOf(l,sid)?.ch)
    .map(l=>({id:l.id,date:l.date,time:l.time,format:l.ownerType==='group'?'Групповое':'Индивидуальное',before:rateFor(l,sid),after:Number(liveRate(l,sid)),available:l.ownerType!=='group'||!!group(l.ownerId)||personalGroupRate(student(sid),l.ownerId)!==null}))
    .filter(r=>Number.isFinite(r.before)&&r.before>=0&&Number.isFinite(r.after)&&r.after>=0)
    .sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
}
function editPastRates(sid) {
  const st=student(sid);if(!st)return;
  const dlg=$('#pickDlg'),now=new Date();
  const from=el('input',{id:'ratesFrom',type:'date',value:iso(new Date(now.getFullYear(),now.getMonth(),1))});
  const to=el('input',{id:'ratesTo',type:'date',value:iso(now)});
  const list=el('div',{id:'ratesList'}),preview=el('div',{id:'ratesPreview','aria-live':'polite'});
  const confirm=el('input',{id:'ratesConfirm',type:'checkbox'});
  let rows=[],boxes=[],listedSnapshot=null,prepared=null;
  const invalidatePreview=()=>{prepared=null;confirm.checked=false;preview.textContent='';};
  const invalidate=()=>{invalidatePreview();listedSnapshot=null;rows=[];boxes=[];list.textContent='Период изменён. Нажмите «Показать занятия».';};
  [from,to].forEach(n=>{n.addEventListener('input',invalidate);n.addEventListener('change',invalidate);});
  function show(){
    invalidatePreview();list.textContent='';rows=rateCorrectionRows(sid,from.value,to.value);boxes=[];listedSnapshot=null;
    if(!rows){list.textContent='Укажите правильный период: начало не позже окончания.';return;}
    listedSnapshot=snapshot();
    if(!rows.length){list.textContent='За этот период нет прошедших занятий с начислением для этого ученика.';return;}
    rows.forEach(r=>{
      const box=el('input',{type:'checkbox','aria-label':'Выбрать занятие '+r.date+' '+r.time,'data-lesson-id':r.id,disabled:!r.available||r.before===r.after});
      box.addEventListener('change',invalidatePreview);boxes.push(box);
      list.append(el('label',{class:'card',style:'display:flex;gap:10px;align-items:flex-start;margin:8px 0;padding:12px;overflow-wrap:anywhere'},box,
        el('span',{},el('b',{text:fmtDate(r.date)+' · '+r.time+' · '+r.format}),el('div',{text:r.available?cash(r.before)+' → '+cash(r.after)+(r.before===r.after?' · цена уже совпадает':''):cash(r.before)+' · нет текущей цены: группа удалена'}))));
    });
  }
  function prepare(){
    invalidatePreview();
    if(listedSnapshot!==snapshot()){preview.textContent='Записи изменились или список ещё не получен. Нажмите «Показать занятия».';return;}
    const selected=rows.filter((r,i)=>boxes[i].checked&&r.available&&r.before!==r.after);
    if(!selected.length){preview.textContent='Выберите занятия с изменением цены.';return;}
    prepared={snapshot:snapshot(),from:from.value,to:to.value,ids:selected.map(r=>r.id),rows:selected};
    const before=selected.reduce((n,r)=>n+r.before,0),after=selected.reduce((n,r)=>n+r.after,0);
    preview.append(el('b',{text:st.name+': выбрано занятий — '+selected.length}),
      ...selected.map(r=>el('div',{text:fmtDate(r.date)+' '+r.time+' · '+r.format+': '+cash(r.before)+' → '+cash(r.after)})),
      el('p',{text:'Начислено по выбранным занятиям: '+cash(before)+' → '+cash(after)+'. Изменение: '+cash(after-before)+'.'}));
  }
  function apply(){
    if(!prepared){preview.textContent='Сначала нажмите «Проверить изменения».';return;}
    const selected=rows.filter((r,i)=>boxes[i].checked&&r.available&&r.before!==r.after).map(r=>r.id);
    if(prepared.snapshot!==snapshot()||prepared.from!==from.value||prepared.to!==to.value||JSON.stringify(selected)!==JSON.stringify(prepared.ids)){
      invalidatePreview();listedSnapshot=null;preview.textContent='Записи или выбор изменились. Получите список и проверьте изменения заново.';return;
    }
    if(!confirm.checked){preview.append(el('div',{text:'Подтвердите проверку выбранных начислений галочкой ниже.'}));return;}
    if(dataUnreadable||readOnlyTab||pendingSave||storageBroken){preview.textContent='Сейчас запись недоступна. Сначала устраните проблему сохранения.';return;}
    // Replace the exact saved rate, never add a discount or change another participant.
    prepared.rows.forEach(r=>{const l=S.lessons.find(l=>l.id===r.id);l.rates={...(l.rates||{}),[sid]:r.after};});
    const count=prepared.rows.length;
    if(save('Коррекция начислений: '+st.name+' · '+count+' занятий')){dlg.close();toast('Начисления исправлены: '+count);}
    else{invalidatePreview();listedSnapshot=null;preview.textContent='Изменения пока не сохранены. Следуйте сообщению о восстановлении записи.';}
  }
  dlg.textContent='';dlg.style.maxWidth='min(680px,96vw)';
  dlg.append(el('div',{class:'dlg-h'},el('h2',{id:'pickDlgT',text:'Исправить прошлые начисления'}),el('button',{class:'btn btn-ghost btn-sm','aria-label':'Закрыть',onclick:()=>dlg.close()},'✕')),
    el('div',{class:'dlg-b',style:'overflow-wrap:anywhere'},el('b',{text:st.name}),
      el('p',{class:'meta',text:'Выберите занятия, которые нужно пересчитать по текущим ценам ученика: отдельно для индивидуальных занятий и каждой группы. Сначала задайте нужные цены в карточке ученика или группы. Здесь меняется только начисление; оплаты, посещаемость и учебные записи сохраняются. Пропуски без начисления и будущие занятия не пересчитываются.'}),
      el('label',{for:'ratesFrom',class:'field'},'С даты',from),el('label',{for:'ratesTo',class:'field'},'По дату включительно',to),
      el('button',{class:'btn',onclick:show},'Показать занятия'),list,
      el('button',{class:'btn',onclick:prepare},'Проверить изменения'),preview,
      el('label',{for:'ratesConfirm',style:'display:flex;gap:10px;margin-top:16px'},confirm,'Я проверила выбранные занятия и новые суммы')),
    el('div',{class:'dlg-f'},el('button',{class:'btn',onclick:()=>dlg.close()},'Отмена'),el('button',{class:'btn btn-primary',onclick:apply},'Применить пересчёт')));
  dlg.showModal();
}
