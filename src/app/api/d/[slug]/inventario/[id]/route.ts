import { NextResponse } from 'next/server'
import { fila } from '@/lib/db'
import { ajustarStock } from '@/lib/bodega'
import { buscarDemo, registrarEvento, tocarActividad } from '@/lib/demos'

// Ajuste de existencias. Siempre con motivo: un stock que cambia sin explicación
// es justo lo que hace que nadie confíe en el inventario de un sistema.

const MOTIVOS = ['Conteo físico', 'Compra a proveedor', 'Devolución', 'Merma o daño', 'Corrección']

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params

  const esFormulario = !(req.headers.get('content-type') ?? '').includes('application/json')
  const volver = (parametros = '') =>
    NextResponse.redirect(new URL(`/d/${slug}/inventario${parametros}`, req.url), 303)
  const falla = (mensaje: string, estado: number) =>
    esFormulario
      ? volver(`?error=${encodeURIComponent(mensaje)}`)
      : NextResponse.json({ error: mensaje }, { status: estado })

  let cuerpo: any
  try {
    cuerpo = esFormulario ? Object.fromEntries(await req.formData()) : await req.json()
  } catch {
    return falla('No se entendió el formulario', 400)
  }

  const demo = await buscarDemo(slug)
  if (!demo) return falla('demo inexistente', 404)

  const repuesto = await fila<{ nombre: string; stock: number }>(
    `SELECT nombre, stock FROM inventario WHERE demo_id = ? AND id = ?`,
    [demo.id, id],
  )
  if (!repuesto) return falla('repuesto inexistente', 404)

  const pedido = Math.round(Number(cuerpo.stock))
  if (!Number.isFinite(pedido)) return falla('Cantidad inválida', 400)
  const nuevo = Math.max(0, Math.min(9999, pedido))

  const motivo = MOTIVOS.includes(cuerpo.motivo) ? cuerpo.motivo : 'Corrección'

  await ajustarStock(demo.id, id, nuevo, motivo)

  const signo = nuevo - repuesto.stock
  await registrarEvento(
    demo.id,
    'stock_ajustado',
    `${repuesto.nombre} · ${repuesto.stock} → ${nuevo} (${motivo})`,
  )
  await tocarActividad(demo.id)

  return esFormulario
    ? volver(`?nuevo=${id}#${id}`)
    : NextResponse.json({ ok: true, stock: nuevo, diferencia: signo })
}
