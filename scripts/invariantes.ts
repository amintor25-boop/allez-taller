// Invariantes de la semilla. Cosas que un dueño de taller o un contador ven en
// dos segundos y que ninguna pantalla debería poder desmentir.
//
//   npm run demo:invariantes
//
// Sale con 1 si alguna falla, para poder encadenarlo.

import { filas, fila } from '../src/lib/db'
import { listarDemos } from '../src/lib/demos'

let fallos = 0

function comprueba(titulo: string, ok: boolean, detalle = '') {
  console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${titulo}${detalle ? '  ' + detalle : ''}`)
  if (!ok) fallos++
}

async function main() {
  for (const demo of await listarDemos()) {
    console.log(`\n${demo.taller_nombre}  ·  /d/${demo.slug}`)
    const d = demo.id

    // ── 1. El número de orden crece con la llegada del carro ────────────────
    const ordenes = await filas<{ numero: number; creada_en: string; placa: string }>(
      `SELECT o.numero, o.creada_en, v.placa FROM ordenes o JOIN vehiculos v ON v.id = o.vehiculo_id
        WHERE o.demo_id = ? ORDER BY o.creada_en`,
      [d],
    )
    // Se compara solo cuando las fechas DIFIEREN: dos órdenes del mismo instante
    // pueden salir en cualquier orden de la consulta y eso no es un defecto.
    const saltosOrden = ordenes.filter(
      (o, i) => i > 0 && o.creada_en !== ordenes[i - 1].creada_en && Number(o.numero) < Number(ordenes[i - 1].numero),
    )
    comprueba(
      'el número de orden crece con el tiempo',
      saltosOrden.length === 0,
      `${ordenes.length} órdenes · ${saltosOrden.length} saltos hacia atrás`,
    )

    // ── 2. El secuencial de factura es estrictamente incremental ────────────
    //
    // Es un contador del SRI: es imposible que una factura de las seis de la
    // mañana lleve número mayor que una de las tres de la tarde del mismo día.
    const facturas = await filas<{ numero: string; emitida_en: string }>(
      `SELECT numero, emitida_en FROM facturas WHERE demo_id = ? ORDER BY emitida_en`,
      [d],
    )
    const sec = (n: string) => Number(n.split('-')[2])
    const saltosFactura = facturas.filter(
      (f, i) => i > 0 && f.emitida_en !== facturas[i - 1].emitida_en && sec(f.numero) < sec(facturas[i - 1].numero),
    )
    comprueba(
      'si ordeno por fecha, los secuenciales quedan ordenados',
      saltosFactura.length === 0,
      `${facturas.length} facturas · ${saltosFactura.length} saltos hacia atrás`,
    )

    // ── 3. Un carro que está adentro no puede tener factura posterior ───────
    const encerrados = await filas<{ placa: string; estado: string; n: number }>(
      `SELECT v.placa, o.estado, COUNT(f.id) AS n
         FROM ordenes o
         JOIN vehiculos v ON v.id = o.vehiculo_id
         JOIN ordenes o2 ON o2.vehiculo_id = v.id AND o2.archivada = 1
         JOIN facturas f ON f.orden_id = o2.id
        WHERE o.demo_id = ? AND o.archivada = 0 AND f.emitida_en > o.creada_en
        GROUP BY v.placa, o.estado`,
      [d],
    )
    comprueba(
      'ningún carro del tablero tiene factura posterior a su ingreso',
      encerrados.length === 0,
      encerrados.length ? encerrados.map((e) => `${e.placa} (${e.estado}, ${e.n})`).join(', ') : '',
    )

    // ── 4. Ninguna factura del futuro ───────────────────────────────────────
    const futuras = await fila<{ n: number }>(
      `SELECT COUNT(*) AS n FROM facturas WHERE demo_id = ? AND emitida_en > ?`,
      [d, new Date().toISOString()],
    )
    comprueba('ninguna factura con fecha futura', Number(futuras?.n) === 0)

    // ── 5. Subtotal + IVA = total, al centavo ───────────────────────────────
    const descuadre = await fila<{ n: number }>(
      `SELECT COUNT(*) AS n FROM facturas WHERE demo_id = ? AND subtotal + iva <> total`,
      [d],
    )
    comprueba('subtotal + IVA = total en todas', Number(descuadre?.n) === 0)

    // ── 6. Cada factura cuelga de una orden del mismo demo ──────────────────
    const huerfanas = await fila<{ n: number }>(
      `SELECT COUNT(*) AS n FROM facturas f
        LEFT JOIN ordenes o ON o.id = f.orden_id AND o.demo_id = f.demo_id
       WHERE f.demo_id = ? AND o.id IS NULL`,
      [d],
    )
    comprueba('ninguna factura huérfana', Number(huerfanas?.n) === 0)

    // ── 7. Las claves de acceso no se repiten ───────────────────────────────
    const repetidas = await fila<{ n: number }>(
      `SELECT COUNT(*) AS n FROM (SELECT clave_acceso FROM facturas WHERE demo_id = ?
        GROUP BY clave_acceso HAVING COUNT(*) > 1)`,
      [d],
    )
    comprueba('ninguna clave de acceso repetida', Number(repetidas?.n) === 0)

    // ── 8. Instantes repetidos: síntoma de datos inventados ─────────────────
    const repetidos = await fila<{ n: number }>(
      `SELECT COUNT(*) AS n FROM (SELECT creada_en FROM ordenes WHERE demo_id = ?
        GROUP BY creada_en HAVING COUNT(*) > 1)`,
      [d],
    )
    comprueba('sin instantes de ingreso repetidos', Number(repetidos?.n) === 0, `${repetidos?.n} instantes con más de una orden`)

    // ── 10. Ni una factura en domingo ───────────────────────────────────────
    //
    // El taller no abre. El domingo se esquivaba al elegir la ENTRADA pero la
    // factura se emite a la SALIDA: salían 95 comprobantes dominicales, más que
    // un lunes. No se veía en ninguna pantalla, pero es falso igual.
    const domingos = await fila<{ n: number }>(
      `SELECT COUNT(*) AS n FROM facturas
        WHERE demo_id = ? AND strftime('%w', datetime(emitida_en, '-5 hours')) = '0'`,
      [d],
    )
    comprueba('ninguna factura emitida en domingo', Number(domingos?.n) === 0, `${domingos?.n}`)

    // ── 11. Cada comprobante lleva su tipo en la clave de acceso ────────────
    //
    // Una nota de crédito no es una factura: va con el 04, no con el 01. Los
    // dígitos 9 y 10 de los 49 son el tipo de comprobante.
    const tipoMal = await fila<{ n: number }>(
      `SELECT COUNT(*) AS n FROM facturas
        WHERE demo_id = ?
          AND substr(clave_acceso, 9, 2) <> CASE WHEN estado = 'nota_credito' THEN '04' ELSE '01' END`,
      [d],
    )
    comprueba('el tipo de comprobante de la clave coincide con el estado', Number(tipoMal?.n) === 0, `${tipoMal?.n} mal`)

    // ── 12. Los tres mecánicos tienen perfiles distintos ────────────────────
    //
    // Si los tres facturan casi lo mismo, el bloque de productividad responde
    // "los tres igual" y no demuestra nada. El que más carros mueve NO debería
    // ser el que más factura: ahí está la gracia del informe.
    const mec = await filas<{ nombre: string; carros: number; plata: number }>(
      `SELECT m.nombre, COUNT(DISTINCT o.id) AS carros, COALESCE(SUM(f.total), 0) AS plata
         FROM ordenes o JOIN mecanicos m ON m.id = o.mecanico_id
         LEFT JOIN facturas f ON f.orden_id = o.id
        WHERE o.demo_id = ? AND o.archivada = 1
        GROUP BY m.nombre`,
      [d],
    )
    const porPlata = [...mec].sort((a, b) => Number(b.plata) - Number(a.plata))
    const porCarros = [...mec].sort((a, b) => Number(b.carros) - Number(a.carros))
    comprueba(
      'el que más carros mueve no es el que más factura',
      mec.length === 3 && porPlata[0].nombre !== porCarros[0].nombre,
      mec.length === 3 ? `${porCarros[0].nombre} mueve más · ${porPlata[0].nombre} factura más` : '',
    )

    // ── 9. El tablero tiene las doce de siempre ─────────────────────────────
    const abiertas = await fila<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ordenes WHERE demo_id = ? AND archivada = 0`,
      [d],
    )
    comprueba('doce órdenes en el tablero', Number(abiertas?.n) === 12, `${abiertas?.n}`)
  }

  console.log(`\n${fallos === 0 ? '\x1b[32mTodos los invariantes se cumplen.\x1b[0m' : `\x1b[31m${fallos} invariantes rotos.\x1b[0m`}`)
  process.exit(fallos === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
