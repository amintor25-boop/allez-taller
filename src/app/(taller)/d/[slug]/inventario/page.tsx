import { Inventario } from '@/components/taller/Inventario'
import { inventarioDe } from '@/lib/consultas-decorativas'
import { abrirDemo } from '@/lib/demos'

export const dynamic = 'force-dynamic'

export default async function PaginaInventario({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ alta?: string; ajuste?: string; nuevo?: string; error?: string }>
}) {
  const { slug } = await params
  const q = await searchParams
  const demo = await abrirDemo(slug)

  // Sin JavaScript, la ruta contesta con un redirect y estos parámetros son los
  // que dejan la pantalla abierta donde el usuario estaba trabajando.
  const abrirAjuste = q.ajuste ?? q.nuevo ?? null

  return (
    <Inventario
      slug={slug}
      repuestos={await inventarioDe(demo.id)}
      abrirAlta={q.alta === '1' || (!!q.error && !abrirAjuste)}
      abrirAjuste={abrirAjuste}
      aviso={q.error ?? null}
    />
  )
}
