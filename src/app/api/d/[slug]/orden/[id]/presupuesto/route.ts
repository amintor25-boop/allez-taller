import { NextResponse } from 'next/server'
import { ahora, fila, filas, lote } from '@/lib/db'
import { buscarDemo, registrarEvento, tocarActividad } from '@/lib/demos'
import { dinero, token as generarId } from '@/lib/dominio'
import { urlPublicaOrden } from '@/lib/base-url'

// Envía el presupuesto: deja la orden esperando al cliente y devuelve el enlace
// público que va dentro del QR.

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params

  const demo = await buscarDemo(slug)
  if (!demo) return NextResponse.json({ error: 'demo inexistente' }, { status: 404 })

  const orden = await fila<{ id: string; numero: number; estado: string; token_publico: string }>(
    `SELECT id, numero, estado, token_publico FROM ordenes
      WHERE demo_id = ? AND id = ? AND archivada = 0`,
    [demo.id, id],
  )
  if (!orden) return NextResponse.json({ error: 'orden inexistente' }, { status: 404 })

  const pendientes = await filas<{ precio: number }>(
    `SELECT precio FROM items WHERE demo_id = ? AND orden_id = ? AND estado = 'propuesto'`,
    [demo.id, orden.id],
  )
  if (pendientes.length === 0) {
    return NextResponse.json(
      { error: 'Agregue primero un hallazgo para que el cliente lo apruebe' },
      { status: 400 },
    )
  }

  const t = ahora()
  const ultima = await fila<{ n: number | null }>(
    `SELECT MAX(orden_columna) AS n FROM ordenes WHERE demo_id = ? AND estado = 'aprobacion'`,
    [demo.id],
  )

  const sentencias: { sql: string; args: (string | number | null)[] }[] = [
    {
      sql: `UPDATE ordenes SET estado = 'aprobacion', presupuesto_enviado_en = ?,
                   orden_columna = ?, actualizada_en = ?
             WHERE demo_id = ? AND id = ?`,
      args: [t, (ultima?.n ?? 0) + 1, t, demo.id, orden.id],
    },
  ]

  if (orden.estado !== 'aprobacion') {
    sentencias.push({
      sql: `INSERT INTO movimientos (id, demo_id, orden_id, desde, hasta, nota, creado_en)
            VALUES (?, ?, ?, ?, 'aprobacion', 'Presupuesto enviado al cliente', ?)`,
      args: [`mv_${generarId(10)}`, demo.id, orden.id, orden.estado, t],
    })
  }

  await lote(sentencias)

  const monto = pendientes.reduce((s, i) => s + i.precio, 0)
  await registrarEvento(
    demo.id,
    'presupuesto_enviado',
    `Orden #0${orden.numero} · ${dinero(monto)} enviado al cliente`,
  )
  await tocarActividad(demo.id)

  return NextResponse.json({ ok: true, url: await urlPublicaOrden(orden.token_publico) })
}
