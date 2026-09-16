# Read-only upcoming route projection; no storage writes or migrations.
old='/* Темы ближайших занятий — то, что впереди */\nfunction upcomingTopics(type, id, n) {\n  const today = iso(new Date()); const seen = new Set();\n  return S.lessons\n    .filter(l => l.ownerType === type && l.ownerId === id && l.topicId && !isMarked(l) && l.date >= today)\n    .sort((a, b) => (a.date + a.time) < (b.date + b.time) ? -1 : 1)\n    .map(l => l.topicId).filter(t => !seen.has(t) && seen.add(t)).slice(0, n || 3).map(t => topic(t)).filter(Boolean);\n}\n'
new='/* Следующие непройденные темы маршрута; без маршрута — темы расписания. */\nfunction upcomingTopics(type, id, n, sid) {\n  const route = routeOf(type, id);\n  const seen = new Set();\n  if (route) {\n    const passed = new Set(passedTopics(type, id, sid).map(t => t.id));\n    return (route.topicIds || []).filter(tid => !passed.has(tid) && !seen.has(tid) && seen.add(tid))\n      .map(tid => topic(tid)).filter(Boolean).slice(0, n || 3);\n  }\n  const today = iso(new Date());\n  return S.lessons\n    .filter(l => l.ownerType === type && l.ownerId === id && l.topicId && !isMarked(l) && l.date >= today)\n    .sort((a, b) => (a.date + a.time) < (b.date + b.time) ? -1 : 1)\n    .map(l => l.topicId).filter(t => !seen.has(t) && seen.add(t)).map(t => topic(t)).filter(Boolean).slice(0, n || 3);\n}\n'
if s.count(old)!=1: raise ValueError("Upcoming route build anchor changed")
s=s.replace(old,new)
old='upcomingTopics(pType, pId, 3);'
new='upcomingTopics(pType, pId, 3, isG ? null : id);'
if s.count(old)!=1: raise ValueError("Upcoming route build anchor changed")
s=s.replace(old,new)
old='16 сентября 2026 · расписание 1.5'
new='16 сентября 2026 · маршрут 1.6'
if s.count(old)!=1: raise ValueError("Upcoming route build anchor changed")
s=s.replace(old,new)
old='/* Темы, которые ученик или группа уже прошли: по отмеченным занятиям.\n   Маршрутов как шага больше нет — тема выбирается в карточке занятия. */'
new='/* Пройденные темы: по посещённым занятиям, для ученика — по его отметкам. */'
if s.count(old)!=1: raise ValueError("Upcoming route build anchor changed")
s=s.replace(old,new)
