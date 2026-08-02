// Publica el demo en Netlify, de principio a fin.
//
// Lo único que NO hace es autenticar: eso son tus credenciales y tienen que
// pasar por tus manos. El resto —sembrar Turso, crear el sitio, poner las
// variables, compilar, desplegar y comprobar— corre de una sola vez.
//
//   node scripts/publicar.mjs
//
// Lee TURSO_DATABASE_URL y TURSO_AUTH_TOKEN de .env.turso. Nunca los imprime.

import { execFileSync, execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'

const NOMBRE = process.env.SITIO ?? 'allez-taller'
const EQUIPO = process.env.EQUIPO ?? 'amintor25'

function leerEnvLocal() {
  if (!existsSync('.env.turso')) return {}
  const out = {}
  for (const linea of readFileSync('.env.turso', 'utf8').split('\n')) {
    const m = linea.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/)
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  return out
}

const paso = (n, t) => console.log(`\n\x1b[1m${n}. ${t}\x1b[0m`)
const ok = (t) => console.log(`   ✓ ${t}`)
const mal = (t) => { console.error(`   ✗ ${t}`); process.exit(1) }

const env = leerEnvLocal()
const URL_BD = env.TURSO_DATABASE_URL
const TOKEN_BD = env.TURSO_AUTH_TOKEN
const TELEFONO = env.NEXT_PUBLIC_TELEFONO_TALLER || '+593979279337'

// Si hay token personal en .env.local, va en el entorno de TODAS las llamadas a
// la CLI. Si no lo hay, se usa la sesión de `netlify login`.
const conNetlify = { ...process.env, ...(env.NETLIFY_AUTH_TOKEN ? { NETLIFY_AUTH_TOKEN: env.NETLIFY_AUTH_TOKEN } : {}) }

// ── 0. Comprobaciones antes de tocar nada ───────────────────────────────────
paso(0, 'Comprobando lo que hace falta')

if (!URL_BD || !/^libsql:\/\//.test(URL_BD)) {
  mal('Falta TURSO_DATABASE_URL en .env.turso (tiene que empezar por libsql://)')
}
if (!TOKEN_BD || TOKEN_BD.length < 20) {
  mal('Falta TURSO_AUTH_TOKEN en .env.turso')
}
ok(`Turso: ${URL_BD.replace(/\/\/[^.]+/, '//****')}`)

// OJO: `netlify status` sale con código 0 aunque NO haya sesión. Hay que mirar
// lo que imprime, no el código de salida.
let quien = ''
try {
  quien = execSync('npx --no-install netlify status', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: conNetlify })
} catch (e) {
  quien = String(e.stdout ?? '') + String(e.stderr ?? '')
}
if (/not logged in|no has iniciado/i.test(quien)) {
  mal('La CLI de Netlify no tiene sesión. Corre `npx netlify login` en tu terminal y vuelve a lanzar esto.')
}
const cuenta = quien.match(/Email:\s*(\S+)/)?.[1] ?? quien.match(/Name:\s*(.+)/)?.[1]?.trim()
ok(`Netlify: sesión abierta${cuenta ? ` (${cuenta})` : ''}`)

// ── 1. Sembrar Turso ────────────────────────────────────────────────────────
paso(1, 'Sembrando la base en Turso (3.226 sentencias, 9 viajes)')
const t0 = Date.now()
execFileSync('npx', ['tsx', 'scripts/sembrar.ts'], {
  stdio: 'inherit',
  env: { ...process.env, TURSO_DATABASE_URL: URL_BD, TURSO_AUTH_TOKEN: TOKEN_BD },
})
ok(`${((Date.now() - t0) / 1000).toFixed(1)} s contra Turso`)

// ── 2. El sitio ─────────────────────────────────────────────────────────────
paso(2, `Creando o enlazando el sitio "${NOMBRE}"`)
try {
  execSync(`npx --no-install netlify sites:create --name ${NOMBRE} --account-slug ${EQUIPO} --disable-linking`, { stdio: 'pipe', env: conNetlify })
  ok(`creado: https://${NOMBRE}.netlify.app`)
} catch (e) {
  const salida = String(e.stdout ?? '') + String(e.stderr ?? '')
  if (/already exists|ya existe|taken/i.test(salida)) ok('ya existía, se reutiliza')
  else { console.error(salida); mal('No se pudo crear el sitio. ¿El nombre está tomado? Prueba SITIO=otro-nombre node scripts/publicar.mjs') }
}
execSync(`npx --no-install netlify link --name ${NOMBRE}`, { stdio: 'pipe', env: conNetlify })
ok('carpeta enlazada al sitio')

// ── 3. Variables ────────────────────────────────────────────────────────────
paso(3, 'Poniendo las variables de entorno')
for (const [clave, valor] of [
  ['TURSO_DATABASE_URL', URL_BD],
  ['TURSO_AUTH_TOKEN', TOKEN_BD],
  ['NEXT_PUBLIC_TELEFONO_TALLER', TELEFONO],
]) {
  execFileSync('npx', ['--no-install', 'netlify', 'env:set', clave, valor], { stdio: 'pipe', env: conNetlify })
  ok(clave)
}
console.log('   · NEXT_PUBLIC_BASE_URL se deja SIN PONER a propósito: el QR toma el dominio')
console.log('     de la propia petición, así no hay que recompilar si el dominio cambia.')

// ── 4. Compilar y desplegar ─────────────────────────────────────────────────
paso(4, 'Compilando y desplegando')
execSync('npx --no-install netlify deploy --prod --build', { stdio: 'inherit', env: conNetlify })

// ── 5. Comprobar ────────────────────────────────────────────────────────────
paso(5, 'Comprobando el sitio publicado')
const base = `https://${NOMBRE}.netlify.app`
const rutas = ['/salud', '/d/san-rafael', '/admin', '/d/san-rafael/facturacion', '/d/san-rafael/reportes']

let fallos = 0
for (const r of rutas) {
  const t = Date.now()
  try {
    const res = await fetch(base + r, { redirect: 'follow' })
    const cuerpo = r === '/salud' ? await res.text() : ''
    const seg = ((Date.now() - t) / 1000).toFixed(2)
    const bien = res.status === 200 && (r !== '/salud' || cuerpo.includes('Conectado'))
    if (!bien) fallos++
    console.log(`   ${bien ? '✓' : '✗'} ${r.padEnd(30)} ${res.status}  ${seg}s`)
  } catch (e) {
    fallos++
    console.log(`   ✗ ${r.padEnd(30)} ${e.message}`)
  }
}

console.log(`\n${fallos === 0 ? '\x1b[32mListo.\x1b[0m' : '\x1b[31mHay ' + fallos + ' fallos.\x1b[0m'}  ${base}/d/san-rafael`)
console.log(`Consola de enlaces: ${base}/admin`)
console.log('\nÚltimo paso, y este solo lo puede hacer un teléfono de verdad:')
console.log('abre el tablero desde un celular FUERA de tu wifi, manda un presupuesto,')
console.log('escanea el QR y aprueba. Si la tarjeta viaja sola, está listo.')
