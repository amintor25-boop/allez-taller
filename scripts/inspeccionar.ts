// Comprobación del paso 1: que la semilla quedó como se prometió y que el
// aislamiento por demo_id funciona de verdad.
import { filas } from '../src/lib/db'
import { listarDemos } from '../src/lib/demos'
import { ESTADO_INFO, ESTADOS, desglosarIva, dinero, antiguedad } from '../src/lib/dominio'

async function main() {
  const demos = await listarDemos()
  console.log(`\nDEMOS EN LA BASE: ${demos.length}`)
  for (const d of demos) {
    console.log(`  · ${d.taller_nombre.padEnd(26)} /d/${d.slug.padEnd(22)} RUC ${d.ruc}`)
  }

  for (const d of demos) {
    console.log(`\n${'─'.repeat(78)}\n${d.taller_nombre.toUpperCase()}  ·  demo_id ${d.id}\n`)

    const conteos = await filas<{ tabla: string; n: number }>(
      `SELECT 'mecanicos' AS tabla, COUNT(*) AS n FROM mecanicos WHERE demo_id = ?1
       UNION ALL SELECT 'clientes',   COUNT(*) FROM clientes   WHERE demo_id = ?1
       UNION ALL SELECT 'vehiculos',  COUNT(*) FROM vehiculos  WHERE demo_id = ?1
       UNION ALL SELECT 'ordenes',    COUNT(*) FROM ordenes    WHERE demo_id = ?1
       UNION ALL SELECT 'items',      COUNT(*) FROM items      WHERE demo_id = ?1
       UNION ALL SELECT 'movimientos',COUNT(*) FROM movimientos WHERE demo_id = ?1
       UNION ALL SELECT 'fotos',      COUNT(*) FROM fotos      WHERE demo_id = ?1
       UNION ALL SELECT 'facturas',   COUNT(*) FROM facturas   WHERE demo_id = ?1
       UNION ALL SELECT 'inventario', COUNT(*) FROM inventario WHERE demo_id = ?1
       UNION ALL SELECT 'bodega',     COUNT(*) FROM movimientos_stock WHERE demo_id = ?1
       UNION ALL SELECT 'citas',      COUNT(*) FROM citas      WHERE demo_id = ?1
       UNION ALL SELECT 'eventos',    COUNT(*) FROM eventos    WHERE demo_id = ?1`,
      [d.id],
    )
    console.log('  ' + conteos.map((c) => `${c.tabla} ${c.n}`).join(' · '))

    for (const estado of ESTADOS) {
      const ordenes = await filas<any>(
        `SELECT o.numero, o.prioridad, o.creada_en, o.token_publico,
                v.placa, v.marca, v.modelo,
                COALESCE(m.nombre, '—') AS mecanico,
                (SELECT COALESCE(SUM(i.precio), 0) FROM items i
                  WHERE i.orden_id = o.id AND i.estado <> 'rechazado') AS total
           FROM ordenes o
           JOIN vehiculos v ON v.id = o.vehiculo_id
           LEFT JOIN mecanicos m ON m.id = o.mecanico_id
          WHERE o.demo_id = ? AND o.estado = ?
          ORDER BY o.orden_columna`,
        [d.id, estado],
      )
      console.log(`\n  ${ESTADO_INFO[estado].corto.toUpperCase()}  (${ordenes.length})`)
      for (const o of ordenes) {
        const marca = `${o.marca} ${o.modelo}`
        console.log(
          `    #0${o.numero}  ${String(o.placa).padEnd(9)} ${marca.padEnd(20)} ` +
            `${String(o.mecanico).padEnd(17)} ${dinero(o.total).padStart(9)}  ` +
            `${antiguedad(o.creada_en).padStart(7)}  /o/${o.token_publico}`,
        )
      }
    }
  }

  // AISLAMIENTO.
  //
  // Lo que hay que comprobar no es que dos demos compartan un identificador —eso
  // no puede pasar, `id` es clave primaria—, sino que ninguna fila apunte a un
  // padre de otro demo. Ahí es donde un enlace podría enseñar datos ajenos.
  console.log(`\n${'─'.repeat(78)}\nAISLAMIENTO`)

  const CRUCES: { que: string; sql: string }[] = [
    { que: 'órdenes con vehículo de otro demo',
      sql: `SELECT COUNT(*) AS n FROM ordenes o JOIN vehiculos v ON v.id = o.vehiculo_id WHERE o.demo_id <> v.demo_id` },
    { que: 'órdenes con cliente de otro demo',
      sql: `SELECT COUNT(*) AS n FROM ordenes o JOIN clientes c ON c.id = o.cliente_id WHERE o.demo_id <> c.demo_id` },
    { que: 'órdenes con mecánico de otro demo',
      sql: `SELECT COUNT(*) AS n FROM ordenes o JOIN mecanicos m ON m.id = o.mecanico_id WHERE o.demo_id <> m.demo_id` },
    { que: 'vehículos con cliente de otro demo',
      sql: `SELECT COUNT(*) AS n FROM vehiculos v JOIN clientes c ON c.id = v.cliente_id WHERE v.demo_id <> c.demo_id` },
    { que: 'renglones con orden de otro demo',
      sql: `SELECT COUNT(*) AS n FROM items i JOIN ordenes o ON o.id = i.orden_id WHERE i.demo_id <> o.demo_id` },
    { que: 'facturas con orden de otro demo',
      sql: `SELECT COUNT(*) AS n FROM facturas f JOIN ordenes o ON o.id = f.orden_id WHERE f.demo_id <> o.demo_id` },
    { que: 'movimientos con orden de otro demo',
      sql: `SELECT COUNT(*) AS n FROM movimientos mv JOIN ordenes o ON o.id = mv.orden_id WHERE mv.demo_id <> o.demo_id` },
    { que: 'salidas de bodega con repuesto de otro demo',
      sql: `SELECT COUNT(*) AS n FROM movimientos_stock ms JOIN inventario n ON n.id = ms.repuesto_id WHERE ms.demo_id <> n.demo_id` },
    { que: 'tokens públicos repetidos entre demos',
      sql: `SELECT COUNT(*) AS n FROM (SELECT token_publico FROM ordenes GROUP BY token_publico HAVING COUNT(DISTINCT demo_id) > 1)` },
    { que: 'claves de acceso repetidas',
      sql: `SELECT COUNT(*) AS n FROM (SELECT clave_acceso FROM facturas GROUP BY clave_acceso HAVING COUNT(*) > 1)` },
  ]

  let fallos = 0
  for (const c of CRUCES) {
    const n = Number((await filas<{ n: number }>(c.sql))[0].n)
    if (n > 0) fallos++
    console.log(`  ${n === 0 ? '✓' : '✗ FALLA'}  ${c.que}: ${n}`)
  }
  console.log(`  ${fallos === 0 ? 'Sin fugas entre enlaces.' : `${fallos} comprobaciones falladas.`}`)

  // Comprobación del IVA hacia atrás sobre los precios del brief.
  console.log(`\nDESGLOSE DE IVA (precio final → subtotal + IVA 15 %)`)
  for (const total of [3500, 6500, 8600, 22000, 34000]) {
    const { subtotal, iva } = desglosarIva(total)
    const cuadra = subtotal + iva === total
    console.log(
      `  ${dinero(total).padStart(9)}  =  ${dinero(subtotal).padStart(9)} + ${dinero(iva).padStart(8)} IVA   ${cuadra ? '✓' : '✗'}`,
    )
  }
  console.log()
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e)
    process.exit(1)
  },
)
