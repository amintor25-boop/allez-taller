import { Recepcion } from '@/components/taller/Recepcion'

export const dynamic = 'force-dynamic'

export default async function PaginaRecepcion({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <Recepcion slug={slug} />
}
