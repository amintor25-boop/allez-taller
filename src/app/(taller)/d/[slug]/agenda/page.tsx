import { Agenda } from '@/components/taller/Agenda'
import { agendaDe } from '@/lib/consultas-decorativas'
import { abrirDemo } from '@/lib/demos'

export const dynamic = 'force-dynamic'

export default async function PaginaAgenda({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const demo = await abrirDemo(slug)
  return <Agenda slug={slug} citas={await agendaDe(demo.id)} />
}
