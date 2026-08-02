import { NextResponse } from 'next/server'
import { ahora, fila, lote } from '@/lib/db'
import { buscarDemo, registrarEvento, tocarActividad } from '@/lib/demos'
import { centavos, dinero, token as generarId } from '@/lib/dominio'
import { idFotoSembrada } from '@/lib/semilla'

// Agrega un hallazgo a la orden: lo que el mecánico encuentra durante el
// diagnóstico y necesita el visto bueno del dueño del carro.

const MAX_FOTO = 220_000

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params

  let cuerpo: any
  try {
    cuerpo = await req.json()
  } catch {
    return NextResponse.json({ error: 'cuerpo ilegible' }, { status: 400 })
  }

  const demo = await buscarDemo(slug)
  if (!demo) return NextResponse.json({ error: 'demo inexistente' }, { status: 404 })

  const descripcion = String(cuerpo.descripcion ?? '').trim().slice(0, 120)
  const detalle = String(cuerpo.detalle ?? '').trim().slice(0, 200)
  const precio = centavos(Number(cuerpo.precio) || 0)

  if (!descripcion) return NextResponse.json({ error: 'Falta qué se encontró' }, { status: 400 })
  if (precio <= 0) return NextResponse.json({ error: 'Falta el precio' }, { status: 400 })

  const orden = await fila<{ id: string; numero: number }>(
    `SELECT id, numero FROM ordenes WHERE demo_id = ? AND id = ? AND archivada = 0`,
    [demo.id, id],
  )
  if (!orden) return NextResponse.json({ error: 'orden inexistente' }, { status: 404 })

  const t = ahora()
  const sentencias: { sql: string; args: (string | number | null)[] }[] = []

  // La foto puede venir de tres sitios: una sembrada (la ruta rápida de la
  // reunión), una tomada en vivo, o ninguna.
  let fotoId: string | null = null
  if (cuerpo.fotoSembrada) {
    const posible = idFotoSembrada(demo.id, String(cuerpo.fotoSembrada))
    if (posible) fotoId = posible
  } else if (cuerpo.foto?.datos) {
    if (String(cuerpo.foto.datos).length > MAX_FOTO) {
      return NextResponse.json({ error: 'La foto pesa demasiado' }, { status: 413 })
    }
    fotoId = `f_${generarId(10)}`
    sentencias.push({
      sql: `INSERT INTO fotos (id, demo_id, orden_id, mime, datos, ruta_estatica, creada_en)
            VALUES (?, ?, ?, ?, ?, NULL, ?)`,
      args: [fotoId, demo.id, orden.id, String(cuerpo.foto.mime ?? 'image/jpeg'), String(cuerpo.foto.datos), t],
    })
  }

  const itemId = `i_${generarId(12)}`
  sentencias.push({
    sql: `INSERT INTO items (id, demo_id, orden_id, tipo, descripcion, detalle, precio, estado, foto_id, creado_en)
          VALUES (?, ?, ?, 'hallazgo', ?, ?, ?, 'propuesto', ?, ?)`,
    args: [itemId, demo.id, orden.id, descripcion, detalle, precio, fotoId, t],
  })
  sentencias.push({
    sql: `UPDATE ordenes SET actualizada_en = ? WHERE demo_id = ? AND id = ?`,
    args: [t, demo.id, orden.id],
  })

  await lote(sentencias)

  await registrarEvento(
    demo.id,
    'hallazgo_agregado',
    `Orden #0${orden.numero} · ${descripcion} ${dinero(precio)}`,
  )
  await tocarActividad(demo.id)

  return NextResponse.json({ itemId, descripcion, precio })
}
