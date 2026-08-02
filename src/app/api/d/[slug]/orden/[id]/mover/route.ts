import { NextResponse } from 'next/server'
import { ahora, fila, lote } from '@/lib/db'
import { buscarDemo, registrarEvento, tocarActividad } from '@/lib/demos'
import { ESTADOS, ESTADO_INFO, token as generarId, type Estado } from '@/lib/dominio'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params

  let destino: Estado
  try {
    destino = (await req.json())?.estado
  } catch {
    return NextResponse.json({ error: 'cuerpo ilegible' }, { status: 400 })
  }
  if (!ESTADOS.includes(destino)) {
    return NextResponse.json({ error: 'estado inválido' }, { status: 400 })
  }

  const demo = await buscarDemo(slug)
  if (!demo) return NextResponse.json({ error: 'demo inexistente' }, { status: 404 })

  // El demo_id va en el WHERE: una orden de otro taller no se puede tocar
  // aunque alguien adivine su id.
  const orden = await fila<{ id: string; numero: number; estado: Estado }>(
    `SELECT id, numero, estado FROM ordenes WHERE demo_id = ? AND id = ? AND archivada = 0`,
    [demo.id, id],
  )
  if (!orden) return NextResponse.json({ error: 'orden inexistente' }, { status: 404 })
  if (orden.estado === destino) return NextResponse.json({ ok: true, sinCambio: true })

  const t = ahora()
  const ultima = await fila<{ n: number | null }>(
    `SELECT MAX(orden_columna) AS n FROM ordenes WHERE demo_id = ? AND estado = ?`,
    [demo.id, destino],
  )

  await lote([
    {
      sql: `UPDATE ordenes SET estado = ?, orden_columna = ?, actualizada_en = ?
             WHERE demo_id = ? AND id = ?`,
      args: [destino, (ultima?.n ?? 0) + 1, t, demo.id, id],
    },
    {
      sql: `INSERT INTO movimientos (id, demo_id, orden_id, desde, hasta, nota, creado_en)
            VALUES (?, ?, ?, ?, ?, 'Movida en el tablero', ?)`,
      args: [`mv_${generarId(10)}`, demo.id, id, orden.estado, destino, t],
    },
  ])

  await registrarEvento(
    demo.id,
    'orden_movida',
    `Orden #0${orden.numero} · ${ESTADO_INFO[orden.estado].corto} → ${ESTADO_INFO[destino].corto}`,
  )
  await tocarActividad(demo.id)

  return NextResponse.json({ ok: true, estado: destino })
}
