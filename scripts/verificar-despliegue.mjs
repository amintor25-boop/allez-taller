// Comprueba que el sitio publicado está VIVO de verdad.
//
//   node scripts/verificar-despliegue.mjs [https://dominio]
//
// Sale con 1 si algo falla, para que nadie pueda dar por bueno un despliegue
// roto. Se corre solo al final de `npm run desplegar` y de `npm run publicar`.
//
// Existe porque un guardia de entorno mal escrito dejó /d/san-rafael devolviendo
// 500 y solo se descubrió porque a alguien se le ocurrió mirar. Si eso pasa un
// martes por la noche, mientras el socio del prospecto abre su enlace, no se
// entera nadie y la venta se pierde sin saber por qué.

const BASE = (process.argv[2] || 'https://allez-taller.netlify.app').replace(/\/+$/, '')

const rojo = (t) => `\x1b[31m${t}\x1b[0m`
const verde = (t) => `\x1b[32m${t}\x1b[0m`

async function pedir(ruta, { esperado = 200, debeTener = null } = {}) {
  const t0 = Date.now()
  try {
    const res = await fetch(BASE + ruta, { redirect: 'follow' })
    const cuerpo = debeTener ? await res.text() : ''
    const seg = (Date.now() - t0) / 1000
    const bien = res.status === esperado && (!debeTener || cuerpo.includes(debeTener))
    return { ruta, bien, detalle: `${res.status}  ${seg.toFixed(2)}s`, seg }
  } catch (e) {
    return { ruta, bien: false, detalle: e.message, seg: (Date.now() - t0) / 1000 }
  }
}

/**
 * Un token real de la propia demo: la página del cliente es el centro de la
 * venta y tiene que comprobarse con un enlace vivo, no con uno inventado.
 *
 * El tablero NO lleva enlaces /o/… sueltos: solo aparecen dentro del modal del
 * presupuesto, así que hay que abrirlo con ?qr=<orden>.
 */
async function tokenDelCliente() {
  try {
    const tablero = await (await fetch(`${BASE}/d/san-rafael`)).text()
    const ordenes = [...new Set([...tablero.matchAll(/\/d\/san-rafael\/orden\/([a-z0-9_-]+)/g)].map((m) => m[1]))]
    for (const orden of ordenes.slice(0, 6)) {
      const modal = await (await fetch(`${BASE}/d/san-rafael?qr=${orden}`)).text()
      const t = (modal.match(/\/o\/([A-Z0-9]{5,8})/) || [])[1]
      if (t) return t
    }
    return null
  } catch {
    return null
  }
}

async function main() {
  console.log(`\n  Comprobando ${BASE}\n`)

  const token = await tokenDelCliente()

  const pruebas = [
    ['/salud', { debeTener: 'Conectado' }],
    ['/d/san-rafael', { debeTener: 'Tablero' }],
    ['/d/san-rafael/recepcion', {}],
    ['/d/san-rafael/facturacion', {}],
    ['/d/san-rafael/inventario', {}],
    ['/d/san-rafael/reportes', {}],
    ['/admin', {}],
    // La página del cliente, con un token de verdad sacado del tablero.
    ...(token ? [[`/o/${token}`, { debeTener: 'taller' }]] : []),
  ]

  const resultados = []
  for (const [ruta, opciones] of pruebas) {
    const r = await pedir(ruta, opciones)
    resultados.push(r)
    console.log(`  ${r.bien ? verde('✓') : rojo('✗')} ${ruta.padEnd(30)} ${r.detalle}`)
  }

  if (!token) {
    console.log(`  ${rojo('✗')} ${'/o/<token>'.padEnd(30)} no se pudo sacar un token del tablero`)
    resultados.push({ bien: false })
  }

  const rotas = resultados.filter((r) => !r.bien)
  const lentas = resultados.filter((r) => r.bien && r.seg > 3)

  console.log()
  if (rotas.length) {
    console.log(rojo(`  ▲▲▲  ${rotas.length} RUTA${rotas.length > 1 ? 'S' : ''} CAÍDA${rotas.length > 1 ? 'S' : ''}  ▲▲▲`))
    console.log(rojo('  El despliegue NO está bueno. No repartas el enlace.'))
    process.exit(1)
  }

  if (lentas.length) {
    console.log(`  Todo en pie, pero ${lentas.length} tardó más de 3 s: ${lentas.map((l) => l.ruta).join(', ')}`)
  } else {
    console.log(verde('  Todo en pie.'))
  }
  process.exit(0)
}

main().catch((e) => {
  console.error(rojo(`  ✗ ${e.message}`))
  process.exit(1)
})
