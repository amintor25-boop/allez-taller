import { Reportes } from '@/components/taller/Reportes'
import { reportesDe } from '@/lib/consultas-reportes'
import { abrirDemo } from '@/lib/demos'

export const dynamic = 'force-dynamic'

export default async function PaginaReportes({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const demo = await abrirDemo(slug)
  return <Reportes d={await reportesDe(demo.id)} />
}
