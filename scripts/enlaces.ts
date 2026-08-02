// Imprime los enlaces públicos del demo. Útil para probar en el celular.
import { filas } from '../src/lib/db'
import { ESTADO_INFO } from '../src/lib/dominio'

async function main() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const slug = process.argv[2] ?? 'san-rafael'
  const r = await filas<any>(
    `SELECT o.numero, o.estado, o.token_publico AS token, v.placa, v.marca, v.modelo,
            (SELECT COUNT(*) FROM items i WHERE i.orden_id = o.id AND i.estado = 'propuesto') AS pendientes
       FROM ordenes o JOIN vehiculos v ON v.id = o.vehiculo_id JOIN demos d ON d.id = o.demo_id
      WHERE d.slug = ? ORDER BY o.numero DESC`,
    [slug],
  )
  console.log(`\nEnlaces públicos de /d/${slug}\n`)
  for (const o of r) {
    const marca = `${o.marca} ${o.modelo}`
    console.log(
      `  #0${o.numero}  ${String(o.placa).padEnd(9)} ${marca.padEnd(20)} ` +
        `${ESTADO_INFO[o.estado as keyof typeof ESTADO_INFO].corto.padEnd(15)} ` +
        `${o.pendientes ? '● espera respuesta ' : '                   '} ${base}/o/${o.token}`,
    )
  }
  console.log()
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1) })
