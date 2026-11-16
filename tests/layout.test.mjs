import assert from 'node:assert'
import * as lay from '../shared/layout.js'

let n = 0
function t(name, f) { f(); n++; console.log('ok  ' + name) }

t('шесть колонок по 72 px занимают весь экран', () => {
  assert.equal(lay.COLS * lay.COL_W, lay.SCREEN_W)
  assert.equal(lay.colX(5) + lay.COL_W, 432)
})

t('карточка: ширина 68, поля 2 px, просвет между карточками 4 px, от y = 10 до 504', () => {
  const a = lay.cardRect(0), b = lay.cardRect(1)
  assert.equal(a.x, 2); assert.equal(a.w, 68)
  assert.equal(b.x - (a.x + a.w), 4)
  assert.equal(a.y, 10); assert.equal(a.y + a.h, 504)
})

t('полоска: 75 px = три сегмента по 23 с зазорами 3, в самом верху карточки', () => {
  assert.equal(3 * lay.SEG_LEN + 2 * lay.SEG_GAP, lay.STRIP_LEN)
  assert.deepEqual([0, 1, 2].map((s) => lay.segRect(0, s).y), [10, 36, 62])
  assert.equal(lay.segRect(2, 0).x, 146)
})

t('эмодзи: 38 px, отступ 10 от низа карточки, по центру ширины', () => {
  const r = lay.emojiRect(0)
  assert.equal(r.y + r.h, 504 - 10)
  assert.equal(r.x, 2 + 15)
})

t('текст начинается над эмодзи (как в превью) и кончается перед полоской', () => {
  const s = lay.textSpan()
  assert.equal(s.bottom, 445)
  assert.ok(s.top > 10 + 75)
  assert.equal(s.len, s.bottom - s.top)
})

t('цвета сегментов: зелёный, жёлтый, красный как квадратики на телефоне', () => {
  assert.equal(lay.segColor(0), 0x3fb950)
  assert.equal(lay.segColor(1), 0xe3b341)
  assert.equal(lay.segColor(2), 0xf85149)
  assert.equal(lay.segColor('мусор'), 0x3fb950)
})

console.log('\nвсего: ' + n)
