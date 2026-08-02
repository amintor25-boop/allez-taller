import { ahora, lote } from './db'
import { INVENTARIO, ORDENES, VEHICULOS, generarHistorial, semillaDe } from './datos-semilla'
import { ESTADOS, centavos } from './dominio'
import type { Demo } from './semilla'

// Devolver el demo a su estado inicial SIN volver a sembrarlo.
//
// Sembrar son 3.226 sentencias en nueve idas a la red. Eso corriendo dentro de
// la petición del prospecto —que es cuando salta el reinicio de las 48 horas—
// es una bomba: si contra Turso pasa de diez segundos, la función de Netlify se
// corta y lo que ve es un error al abrir su enlace al día siguiente.
//
// Casi nada de lo sembrado cambia durante una demostración. No se toca el
// historial de doce meses, ni los vehículos, ni las citas, ni los mecánicos.
// Lo único que se mueve es:
//
//   · las doce órdenes del tablero (estado, columna, respuestas del cliente),
//   · sus renglones (un hallazgo pasa de propuesto a aprobado o rechazado),
//   · lo que nace en la sesión: órdenes nuevas, hallazgos, fotos, facturas,
//   · las existencias del inventario,
//   · el kilometraje de un vehículo al recibirlo,
//   · el secuencial de facturación.
//
// Así que restaurar es borrar lo nacido y devolver a su sitio esas pocas cosas.
//
// CÓMO SE DISTINGUE LO SEMBRADO DE LO NACIDO: todo id de la semilla empieza por
// el identificador del demo (`d_abc123-o-418`, `d_abc123-p-7`), y todo lo que
// crean las rutas lleva un token al azar (`or_…`, `fa_…`, `it_…`). Comprobado
// sobre la base: 0 filas sembradas sin ese prefijo, en las diez tablas.

export type Restauracion = { sentencias: number; borradas: number; restauradas: number }

export async function restaurarDemo(demo: Pick<Demo, 'id' | 'taller_nombre'> & { slug?: string }): Promise<Restauracion> {
  const d = demo.id
  const mio = `${d}-%`
  const t = ahora()

  const borrados: { sql: string; args: (string | number | null)[] }[] = []

  // ── Lo nacido en la sesión ────────────────────────────────────────────────
  //
  // Las salidas de bodega por factura se van siempre (llevan orden_id). Del
  // resto de movimientos de stock se van los de piezas sembradas; los de las
  // piezas que dio de alta el prospecto se quedan con ellas.
  borrados.push({
    sql: `DELETE FROM movimientos_stock
           WHERE demo_id = ?
             AND (orden_id IS NOT NULL
                  OR (id NOT LIKE ?
                      AND repuesto_id IN (SELECT id FROM inventario WHERE demo_id = ? AND sembrada = 1)))`,
    args: [d, mio, d],
  })

  // El orden importa: los hijos antes que los padres.
  for (const tabla of ['facturas', 'items', 'movimientos', 'fotos', 'ordenes', 'vehiculos', 'clientes']) {
    borrados.push({ sql: `DELETE FROM ${tabla} WHERE demo_id = ? AND id NOT LIKE ?`, args: [d, mio] })
  }

  // ── Las doce órdenes del tablero, a su sitio ──────────────────────────────
  const porColumna: Record<string, number> = {}
  const restaurados: { sql: string; args: (string | number | null)[] }[] = []

  // Los renglones se agrupan por el estado al que vuelven: cuatro sentencias en
  // vez de una por renglón.
  const porEstado: Record<string, string[]> = {}

  for (const o of ORDENES) {
    const ordenId = `${d}-o-${o.numero}`
    const columna = (porColumna[o.estado] = (porColumna[o.estado] ?? 0) + 1)
    const creada = new Date(Date.now() - o.haceMin * 60_000).toISOString()

    restaurados.push({
      sql: `UPDATE ordenes
               SET estado = ?, orden_columna = ?, prioridad = ?, archivada = 0,
                   presupuesto_enviado_en = ?, respondido_en = ?, respondido_por = ?,
                   actualizada_en = ?
             WHERE demo_id = ? AND id = ?`,
      args: [
        o.estado, columna, o.prioridad,
        o.presupuestoHaceMin ? new Date(Date.now() - o.presupuestoHaceMin * 60_000).toISOString() : null,
        o.respondidoHaceMin ? new Date(Date.now() - o.respondidoHaceMin * 60_000).toISOString() : null,
        o.respondidoHaceMin ? (VEHICULOS.find((v) => v.placa === o.placa)?.cliente ?? null) : null,
        creada, d, ordenId,
      ],
    })

    // La bitácora que se escribió durante la sesión ya se borró con el DELETE de
    // arriba (sus ids son al azar); la sembrada sigue intacta.
    o.items.forEach((it, i) => {
      const estado = it.estado ?? 'incluido'
      ;(porEstado[estado] ??= []).push(`${ordenId}-i-${i}`)
    })
  }

  for (const [estado, ids] of Object.entries(porEstado)) {
    restaurados.push({
      sql: `UPDATE items SET estado = ? WHERE demo_id = ? AND id IN (${ids.map(() => '?').join(',')})`,
      args: [estado, d, ...ids],
    })
  }

  // ── Existencias e inventario sembrado ─────────────────────────────────────
  INVENTARIO.forEach((p, i) => {
    restaurados.push({
      sql: `UPDATE inventario SET stock = ?, stock_minimo = ?, precio = ? WHERE demo_id = ? AND id = ?`,
      args: [p.stock, p.minimo, centavos(p.precio), d, `${d}-p-${i}`],
    })
  })

  // ── Kilometraje de los vehículos ──────────────────────────────────────────
  for (const v of VEHICULOS) {
    restaurados.push({
      sql: `UPDATE vehiculos SET kilometraje = ? WHERE demo_id = ? AND id = ?`,
      args: [v.km, d, `${d}-v-${v.placa.replace('-', '')}`],
    })
  }

  // ── El secuencial de facturación vuelve a donde lo dejó la semilla ────────
  const historial = generarHistorial(semillaDe(demo.slug ?? demo.taller_nombre)).length
  restaurados.push({
    sql: `UPDATE demos SET secuencial = ?, ultima_actividad = ? WHERE id = ?`,
    args: [1000 + historial, t, d],
  })

  await lote([...borrados, ...restaurados])

  return {
    sentencias: borrados.length + restaurados.length,
    borradas: borrados.length,
    restauradas: restaurados.length,
  }
}

/** Verdadero cuando el demo tiene su semilla puesta. */
export function pareceSembrado(nOrdenes: number): boolean {
  return nOrdenes >= ORDENES.length
}

export { ESTADOS }
