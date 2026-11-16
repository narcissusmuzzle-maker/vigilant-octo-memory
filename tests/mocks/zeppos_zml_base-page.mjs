// BasePage: возвращает тот же объект; request подменяется тестом (globalThis.__REQ получает params)
export function BasePage(o) {
  o.request = function (p) { return globalThis.__REQ(p.params) }
  return o
}
