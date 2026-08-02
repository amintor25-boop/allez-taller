// Siembra (o resiembra) un demo desde la terminal.
//   npm run demo:sembrar                 → Taller San Rafael, slug san-rafael
//   npm run demo:sembrar "Taller Pérez"  → crea un enlace nuevo
import { buscarDemo, crearDemo, NOMBRE_PRINCIPAL, SLUG_PRINCIPAL } from '../src/lib/demos'
import { sembrarDemo } from '../src/lib/semilla'

async function main() {
  const nombre = process.argv[2]

  if (!nombre) {
    const existente = await buscarDemo(SLUG_PRINCIPAL)
    if (existente) {
      // Desde la terminal SÍ se resiembra entero: es la herramienta para
      // reconstruir desde cero, y aquí no hay ninguna petición esperando. El
      // botón del taller y el reinicio de las 48 h usan la restauración ligera.
      await sembrarDemo(existente)
      console.log(`↻ Resembrado: ${existente.taller_nombre}  →  /d/${existente.slug}`)
    } else {
      const demo = await crearDemo(NOMBRE_PRINCIPAL, SLUG_PRINCIPAL)
      console.log(`✓ Creado: ${demo.taller_nombre}  →  /d/${demo.slug}`)
    }
    return
  }

  const demo = await crearDemo(nombre)
  console.log(`✓ Creado: ${demo.taller_nombre}  →  /d/${demo.slug}`)
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e)
    process.exit(1)
  },
)
