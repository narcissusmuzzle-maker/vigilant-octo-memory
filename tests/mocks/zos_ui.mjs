// Заглушка @zos/ui: записывает все созданные виджеты (globalThis.__W) вместо рисования.
globalThis.__W = globalThis.__W || []
let nextId = 1
export const widget = { FILL_RECT: 'FILL_RECT', IMG: 'IMG', TEXT: 'TEXT', BUTTON: 'BUTTON' }
export const align = { LEFT: 'L', CENTER_H: 'CH', CENTER_V: 'CV', TOP: 'T' }
export const text_style = { WRAP: 'WRAP' }
export const prop = { MORE: 'MORE', VISIBLE: 'VISIBLE' }
export function createWidget(type, props) {
  const w = { id: nextId++, type, props: { ...props }, alive: true }
  globalThis.__W.push(w)
  return w
}
export function deleteWidget(w) {
  if (!w || !w.alive) throw new Error('deleteWidget: нет такого виджета')
  w.alive = false
}
export function setStatusBarVisible(v) { globalThis.__STATUSBAR = v }
