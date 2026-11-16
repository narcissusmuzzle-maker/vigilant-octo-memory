/**
 * Логика приложения «Задачи» для часов (чистый JS без обращений к API часов — проверяется тестами в Node, tests/tasks.test.mjs).
 *
 * Что здесь:
 *  - cleanTasks    — привести список, пришедший с телефона, к виду, с которым работает экран;
 *  - placeText     — подобрать размер шрифта и разложить буквы строки по высоте колонки (снизу вверх);
 *  - прокрутка     — какие шесть задач видны, на сколько сдвигается список;
 *  - завершения    — очередь «задача выполнена на часах, телефон ещё не подтвердил» (пересылается, пока телефон не подтвердит).
 */
import * as lay from './layout.js'
import { SIZES, ADV, LH, PAD } from './glyphs.js'

export const MAX_TASKS = 40        // сколько задач храним (телефон тоже столько отдаёт)
export const SCROLL_STEP = 3       // на сколько колонок сдвигается список за один свайп (6 = ровно страница)
export const MAX_PEND = 200        // сколько неподтверждённых завершений храним

// эмодзи вкладок в порядке картинок e0..e8: 🏠 🍀 🔍 📖 🧬 💀 🤿 🎨 🩸
export const EMOJI = ['\u{1F3E0}', '\u{1F340}', '\u{1F50D}', '\u{1F4D6}', '\u{1F9EC}', '\u{1F480}',
  '\u{1F93F}', '\u{1F3A8}', '\u{1FA78}']

/** Номер картинки эмодзи (0..9) или -1, если такой картинки нет (вкладка с другим эмодзи — на часах место остаётся пустым). */
export function emojiIndex(e) {
  const s = String(e == null ? '' : e).replace(/\uFE0F/g, '')
  return EMOJI.indexOf(s)
}

/** Уровень цветного квадрата: 0 зелёный, 1 жёлтый, 2 красный. */
function level(v) {
  const n = Math.round(+v)
  return n >= 0 && n <= 2 ? n : 0
}

/** Текст задачи: большие буквы становятся маленькими (картинок больших букв нет), переводы строк и табы — пробелы, лишние пробелы по краям убираются, остальные пробелы как есть. */
export function normText(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[\r\n\t]+/g, ' ').replace(/\uFE0F/g, '').replace(/^ +| +$/g, '')
}

/**
 * Список с телефона → список экрана. Телефон присылает [{ i: id, e: эмодзи вкладки, x: текст, c: [важность, сложность, срочность] }, ...];
 * c — по порядку квадратиков на телефоне слева направо (после поворота строки первый квадратик оказывается в самом низу полоски).
 */
export function cleanTasks(raw) {
  const out = []
  if (!Array.isArray(raw)) return out
  for (let k = 0; k < raw.length && out.length < MAX_TASKS; k++) {
    const r = raw[k]
    if (!r || r.i === undefined || r.i === null || r.i === '') continue
    const c = Array.isArray(r.c) ? r.c : []
    // e: с телефона приходит сам эмодзи (строка), из хранилища — уже номер картинки
    const e = typeof r.e === 'number' ? (r.e >= 0 && r.e < EMOJI.length ? Math.round(r.e) : -1) : emojiIndex(r.e)
    out.push({ i: String(r.i), e: e, x: normText(r.x), c: [level(c[0]), level(c[1]), level(c[2])] })
  }
  return out
}

/** Одинаковые ли списки (чтобы не перерисовывать экран зря). */
export function sameTasks(a, b) {
  if (a.length !== b.length) return false
  for (let k = 0; k < a.length; k++) {
    const x = a[k], y = b[k]
    if (x.i !== y.i || x.e !== y.e || x.x !== y.x || x.c[0] !== y.c[0] || x.c[1] !== y.c[1] || x.c[2] !== y.c[2]) return false
  }
  return true
}

/** Цвета трёх сегментов полоски сверху вниз для задачи: самый верхний — последний квадратик телефона (строка повёрнута против часовой). */
export function segLevels(task) {
  return [task.c[2], task.c[1], task.c[0]]
}

// ---------------------------------------------------------------------------------------------------------------------
// Текст
// ---------------------------------------------------------------------------------------------------------------------

/** Имя файла картинки буквы. */
export function glyphFile(size, cp) { return 'g' + size + '_' + cp.toString(16) + '.png' }

function codePoints(s) {
  const a = []
  for (const ch of s) a.push(ch.codePointAt(0))
  return a
}

function width(cps, size) {
  const adv = ADV[size]
  let w = 0
  for (let k = 0; k < cps.length; k++) w += adv[cps[k]]
  return w
}

/**
 * Разложить текст по строке. Снизу вверх от bottom (нижний край первой буквы). Размер шрифта один для всех (SIZES в glyphs.js);
 * если текст не помещается в maxLen — он обрезается и в конце ставятся три точки «...».
 * Буквы, которых нет в наборе (чужие эмодзи и т. п.), пропускаются.
 * Возвращает { size, lh, glyphs: [{ file, y, h }], len }, где y — верх картинки буквы, h — её высота (вдоль строки), len — длина текста.
 */
