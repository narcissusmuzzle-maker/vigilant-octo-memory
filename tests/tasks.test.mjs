import assert from 'node:assert'
import * as T from '../shared/tasks.js'
import * as lay from '../shared/layout.js'

let n = 0
function t(name, f) { f(); n++; console.log('ok  ' + name) }
const mk = (i, x) => ({ i: i, e: 0, x: x || 'з' + i, c: [0, 1, 2] })
const many = (k) => Array.from({ length: k }, (_, j) => mk('t' + j))

t('cleanTasks: эмодзи вкладки, уровни цветов, мусор отбрасывается, большие буквы — маленькими', () => {
  const l = T.cleanTasks([{ i: 1, e: '🧬', x: ' Текст\n ', c: [2, 1, 0] }, null, { e: '🏠' }, { i: 'b', e: '🦄', x: 'x', c: [9, -1, 'a'] }])
  assert.equal(l.length, 2)
  assert.deepEqual(l[0], { i: '1', e: 4, x: 'текст', c: [2, 1, 0] })
  assert.equal(l[1].e, -1)                    // незнакомое эмодзи вкладки — места под него на часах нет
  assert.deepEqual(l[1].c, [0, 0, 0])
  assert.equal(T.cleanTasks('не список').length, 0)
  assert.equal(T.cleanTasks(many(100).map((x) => ({ i: x.i, e: '🏠', x: x.x, c: x.c }))).length, T.MAX_TASKS)
})

t('все девять эмодзи вкладок распознаются (с вариативным селектором тоже)', () => {
  for (let k = 0; k < T.EMOJI.length; k++) assert.equal(T.emojiIndex(T.EMOJI[k]), k)
  assert.equal(T.emojiIndex('🏠\uFE0F'), 0)
  assert.equal(T.emojiIndex(''), -1)
  assert.equal(T.emojiIndex('📦'), -1)          // 📦 в наборе нет
})

t('сегменты полоски: сверху вниз — срочность, сложность, важность (строка повёрнута против часовой)', () => {
  assert.deepEqual(T.segLevels({ c: [0, 1, 2] }), [2, 1, 0])
})

t('текст короткий — крупный шрифт 30, буквы стоят снизу вверх без наложений', () => {
  const s = lay.textSpan()
  const p = T.placeText('найти электрика', s.len, s.bottom)
  assert.equal(p.size, 30)
  assert.equal(p.glyphs.length, 14)           // пробел картинки не имеет
  for (let k = 1; k < p.glyphs.length; k++) assert.ok(p.glyphs[k].y < p.glyphs[k - 1].y)
  assert.ok(p.glyphs[0].y + p.glyphs[0].h <= s.bottom + 2)
  assert.ok(p.glyphs[p.glyphs.length - 1].y >= s.top - 2)
  assert.equal(p.glyphs[0].file, 'g30_43d.png')   // «н»
})

t('шрифт один для всех (30); длинный текст не уменьшается, а обрезается тремя точками', () => {
  const s = lay.textSpan()
  const mid = T.placeText('очень длинное название задачи на две строки', s.len, s.bottom)
  assert.equal(mid.size, 30)
  assert.ok(mid.len <= s.len)
  assert.equal(mid.glyphs[mid.glyphs.length - 1].file, 'g30_2e.png')
  assert.equal(T.placeText('индекс 100 элементов', s.len, s.bottom).glyphs.length, 18)   // помещается целиком, без точек
})

t('большие буквы переводятся в маленькие, буквы вне набора (чужие эмодзи, «», №) пропускаются, пробелы остаются', () => {
  const s = lay.textSpan()
  const a = T.placeText('а б', s.len, s.bottom), b = T.placeText('а 🦄 б', s.len, s.bottom)
  assert.equal(a.glyphs.length, 2)
  assert.equal(b.glyphs.length, 2)
  assert.ok(b.len > a.len)                    // пробелы вокруг пропущенного эмодзи остались
  assert.equal(T.placeText('', s.len, s.bottom).glyphs.length, 0)
})

t('все картинки букв, которые использует текст, существуют', async () => {
  const fs = await import('node:fs')
  const s = lay.textSpan()
  const p = T.placeText('Съешь ещё этих мягких французских булок, да выпей чаю! 1 (abc xyz) 0-9 + : ?', s.len, s.bottom)
  for (const g of p.glyphs) assert.ok(fs.existsSync('assets/default.w432-s/' + g.file), g.file)
})

t('прокрутка: сдвиг на 3, границы, мало задач — без прокрутки', () => {
  assert.equal(T.maxOffset(4), 0)
  assert.equal(T.maxOffset(6), 0)
  assert.equal(T.maxOffset(7), 1)
  assert.equal(T.scrolled(0, 1, 20), 3)
  assert.equal(T.scrolled(3, -1, 20), 0)
  assert.equal(T.scrolled(0, -1, 20), 0)
  assert.equal(T.scrolled(12, 1, 20), 14)     // 20 − 6
  assert.equal(T.scrolled(0, 1, 5), 0)
})

t('выполнение: задача уходит из показа сразу, событие ждёт подтверждения, повторно не создаётся', () => {
  const st = T.newState(); st.tasks = many(8)
  const id = T.complete(st, 't2', 1000)
  assert.ok(id)
  assert.equal(T.shownTasks(st).length, 7)
  assert.equal(T.complete(st, 't2', 1001), '')
  assert.equal(T.complete(st, 'нет такой', 1002), '')
  assert.equal(T.due(st, 1000, 15000).length, 1)
  st.pend[0].tried = 1000
  assert.equal(T.due(st, 5000, 15000).length, 0)
  assert.equal(T.due(st, 16000, 15000).length, 1)
  // телефон ещё не знает и снова прислал t2 — на экране её нет
  assert.equal(T.applyTasks(st, T.cleanTasks(many(8).map((x) => ({ i: x.i, e: '🏠', x: x.x, c: x.c })))), false)
  assert.equal(T.shownTasks(st).length, 7)
  assert.ok(T.ack(st, id))
  assert.equal(st.pend.length, 0)
  assert.equal(T.ack(st, id), false)
  assert.equal(st.tasks.some((x) => x.i === 't2'), false)
})

t('после выполнения сдвиг списка не уходит за конец', () => {
  const st = T.newState(); st.tasks = many(9); st.off = 3
  T.complete(st, 't8', 1)                     // осталось 8: дальше второго сдвига нельзя
  assert.equal(st.off, 2)
  T.complete(st, 't7', 2)                     // осталось 7
  assert.equal(st.off, 1)
})

t('хранение: сохранённое состояние восстанавливается, мусор — пустое состояние', () => {
  const st = T.newState(); st.tasks = T.cleanTasks([{ i: 'a', e: '🧬', x: 'икс', c: [1, 2, 0] }]); st.off = 2
  T.complete(st, 'a', 5)
  const back = T.restore(T.serialize(st))
  assert.equal(back.tasks[0].e, 4)
  assert.equal(back.pend.length, 1)
  assert.equal(back.pend[0].tid, 'a')
  assert.equal(T.restore('{{{').tasks.length, 0)
  assert.equal(T.restore('').pend.length, 0)
})

console.log('\nвсего: ' + n)
