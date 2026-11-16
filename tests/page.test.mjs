// Прогон настоящего page/index.js на заглушках API часов: экран, прокрутка, долгое нажатие, отправка на телефон.
// Запуск: node --import ./tests/register.mjs tests/page.test.mjs   (из папки приложения)
import assert from 'node:assert'
import fs from 'node:fs'

let n = 0
async function t(name, f) { await f(); n++; console.log('ok  ' + name) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const alive = () => globalThis.__W.filter((w) => w.alive)
const buttons = () => alive().filter((w) => w.type === 'BUTTON')
const DY = -31

// «телефон»: очередь задач и журнал полученных событий
const phone = { q: [], got: [], online: true }
function task(i, e, x, c) { return { i: i, e: e, x: x, c: c } }
phone.q = [
  task('a', '🏠', 'найти электрика', [0, 0, 2]),
  task('b', '🧬', 'индекс 100 элементов', [2, 1, 0]),
  task('c', '🩸', 'запись текучки', [2, 0, 0]),
  task('d', '🏠', 'греча!', [0, 0, 1]),
  task('e', '🏠', 'уборка в коридоре', [0, 0, 2]),
  task('f', '📖', 'индекс 00 + топ', [2, 1, 0]),
  task('g', '🍀', 'седьмая задача', [1, 1, 1]),
  task('h', '📦', 'восьмая', [0, 1, 2]),
  task('i', '🤿', 'девятая задача', [2, 2, 2])
]
globalThis.__REQ = (p) => {
  phone.got.push(p)
  if (!phone.online) return Promise.reject(new Error('offline'))
  if (p.t === 'tasks') return Promise.resolve({ ok: true, reply: { t: 'tasks', q: phone.q } })
  if (p.t === 'tdone') {
    phone.q = phone.q.filter((x) => x.i !== p.tid)
    return Promise.resolve({ ok: true, reply: { t: 'ack', id: p.id, q: phone.q } })
  }
  return Promise.resolve({ ok: false })
}
globalThis.Page = (o) => { globalThis.__PAGE = o }
await import('../page/index.js')
const page = globalThis.__PAGE

await t('запуск: полоска скрыта, прокрутка заблокирована, список с телефона нарисован', async () => {
  page.onInit()
  page.build()
  await sleep(20)
  assert.equal(globalThis.__STATUSBAR, false)
  assert.equal(globalThis.__SCROLLLOCK, true)
  assert.equal(globalThis.__RELAUNCH, true)
  assert.equal(buttons().length, 6)
  const cards = alive().filter((w) => w.type === 'FILL_RECT' && w.props.color === 0x1c1c1c)
  assert.equal(cards.length, 6)
  assert.deepEqual(cards.map((w) => w.props.x), [2, 74, 146, 218, 290, 362])
  assert.ok(cards.every((w) => w.props.w === 68 && w.props.h === 494 && w.props.y === 10 + DY))
})

await t('полоска: три сегмента 23 px с зазором 3, цвета как у квадратиков', async () => {
  const segs = alive().filter((w) => w.type === 'FILL_RECT' && w.props.x === 2 && w.props.color !== 0x1c1c1c)
  assert.deepEqual(segs.map((w) => w.props.y - DY), [10, 36, 62])
  assert.ok(segs.every((w) => w.props.h === 23 && w.props.w === 68))
  // задача a: c = [0,0,2] → сверху вниз красный, зелёный, зелёный
  assert.deepEqual(segs.map((w) => w.props.color), [0xf85149, 0x3fb950, 0x3fb950])
})

await t('эмодзи и текст стоят в колонке, текст не заходит на полоску', async () => {
  const imgs = alive().filter((w) => w.type === 'IMG')
  const e = imgs.filter((w) => /^e\d\.png$/.test(w.props.src))
  assert.equal(e.length, 6)
  assert.equal(e[0].props.src, 'e0.png')       // 🏠
  assert.equal(e[1].props.src, 'e4.png')       // 🧬
  assert.equal(e[2].props.src, 'e8.png')       // 🩸
  assert.equal(e[0].props.y - DY, 456)
  const g = imgs.filter((w) => /^g\d+_/.test(w.props.src))
  assert.ok(g.length > 60)
  assert.ok(g.every((w) => w.props.y - DY >= 85 && w.props.y - DY + w.props.h <= 456))
})

await t('сохранение: после закрытия и открытия список берётся из памяти, пока телефон молчит', async () => {
  page.onDestroy()
  phone.online = false
  globalThis.__W.length = 0
  page.build()
  await sleep(20)
  assert.equal(buttons().length, 6)
  phone.online = true
  page.onDestroy()
})

await t('прокрутка: свайп влево сдвигает на 3 колонки, вправо — назад; в начале свайп вправо выходит из приложения', async () => {
  globalThis.__W.length = 0
  page.build()
  await sleep(20)
  const g = globalThis.__GESTURE
  assert.equal(g('R'), false)                     // начало списка: обычный выход
  assert.equal(g('L'), true)
  assert.equal(buttons().length, 6)               // 9 задач: колонки 3..8
  await sleep(300)
  assert.equal(g('L'), true)                      // дальше некуда
  assert.equal(buttons().length, 6)
  await sleep(300)
  assert.equal(g('R'), true)                      // назад
  assert.equal(g('U'), true)
  page.onDestroy()
})

await t('долгое нажатие: задача пропадает с экрана, на телефон уходит tdone, после подтверждения список обновляется', async () => {
  globalThis.__W.length = 0
  phone.got.length = 0
  page.build()
  await sleep(20)
  assert.equal(buttons().length, 6)
  const before = globalThis.__VIB || 0
  buttons()[1].props.longpress_func()             // колонка 2 — задача b
  await sleep(120)
  assert.equal((globalThis.__VIB || 0), before + 1)
  const td = phone.got.filter((p) => p.t === 'tdone')
  assert.equal(td.length, 1)
  assert.equal(td[0].tid, 'b')
  assert.ok(td[0].id && td[0].ts > 0)
  assert.equal(phone.q.length, 8)
  assert.equal(buttons().length, 6)               // остальные сдвинулись, шестой стала g
  const e = alive().filter((w) => w.type === 'IMG' && /^e\d\.png$/.test(w.props.src))
  assert.equal(e.length, 6)
  page.onDestroy()
})

await t('нет связи: выполнение запоминается и пересылается, пока телефон не подтвердит', async () => {
  phone.online = false
  globalThis.__W.length = 0
  phone.got.length = 0
  page.build()
  await sleep(20)
  const firstEmoji = () => alive().filter((w) => w.type === 'IMG' && /^e\d\.png$/.test(w.props.src))[0].props.src
  assert.equal(firstEmoji(), 'e0.png')            // 🏠 — задача a
  buttons()[0].props.longpress_func()             // задача a
  await sleep(120)
  assert.equal(buttons().length, 6)               // было 8 задач, стало 7 — шесть колонок по-прежнему заполнены
  assert.equal(firstEmoji(), 'e8.png')            // теперь первая — c (🩸): b выполнена раньше, a — только что
  assert.equal(JSON.parse(globalThis.__LS.st).pend.length, 1)
  page.onDestroy()
  const saved = JSON.parse(globalThis.__LS.st)
  assert.equal(saved.pend.length, 1)
  phone.online = true
  globalThis.__W.length = 0
  phone.got.length = 0
  page.build()
  await sleep(50)
  assert.equal(phone.got.filter((p) => p.t === 'tdone').length, 1)   // при открытии неподтверждённое отправляется сразу
  assert.equal(phone.q.find((x) => x.i === 'a'), undefined)
  assert.equal(JSON.parse(globalThis.__LS.st).pend.length, 0)
  page.onDestroy()
})

await t('пустая очередь: надпись', async () => {
  phone.q = []
  globalThis.__W.length = 0
  page.build()
  await sleep(30)
  assert.equal(buttons().length, 0)
  const m = alive().filter((w) => w.type === 'TEXT')
  assert.equal(m.length, 1)
  assert.equal(m[0].props.text, 'Очередь задач пуста')
  page.onDestroy()
})

console.log('\nвсего: ' + n)
process.exit(0)
