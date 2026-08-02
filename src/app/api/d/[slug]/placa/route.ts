import { NextResponse } from 'next/server'
import { buscarPlaca } from '@/lib/consultas-taller'
import { buscarDemo } from '@/lib/demos'

// Búsqueda de placa. La llama Recepción mientras se escribe, así que tiene que
// ser barata: dos idas a la base como mucho y ninguna foto.

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const placa = new URL(req.url).searchParams.get('placa') ?? ''

  const demo = await buscarDemo(slug)
  if (!demo) return NextResponse.json({ error: 'demo inexistente' }, { status: 404 })

  const r = await buscarPlaca(demo.id, placa)
  return NextResponse.json(r, { headers: { 'cache-control': 'no-store' } })
}
