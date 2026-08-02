// Corre un script del proyecto CONTRA PRODUCCIÓN, a propósito.
//
//   npm run turso demo:inspeccionar
//   npm run turso demo:invariantes
//   npm run turso demo:sembrar
//
// Es el único camino a Turso desde esta máquina. Carga .env.turso —que ninguna
// herramienta lee por su cuenta— y pone PERMITIR_PRODUCCION=1, que es lo que
// desarma el guardia de src/lib/db.ts.
//
// Existe porque tener las credenciales en .env.local hacía que `npm run dev`
// escribiera en la demo publicada: un prospecto revisando su enlace veía las
// tarjetas moverse solas. Y porque el servidor y los scripts leían archivos
// distintos, así que la pantalla y la terminal mostraban bases diferentes.

import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const ARCHIVO = '.env.turso'
const objetivo = process.argv[2]

if (!objetivo) {
  console.error('  Uso: npm run turso <script>   (por ejemplo: npm run turso demo:invariantes)')
  process.exit(1)
}

if (!existsSync(ARCHIVO)) {
  console.error(`  Falta ${ARCHIVO}. Ahí van TURSO_DATABASE_URL y TURSO_AUTH_TOKEN.`)
  process.exit(1)
}

const env = { ...process.env, PERMITIR_PRODUCCION: '1' }
for (const linea of readFileSync(ARCHIVO, 'utf8').split('\n')) {
  const m = linea.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

if (!env.TURSO_DATABASE_URL) {
  console.error(`  ${ARCHIVO} no trae TURSO_DATABASE_URL.`)
  process.exit(1)
}

// Que se vea en qué base se va a trabajar. Nunca el token.
console.log(
  `\n\x1b[33m  ▲ PRODUCCIÓN\x1b[0m  ${env.TURSO_DATABASE_URL.replace(/\/\/[^.]+/, '//****')}\n` +
    `    ${objetivo}\n`,
)

const hijo = spawn('npm', ['run', '--silent', objetivo, ...process.argv.slice(3)], {
  stdio: 'inherit',
  env,
})
hijo.on('exit', (codigo) => process.exit(codigo ?? 1))
