import { ahora, filas, lote } from './db'
import { token } from './dominio'

// Bodega: el puente entre el inventario y la facturación.
//
// Cuando se emite una factura, lo que se usó tiene que salir del stock. Si no,
// el inventario es un adorno: diría ocho juegos de pastillas para siempre,
// aunque el taller los haya vendido todos.

/** Sin tildes, sin mayúsculas y sin espacios de más: para comparar nombres. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * ¿Este renglón de la orden corresponde a este repuesto de bodega?
 *
 * Se compara por prefijo en los dos sentidos, que es como están escritos los
 * nombres de verdad: el renglón dice "Pastillas de freno delanteras" y en
 * bodega figura "Pastillas de freno delanteras Sail". Un "contiene" a secas
 * daría falsos positivos entre repuestos de marcas distintas.
 */
function coinciden(renglon: string, repuesto: string): boolean {
  const a = normalizar(renglon)
  const b = normalizar(repuesto)
  if (a.length < 6 || b.length < 6) return false
  return a.startsWith(b) || b.startsWith(a)
}

export type Movimiento = {
  id: string
  cantidad: number
  motivo: string
  orden_id: string | null
  creado_en: string
}

/**
 * Descuenta de bodega lo que se facturó y deja constancia de cada salida.
 * Devuelve las sentencias para que entren en el mismo lote que la factura: o
 * pasa todo, o no pasa nada.
 */
export async function salidasPorFactura(
  demoId: string,
  ordenId: string,
  numeroOrden: number,
  renglones: { descripcion: string }[],
): Promise<{ sql: string; args: (string | number | null)[] }[]> {
  if (renglones.length === 0) return []

  const bodega = await filas<{ id: string; nombre: string; stock: number }>(
    `SELECT id, nombre, stock FROM inventario WHERE demo_id = ?`,
    [demoId],
  )
  if (bodega.length === 0) return []

  const t = ahora()
  const sentencias: { sql: string; args: (string | number | null)[] }[] = []
  for (const r of renglones) {
    const pieza = bodega.find((b) => coinciden(r.descripcion, b.nombre))
    // Un repuesto por renglón: si la misma orden lleva dos veces el mismo
    // nombre, se descuenta una vez por renglón, no una sola en total.
    if (!pieza) continue

    sentencias.push({
      // MAX(0, …) para que un stock mal contado nunca quede en negativo.
      sql: `UPDATE inventario SET stock = MAX(0, stock - 1) WHERE demo_id = ? AND id = ?`,
      args: [demoId, pieza.id],
    })
    sentencias.push({
      sql: `INSERT INTO movimientos_stock (id, demo_id, repuesto_id, cantidad, motivo, orden_id, creado_en)
            VALUES (?, ?, ?, -1, ?, ?, ?)`,
      args: [`ms_${token(10)}`, demoId, pieza.id, `Orden #0${numeroOrden}`, ordenId, t],
    })
  }

  return sentencias
}

/** Los últimos movimientos de cada repuesto, para el detalle en pantalla. */
export async function movimientosDe(demoId: string, repuestoId: string): Promise<Movimiento[]> {
  return filas<Movimiento>(
    `SELECT id, cantidad, motivo, orden_id, creado_en
       FROM movimientos_stock WHERE demo_id = ? AND repuesto_id = ?
   ORDER BY creado_en DESC LIMIT 8`,
    [demoId, repuestoId],
  )
}

/** Ajuste manual de existencias, siempre con motivo. */
export async function ajustarStock(
  demoId: string,
  repuestoId: string,
  nuevo: number,
  motivo: string,
): Promise<void> {
  const actual = await filas<{ stock: number }>(
    `SELECT stock FROM inventario WHERE demo_id = ? AND id = ?`,
    [demoId, repuestoId],
  )
  if (actual.length === 0) throw new Error('Ese repuesto no existe')

  const diferencia = nuevo - actual[0].stock
  if (diferencia === 0) return

  await lote([
    {
      sql: `UPDATE inventario SET stock = ? WHERE demo_id = ? AND id = ?`,
      args: [nuevo, demoId, repuestoId],
    },
    {
      sql: `INSERT INTO movimientos_stock (id, demo_id, repuesto_id, cantidad, motivo, orden_id, creado_en)
            VALUES (?, ?, ?, ?, ?, NULL, ?)`,
      args: [`ms_${token(10)}`, demoId, repuestoId, diferencia, motivo, ahora()],
    },
  ])
}
