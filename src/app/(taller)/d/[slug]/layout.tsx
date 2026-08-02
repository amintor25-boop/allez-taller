import { Cabecera } from '@/components/taller/Cabecera'
import { Preparando } from '@/components/taller/Preparando'
import { fila } from '@/lib/db'
import { abrirDemo, estaListo } from '@/lib/demos'

export const dynamic = 'force-dynamic'

export default async function LayoutDemo({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // `abrirDemo` crea el demo si el enlace no existía y lo devuelve a su estado
  // inicial si lleva más de 48 h sin actividad. Ningún enlace muere en un 404.
  const demo = await abrirDemo(slug)

  // Un demo recién nacido está sembrándose por detrás. Se enseña la cabecera
  // —para que se vea de quién es el taller— y una pantalla que se recarga sola.
  if (!estaListo(demo)) {
    return (
      <div className="flex min-h-dvh flex-col">
        <Cabecera slug={slug} taller={demo.taller_nombre} ciudad={demo.ciudad} enTaller={0} />
        <Preparando taller={demo.taller_nombre} />
      </div>
    )
  }

  // "En taller" cuenta los carros que están adentro, incluidos los que ya están
  // listos esperando que los retiren. Es el número que un jefe de taller mira.
  const enTaller = await fila<{ n: number }>(
    `SELECT COUNT(*) AS n FROM ordenes WHERE demo_id = ? AND archivada = 0`,
    [demo.id],
  )

  return (
    <div className="flex min-h-dvh flex-col">
      <Cabecera
        slug={slug}
        taller={demo.taller_nombre}
        ciudad={demo.ciudad}
        enTaller={enTaller?.n ?? 0}
      />
      {children}
    </div>
  )
}
