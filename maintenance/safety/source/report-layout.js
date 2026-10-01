// One block model for the screen, text, Word and isolated printable document.
function reportMarkup(blocks) {
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return blocks.map((b,i)=>{
    if(b.k==='table')return '<div class="report-table"><table><thead><tr>'+b.rows[0].map(t=>'<th scope="col">'+escape(t)+'</th>').join('')+'</tr></thead><tbody>'+b.rows.slice(1).map(row=>'<tr'+(row[0]==='Всего'?' class="report-total"':'')+'>'+row.map(t=>'<td>'+escape(t)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
    const tag=b.k==='h'?'h1':b.k==='b'?'h2':'p';
    return '<'+tag+' class="report-'+escape(b.k)+'">'+(b.k==='li'?'• ':'')+escape(b.t)+'</'+tag+'>';
  }).join('');
}
function reportView(blocks) {
  const view=el('article',{class:'report report-sheet','aria-label':'Отчёт для родителей'});
  view.innerHTML=reportMarkup(blocks);return view;
}
function reportPrintDocument(st,month) {
  // All user text is escaped by reportMarkup; no private notes or other pupils added here.
  return '<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Отчёт для родителей</title><style>'+REPORT_STYLE+'</style></head><body class="report-print"><div class="print-controls"><button id="printReport">Печать / сохранить PDF</button><p>В окне печати выберите «Сохранить как PDF». Формат A4; отключите колонтитулы браузера.</p></div><article class="report report-sheet">'+reportMarkup(reportBlocks(st,month))+'</article></body></html>';
}
function printParentReport(st,month) {
  const w=window.open('','_blank');
  if(!w){toast('Разрешите открытие окна отчёта в браузере и повторите.');return;}
  w.document.open();w.document.write(reportPrintDocument(st,month));w.document.close();
  const btn=w.document.getElementById('printReport');btn.disabled=true;btn.textContent='Подготовка шрифта…';
  w.document.fonts.ready.then(()=>{if(w.closed)return;btn.disabled=false;btn.textContent='Печать / сохранить PDF';btn.onclick=()=>{w.focus();w.print();};}).catch(()=>{btn.textContent='Не удалось подготовить шрифт. Откройте отчёт заново.';});
}
