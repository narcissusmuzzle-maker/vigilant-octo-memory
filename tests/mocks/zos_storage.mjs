globalThis.__LS = globalThis.__LS || {}
export class LocalStorage {
  getItem(k, d) { return k in globalThis.__LS ? globalThis.__LS[k] : d }
  setItem(k, v) { globalThis.__LS[k] = v }
}
