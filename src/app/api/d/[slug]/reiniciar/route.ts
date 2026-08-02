import { NextResponse } from 'next/server'
import { buscarDemo, reiniciarDemo } from '@/lib/demos'

// Devuelve el demo a su estado inicial.
//
// Vuelve todo el trabajo del taller —órdenes, presupuestos, facturas— a como
// estaba sembrado. Lo que el prospecto dio de alta en el inventario se queda:
// "lo que usted agregó se queda; lo demás vuelve a como estaba".
//
// Es un formulario nativo con redirect 303, así que funciona sin JavaScript.

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const esFormulario = !(req.headers.get('content-type') ?? '').includes('application/json')
  const demo = await buscarDemo(slug)
  if (!demo) {
    return esFormulario
      ? NextResponse.redirect(new URL(`/d/${slug}`, req.url), 303)
      : NextResponse.json({ error: 'demo inexistente' }, { status: 404 })
  }

  await reiniciarDemo(demo)

  return esFormulario
    ? NextResponse.redirect(new URL(`/d/${slug}/configuracion?reiniciado=1`, req.url), 303)
    : NextResponse.json({ ok: true })
}
