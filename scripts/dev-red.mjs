// Levanta el servidor accesible desde la red local y dice exactamente qué abrir
// en el celular. Existe para ensayar el camino de oro sin adivinar direcciones.
import { networkInterfaces } from 'node:os'
import { spawn } from 'node:child_process'

const PUERTO = process.env.PORT ?? '3000'

const direcciones = Object.entries(networkInterfaces())
  .flatMap(([nombre, lista]) => (lista ?? []).map((d) => ({ ...d, nombre })))
  .filter((d) => d.family === 'IPv4' && !d.internal)

const linea = '─'.repeat(58)
console.log(`\n${linea}`)
console.log('  ALLEZ Taller — servidor accesible desde la red local')
console.log(linea)

if (direcciones.length === 0) {
  console.log('\n  ⚠  No hay ninguna interfaz de red activa.')
  console.log('     Conéctate al wifi antes de levantar el servidor.\n')
} else {
  console.log('\n  En la laptop:')
  console.log(`     http://localhost:${PUERTO}/d/san-rafael\n`)
  console.log('  En el celular (mismo wifi):')
  for (const d of direcciones) {
    console.log(`     http://${d.address}:${PUERTO}/d/san-rafael      (${d.nombre})`)
  }
  console.log('\n  Prueba de conexión desde el celular:')
  for (const d of direcciones) {
    console.log(`     http://${d.address}:${PUERTO}/salud`)
  }
  console.log('\n  IMPORTANTE: entra al tablero por la IP, no por localhost.')
  console.log('  El QR se genera con la dirección que uses para entrar.')
}
console.log(`${linea}\n`)

// -H 0.0.0.0 es explícito a propósito: no depender del valor por omisión.
const hijo = spawn('npx', ['next', 'dev', '-H', '0.0.0.0', '-p', PUERTO], {
  stdio: 'inherit',
  env: process.env,
})
hijo.on('exit', (codigo) => process.exit(codigo ?? 0))
