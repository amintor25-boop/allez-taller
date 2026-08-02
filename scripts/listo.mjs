// ¿Está todo para publicar?
//
// Sale con 0 cuando sí y con 1 cuando falta algo, para poder esperarlo desde
// una terminal:  until node scripts/listo.mjs; do sleep 20; done
//
// No imprime jamás el token: solo si está y cuántos caracteres tiene.

import { execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'

function envLocal() {
  if (!existsSync('.env.turso')) return {}
  const out = {}
  // Se parte por líneas ANTES de aplicar la expresión: `\s` incluye el salto de
  // línea, así que un `(.*)$` sobre el archivo entero se traga la línea
  // siguiente y devuelve el nombre de la variable de abajo como si fuera valor.
  for (const linea of readFileSync('.env.turso', 'utf8').split('\n')) {
    const m = linea.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/)
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  return out
}

const env = envLocal()
const url = env.TURSO_DATABASE_URL ?? ''
const token = env.TURSO_AUTH_TOKEN ?? ''

const urlOk = /^libsql:\/\/.+\..+/.test(url)
const tokenOk = token.length >= 20

// Dos formas válidas de tener sesión: `netlify login`, o un token personal en
// .env.turso. La segunda evita que el token pase por ningún sitio compartido.
const tokenNetlify = env.NETLIFY_AUTH_TOKEN ?? ''
let netlify = ''
try {
  netlify = execSync('npx --no-install netlify status', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...(tokenNetlify ? { NETLIFY_AUTH_TOKEN: tokenNetlify } : {}) },
  })
} catch (e) {
  netlify = String(e.stdout ?? '') + String(e.stderr ?? '')
}
// `netlify status` sale con código 0 aunque no haya sesión: hay que leerlo.
const sesionOk = !/not logged in/i.test(netlify)
const correo = netlify.match(/Email:\s*(\S+)/)?.[1] ?? (tokenNetlify ? 'por token personal' : undefined)

const marca = (b) => (b ? '\x1b[32m✓\x1b[0m' : '\x1b[31m·\x1b[0m')
console.log(`${marca(urlOk)} TURSO_DATABASE_URL   ${urlOk ? url.replace(/\/\/[^.]+/, '//****') : 'falta o mal formada'}`)
console.log(`${marca(tokenOk)} TURSO_AUTH_TOKEN     ${tokenOk ? `puesto (${token.length} caracteres)` : 'falta'}`)
console.log(`${marca(sesionOk)} sesión de Netlify    ${sesionOk ? (correo ?? 'abierta') : 'sin iniciar'}`)

const listo = urlOk && tokenOk && sesionOk
console.log(listo ? '\n\x1b[32mTodo listo para publicar.\x1b[0m' : '\nTodavía falta algo.')
process.exit(listo ? 0 : 1)
