# Changes are scoped to lesson forms. Existing storage keys and data stay intact.
change("function draftAttach(key, nodes) {", "function draftAttach(key, nodes, extras = null) {")
change("JSON.stringify({at: Date.now(), d})", "JSON.stringify({at: Date.now(), d, ...(extras ? {extras:extras()} : {})})")
change("  const marks = JSON.parse(JSON.stringify(draft.marks || {}));", """  let savedExtras = {};
  try { savedExtras = JSON.parse(localStorage.getItem(DKEY('lesson:' + draft.id)) || '{}').extras || {}; } catch {}
  const marks = JSON.parse(JSON.stringify(savedExtras.marks || draft.marks || {}));""")
change('JSON.stringify(draft.hwChecks || {})', 'JSON.stringify(savedExtras.hwChecks || draft.hwChecks || {})')
change('JSON.stringify(draft.hwSolution || {})', 'JSON.stringify(savedExtras.solution || draft.hwSolution || {})')
change('JSON.stringify(draft.per || {})', 'JSON.stringify(savedExtras.perData || draft.per || {})')
change("  const hwCheck = { s: (draft.hwCheck", "  const restoredCheck = savedExtras.hwCheck || draft.hwCheck;\n  const hwCheck = { s: (restoredCheck")
change("&& draft.hwCheck.s) || null, note: (draft.hwCheck && draft.hwCheck.note)", "&& restoredCheck.s) || null, note: (restoredCheck && restoredCheck.note)")
change('[ownerSel, topicSel, dateIn, timeIn, durSel, planIn, noteIn, resIn, hwIn, tellIn, restIn]);', '[ownerSel, topicSel, dateIn, timeIn, durSel, planIn, noteIn, resIn, hwIn, tellIn, restIn],\n    () => ({solution, hwChecks, perData, marks, hwCheck}));\n  body.addEventListener(\'input\', lessonDraft.write);\n  body.addEventListener(\'change\', lessonDraft.write);')
change('fillMethod(); renderAfter();\n      draftNoteBox', 'fillMethod(); renderAfter(); renderPer(); renderHw();\n      draftNoteBox')
change("    saving = true;\n    const clash", "    lessonDraft.write();\n    const clash")
change("    const idx = S.lessons.findIndex(x => x.id === draft.id);\n    if (idx >= 0) S.lessons[idx] = data; else S.lessons.push(data);\n    dlg.close(); lessonDraft.clear(); save(isNew ? 'Добавлено занятие' : 'Изменено занятие'); toast(isNew ? 'Занятие добавлено' : 'Карточка сохранена');", """    const previous = S;
    S = JSON.parse(JSON.stringify(S));
    const idx = S.lessons.findIndex(x => x.id === draft.id);
    if (idx >= 0) S.lessons[idx] = data; else S.lessons.push(data);
    if (!persist(true)) {
      S = previous;
      warn.textContent = 'Занятие не сохранено. Форма оставлена открытой. ' +
        (readOnlyTab ? 'Данные изменены в другом окне; не закрывайте эту карточку.' : safeStatus || 'Запись сейчас недоступна.');
      toast('Занятие не сохранено');
      return;
    }
    if (lastSnap) {
      hist.push({label:isNew ? 'Добавлено занятие' : 'Изменено занятие', at:nowHM(), snap:lastSnap});
      if (hist.length > 20) hist.shift();
      redo = [];
    }
    lastSnap = snapshot(); bumpChanges(); autoSaveSoon();
    saving = true; dlg.close(); lessonDraft.clear(); render();
    toast(isNew ? 'Занятие добавлено' : 'Карточка сохранена');""")

change("  let formWas = '';", "  const lessonRawAtOpen = localStorage.getItem(KEY);\n  let formWas = '';")
change("    const previous = S;", """    if (localStorage.getItem(KEY) !== lessonRawAtOpen) {
      warn.textContent = 'Занятие не сохранено: данные изменились после открытия карточки. Ваш ввод оставлен в форме и черновике.';
      toast('Занятие не сохранено'); return;
    }
    const previous = S;""")
change("  formWas = snapForm();\n  dlg.showModal();", """  formWas = snapForm();
  const keepLesson = e => { if (dirty() || homeworkUploads) { lessonDraft.write(); e.preventDefault(); e.returnValue=''; } };
  window.addEventListener('beforeunload', keepLesson);
  dlg.addEventListener('close', () => window.removeEventListener('beforeunload', keepLesson), {once:true});
  dlg.showModal();""")

change("const clear = () => { try { localStorage.removeItem(DKEY(key));", "const clear = () => { clearTimeout(t); try { localStorage.removeItem(DKEY(key));")