export function placeText(text, maxLen, bottom) {
  const base = SIZES[0]
  const cps = codePoints(normText(text)).filter((cp) => ADV[base][cp] !== undefined)
  let size = SIZES[SIZES.length - 1]
  let use = cps
  let found = false
  for (let s = 0; s < SIZES.length; s++) {
    if (width(cps, SIZES[s]) <= maxLen) { size = SIZES[s]; found = true; break }
  }
  if (!found) {
    const dots = [0x2e, 0x2e, 0x2e]   // «...»: знака «…» в наборе нет
    const room = maxLen - width(dots, size)
    use = cps.slice()
    while (use.length && width(use, size) > room) use.pop()
    while (use.length && use[use.length - 1] === 0x20) use.pop()
    use = use.concat(dots)
  }
  const adv = ADV[size]
  const glyphs = []
  let cum = 0
  for (let k = 0; k < use.length; k++) {
    const cp = use[k]
    const a = adv[cp]
    if (cp !== 0x20) {
      const h = Math.ceil(a) + 2 * PAD
      glyphs.push({ file: glyphFile(size, cp), y: Math.round(bottom - cum + PAD) - h, h: h })
    }
    cum += a
  }
  return { size: size, lh: LH[size], glyphs: glyphs, len: cum }
}

/** Левый край картинок букв в колонке k: строка (высота LH) стоит по центру ширины карточки. */
export function textX(k, lh) { return lay.colX(k) + lay.CARD_DX + Math.round((lay.CARD_W - lh) / 2) }

// ---------------------------------------------------------------------------------------------------------------------
// Прокрутка
// ---------------------------------------------------------------------------------------------------------------------

/** Самый дальний сдвиг: последняя задача стоит в правой колонке. */
export function maxOffset(n) { return Math.max(0, n - lay.COLS) }

export function clampOffset(off, n) {
  const v = Math.round(+off) || 0
  return Math.max(0, Math.min(maxOffset(n), v))
}

/** Свайп влево (dir = 1) показывает задачи правее, свайп вправо (dir = -1) — левее. */
export function scrolled(off, dir, n) { return clampOffset(off + dir * SCROLL_STEP, n) }

// ---------------------------------------------------------------------------------------------------------------------
// Завершённые на часах задачи, о которых телефон ещё не знает
// ---------------------------------------------------------------------------------------------------------------------

export function newState() { return { off: 0, tasks: [], pend: [], seq: 0 } }

/** Состояние из хранилища; мусор — пустое состояние. */
export function restore(raw) {
  const st = newState()
  try {
    const o = JSON.parse(raw)
    if (!o) return st
    st.off = Math.max(0, Math.round(+o.off) || 0)
    st.tasks = cleanTasks(o.tasks)
    st.seq = Math.max(0, Math.round(+o.seq) || 0)
    if (Array.isArray(o.pend)) {
      for (let k = 0; k < o.pend.length && st.pend.length < MAX_PEND; k++) {
        const p = o.pend[k]
        if (p && p.id && p.tid !== undefined) st.pend.push({ id: String(p.id), tid: String(p.tid), ts: +p.ts || 0, tried: +p.tried || 0 })
      }
    }
  } catch (e) { /* пусто */ }
  return st
}

export function serialize(st) {
  return JSON.stringify({ off: st.off, tasks: st.tasks, pend: st.pend, seq: st.seq })
}

/** Задачи, которые показываем: без тех, что уже выполнены на часах (даже если телефон ещё не подтвердил и прислал их снова). */
export function shownTasks(st) {
  if (!st.pend.length) return st.tasks
  const gone = {}
  for (let k = 0; k < st.pend.length; k++) gone[st.pend[k].tid] = true
  return st.tasks.filter((t) => !gone[t.i])
}

/** Задача выполнена на часах: убирается из списка, событие встаёт в очередь отправки. Возвращает id события или '' (такой задачи нет). */
export function complete(st, taskId, now) {
  const tid = String(taskId)
  for (let k = 0; k < st.pend.length; k++) if (st.pend[k].tid === tid) return ''   // уже выполнена, ждёт подтверждения
  let found = false
  for (let k = 0; k < st.tasks.length; k++) if (st.tasks[k].i === tid) { found = true; break }
  if (!found) return ''
  st.seq++
  const id = 'tk' + Math.round(now).toString(36) + '-' + st.seq.toString(36)
  st.pend.push({ id: id, tid: tid, ts: Math.round(now), tried: 0 })
  while (st.pend.length > MAX_PEND) st.pend.shift()
  st.off = clampOffset(st.off, shownTasks(st).length)
  return id
}

/** Новый список с телефона. Возвращает true, если экран нужно перерисовать. */
export function applyTasks(st, list) {
  const before = shownTasks(st)
  st.tasks = list
  const after = shownTasks(st)
  const off = clampOffset(st.off, after.length)
  const changed = !sameTasks(before, after) || off !== st.off
  st.off = off
  return changed
}

/** Телефон подтвердил завершение: событие больше не отправляем, а задача (если телефон её уже убрал из списка) уходит и из кэша. */
export function ack(st, id) {
  for (let k = 0; k < st.pend.length; k++) {
    if (st.pend[k].id === id) {
      const tid = st.pend[k].tid
      st.pend.splice(k, 1)
      st.tasks = st.tasks.filter((t) => t.i !== tid)
      return true
    }
  }
  return false
}

/** Какие события пора (повторно) отправить: ещё не пробовали или прошло gap миллисекунд с прошлой попытки. По порядку завершения. */
export function due(st, now, gap) {
  const out = []
  for (let k = 0; k < st.pend.length; k++) {
    const p = st.pend[k]
    if (!p.tried || now - p.tried >= gap) out.push(p)
  }
  return out
}
