import { NextResponse } from 'next/server'
import { tableroDe } from '@/lib/consultas-taller'
import { buscarDemo } from '@/lib/demos'

// Consulta periódica del tablero.
//
// Es lo que hace que la orden se mueva sola cuando el cliente aprueba desde su
// celular. Una sola consulta a la base, sin fotos y sin tocar `ultima_actividad`
// —consultar no es actividad, y si lo fuera el reinicio de 48 h nunca llegaría.

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const demo = await buscarDemo(slug)
  if (!demo) return NextResponse.json({ error: 'demo inexistente' }, { status: 404 })

  const tarjetas = await tableroDe(demo.id)
  return NextResponse.json({ tarjetas }, { headers: { 'cache-control': 'no-store' } })
}
