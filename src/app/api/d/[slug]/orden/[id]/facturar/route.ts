import { NextResponse } from 'next/server'
import { ahora, fila, filas, lote } from '@/lib/db'
import { buscarDemo, registrarEvento, tocarActividad } from '@/lib/demos'
import { desglosarIva, dinero, token as generarId } from '@/lib/dominio'
import { claveDeAcceso, numeroFactura } from '@/lib/sri'
import { salidasPorFactura } from '@/lib/bodega'

// Emite la factura de una orden.
//
// El desglose va HACIA ATRÁS: los precios que se cotizaron ya llevan IVA, porque
// así se cotiza en un taller ecuatoriano ("las pastillas son 86"). El subtotal se
// obtiene dividiendo y el IVA por resta, nunca al revés: así subtotal + IVA da
// exactamente el total, sin descuadres de un centavo.

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params

  const demo = await buscarDemo(slug)
  if (!demo) return NextResponse.json({ error: 'demo inexistente' }, { status: 404 })

  const orden = await fila<{ id: string; numero: number; estado: string }>(
    `SELECT id, numero, estado FROM ordenes WHERE demo_id = ? AND id = ? AND archivada = 0`,
    [demo.id, id],
  )
  if (!orden) return NextResponse.json({ error: 'orden inexistente' }, { status: 404 })

  // Si ya está facturada no se emite otra: se devuelve la que existe.
  const previa = await fila<{ numero: string }>(
    `SELECT numero FROM facturas WHERE demo_id = ? AND orden_id = ?`,
    [demo.id, orden.id],
  )
  if (previa) return NextResponse.json({ ok: true, yaFacturada: true, numero: previa.numero })

  const cobrables = await filas<{ precio: number; descripcion: string }>(
    `SELECT precio, descripcion FROM items
      WHERE demo_id = ? AND orden_id = ? AND estado <> 'rechazado' AND estado <> 'propuesto'`,
    [demo.id, orden.id],
  )
  if (cobrables.length === 0) {
    return NextResponse.json({ error: 'La orden no tiene trabajos autorizados' }, { status: 400 })
  }

  const total = cobrables.reduce((s, i) => s + i.precio, 0)
  const { subtotal, iva } = desglosarIva(total)

  // El secuencial avanza en el demo, como avanzaría en un taller de verdad.
  const secuencial = (demo.secuencial ?? 1247) + 1
  const t = ahora()

  const sentencias: { sql: string; args: (string | number | null)[] }[] = [
    {
      sql: `INSERT INTO facturas (id, demo_id, orden_id, numero, clave_acceso, subtotal, iva, total, emitida_en)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `fa_${generarId(12)}`, demo.id, orden.id,
        numeroFactura(secuencial),
        claveDeAcceso({ fechaIso: t, ruc: demo.ruc, secuencial }),
        subtotal, iva, total, t,
      ],
    },
    { sql: `UPDATE demos SET secuencial = ? WHERE id = ?`, args: [secuencial, demo.id] },
  ]

  // Facturar cierra el trabajo: la orden queda lista para entrega.
  if (orden.estado !== 'listo') {
    const ultima = await fila<{ n: number | null }>(
      `SELECT MAX(orden_columna) AS n FROM ordenes WHERE demo_id = ? AND estado = 'listo'`,
      [demo.id],
    )
    sentencias.push({
      sql: `UPDATE ordenes SET estado = 'listo', orden_columna = ?, actualizada_en = ?
             WHERE demo_id = ? AND id = ?`,
      args: [(ultima?.n ?? 0) + 1, t, demo.id, orden.id],
    })
    sentencias.push({
      sql: `INSERT INTO movimientos (id, demo_id, orden_id, desde, hasta, nota, creado_en)
            VALUES (?, ?, ?, ?, 'listo', 'Facturado', ?)`,
      args: [`mv_${generarId(10)}`, demo.id, orden.id, orden.estado, t],
    })
  }

  // Lo que se facturó sale de bodega en el mismo lote: o pasa todo, o nada.
  sentencias.push(...(await salidasPorFactura(demo.id, orden.id, orden.numero, cobrables)))

  await lote(sentencias)

  await registrarEvento(
    demo.id,
    'facturado',
    `Orden #0${orden.numero} · ${numeroFactura(secuencial)} · ${dinero(total)}`,
  )
  await tocarActividad(demo.id)

  return NextResponse.json({ ok: true, numero: numeroFactura(secuencial), total })
}
