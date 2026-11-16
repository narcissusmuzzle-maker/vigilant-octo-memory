/**
 * Раскладка экрана задач (чистые функции, без обращений к API часов — проверяются тестами в Node).
 *
 * Экран 432 × 514, фон чёрный. Шесть колонок по 72 px вплотную (6 × 72 = 432). В каждой — карточка шириной 68 px
 * (по 2 px поля слева и справа, между соседними карточками чёрный просвет 4 px), от y = 10 до y = 504 (длина 494).
 * Задача — строка, повёрнутая на 90° против часовой стрелки: читается снизу вверх.
 * Снизу вверх по карточке: отступ 10, эмодзи (38), промежуток TEXT_GAP, текст, и в самом конце (вверху) цветная полоска 75 × 68,
 * разделённая вдоль на три сегмента по 23 px с зазорами 3 px.
 */
export const SCREEN_W = 432
export const SCREEN_H = 514
export const COLS = 6            // сколько колонок помещается на экране
export const COL_W = 72
export const CARD_W = 68
export const CARD_DX = 2         // поле слева (и справа) внутри колонки
export const CARD_TOP = 10
export const CARD_H = 494
export const STRIP_LEN = 75
export const SEG_LEN = 23
export const SEG_GAP = 3
export const EMO_SIZE = 38
export const EMO_PAD = 10        // отступ от нижнего края карточки до эмодзи
export const TEXT_GAP = 11       // промежуток между эмодзи и текстом: по превью текст начинается на 8 px выше, чем при 3 (картинка эмодзи 38 px + поля)
export const TEXT_END_GAP = 6    // запас между концом текста и цветной полоской

// цвета: фон карточки, текст, три цвета полоски (как цветные квадратики в приложении на телефоне: зелёный, жёлтый, красный)
export const BG = 0x000000
export const CARD = 0x1c1c1c
export const SEG_COLORS = [0x3fb950, 0xe3b341, 0xf85149]

/** Левый край колонки k (0..5), вместе с чёрным полем. */
export function colX(k) { return k * COL_W }

/** Карточка колонки k. */
export function cardRect(k) { return { x: k * COL_W + CARD_DX, y: CARD_TOP, w: CARD_W, h: CARD_H } }

/** Сегмент полоски s (0 — самый верхний, 2 — нижний) в колонке k. */
export function segRect(k, s) {
  return { x: k * COL_W + CARD_DX, y: CARD_TOP + s * (SEG_LEN + SEG_GAP), w: CARD_W, h: SEG_LEN }
}

/** Эмодзи колонки k: по центру ширины карточки, внизу. */
export function emojiRect(k) {
  return {
    x: k * COL_W + CARD_DX + Math.round((CARD_W - EMO_SIZE) / 2),
    y: CARD_TOP + CARD_H - EMO_PAD - EMO_SIZE,
    w: EMO_SIZE,
    h: EMO_SIZE
  }
}

/** Где начинается текст (нижний край первой буквы) и сколько места ему отведено вдоль строки (вверх до полоски). */
export function textSpan() {
  const bottom = CARD_TOP + CARD_H - EMO_PAD - EMO_SIZE - TEXT_GAP   // 445
  const top = CARD_TOP + STRIP_LEN + TEXT_END_GAP                    // 91
  return { bottom: bottom, top: top, len: bottom - top }
}

/** Середина карточки колонки k по горизонтали. */
export function cardCenterX(k) { return k * COL_W + CARD_DX + CARD_W / 2 }

/** Цвет сегмента по уровню (0 зелёный, 1 жёлтый, 2 красный); мусор — зелёный. */
export function segColor(level) {
  const l = Math.round(+level)
  return SEG_COLORS[l >= 0 && l <= 2 ? l : 0]
}
