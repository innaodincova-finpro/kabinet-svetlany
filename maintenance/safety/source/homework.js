let homeworkUploads = 0;
function homeworkSolutionFor(l, sid) {
  const personal = l.per?.[sid];
  // A different assignment must never display the answer to the shared one.
  return personal?.homework ? personal.hwSolution : l.hwSolution;
}
function homeworkCheckFor(l, sid) {
  // Legacy group checks remain stored, but cannot describe an individual child.
  return l.hwChecks?.[sid] || (l.ownerType === 'student' ? l.hwCheck : null);
}
function homeworkSolutionView(solution) {
  if (!solution || (!solution.text && !solution.fileId)) return el('div',{class:'meta',text:'Решение к этому ДЗ пока не сохранено.'});
  return el('details',{}, el('summary',{text:'Решение ДЗ'}),
    solution.text ? el('div',{style:'white-space:pre-wrap;margin:12px 0',text:solution.text}) : null,
    solution.fileId ? el('button',{type:'button',class:'btn',onclick:()=>openMaterialFile(solution)},'Открыть PDF решения') : null);
}
function homeworkSolutionEditor(solution) {
  const text = el('textarea',{placeholder:'Учебник, страницы, номера заданий; решения и ответы',oninput:e=>solution.text=e.target.value});
  text.value=solution.text || '';
  const status=el('div',{class:'meta',text:solution.fileName || 'PDF не прикреплён'});
  const input=el('input',{type:'file',accept:'application/pdf,.pdf',onchange:async e=>{
    const f=e.target.files?.[0]; if(!f)return;
    if(f.size>25*1024*1024){toast('Выберите PDF до 25 МБ');return;}
    homeworkUploads++;input.disabled=true;status.textContent='Сохраняем PDF…';
    try {
      if(!((await f.slice(0,5).text()).startsWith('%PDF-')))throw Error('Выбранный файл не является PDF');
      // Materialize bytes before the transaction: avoid a temporary File backing path.
      const storedPdf=new Blob([await f.arrayBuffer()],{type:'application/pdf'});
      const fileId='hw-'+crypto.randomUUID();await putFile(fileId,storedPdf);
      Object.assign(solution,{fileId,fileName:f.name,title:'Решение ДЗ',size:f.size});status.textContent=f.name;
    }catch(err){status.textContent='PDF не добавлен: '+err.message;}
    finally{homeworkUploads--;input.disabled=false;input.value='';}
  }});
  return el('details',{},el('summary',{text:'Подготовить решение этого ДЗ'}),
    el('div',{class:'meta',text:'Для следующей проверки. Вставьте проверенное решение или прикрепите PDF, затем сохраните занятие.'}),text,input,status);
}
