// Загрузчик для Node: подменяет модули часов (@zos/*, @zeppos/*) заглушками и дописывает .js к относительным путям без расширения.
import { pathToFileURL, fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
const here = path.dirname(fileURLToPath(import.meta.url))
export async function resolve(spec, ctx, next) {
  if (spec.startsWith('@zos/') || spec.startsWith('@zeppos/')) {
    const f = path.join(here, 'mocks', spec.replace(/^@/, '').replace(/\//g, '_') + '.mjs')
    return { url: pathToFileURL(f).href, shortCircuit: true }
  }
  if ((spec.startsWith('./') || spec.startsWith('../')) && !path.extname(spec) && ctx.parentURL) {
    const base = path.dirname(fileURLToPath(ctx.parentURL))
    const f = path.resolve(base, spec + '.js')
    if (fs.existsSync(f)) return { url: pathToFileURL(f).href, shortCircuit: true }
  }
  return next(spec, ctx)
}
