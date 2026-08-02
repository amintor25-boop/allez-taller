import { NextResponse } from 'next/server'
import { ejecutar } from '@/lib/db'
import { buscarDemo } from '@/lib/demos'

// Marca el recorrido como visto. Lo llama `sendBeacon`, que no espera respuesta
// y sobrevive a que la pestaña se cierre en ese mismo instante.

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const demo = await buscarDemo(slug)
  if (!demo) return NextResponse.json({ error: 'demo inexistente' }, { status: 404 })

  await ejecutar(`UPDATE demos SET tour_visto = 1 WHERE id = ?`, [demo.id])
  return NextResponse.json({ ok: true })
}
