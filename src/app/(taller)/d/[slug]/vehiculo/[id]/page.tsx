import Link from 'next/link'
import { Placa } from '@/components/Placa'
import { vehiculoDe } from '@/lib/consultas-decorativas'
import { abrirDemo } from '@/lib/demos'
import { dinero, ESTADO_INFO, fechaLarga, telefonoLegible } from '@/lib/dominio'
import { NoExiste } from '@/components/taller/NoExiste'

export const dynamic = 'force-dynamic'

// Historial del vehículo: todo lo que se le ha hecho al carro, en una línea de
// tiempo. Es la pantalla que contesta "¿y qué le hicieron la vez pasada?".

export default async function PaginaVehiculo({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params
  const demo = await abrirDemo(slug)
  const v = await vehiculoDe(demo.id, id)
  if (!v) return <NoExiste que="Ese vehículo" />

  const abierta = v.historia.find((h) => !h.archivada)

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <Link
        href={`/d/${slug}`}
        className="presionable -ml-2 inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-meta text-tinta-2 hover:text-tinta"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
          <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Tablero
      </Link>

      {/* ── Ficha ─────────────────────────────────────────────────────────── */}
      <div className="mt-2 rounded-xl border border-borde bg-superficie p-5">
        <div className="flex flex-wrap items-start gap-x-5 gap-y-4">
          <Placa placa={v.placa} tamano="md" />
          <div className="min-w-0 flex-1 basis-full sm:basis-auto">
            <h1 className="font-titulo text-pantalla text-tinta">
              {v.marca} {v.modelo} {v.anio}
            </h1>
            <p className="mt-1 text-meta text-tinta-2">
              {v.color} · {v.kilometraje.toLocaleString('es-EC')} km
            </p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-borde pt-5 sm:grid-cols-4">
          <div>
            <dt className="text-etiqueta font-semibold uppercase text-tinta-2">Dueño</dt>
            <dd className="mt-1 text-cuerpo text-tinta">{v.cliente}</dd>
          </div>
          <div>
            <dt className="text-etiqueta font-semibold uppercase text-tinta-2">Teléfono</dt>
            <dd className="cifras mt-1 text-cuerpo text-tinta">{telefonoLegible(v.telefono)}</dd>
          </div>
          <div>
            <dt className="text-etiqueta font-semibold uppercase text-tinta-2">Visitas</dt>
            <dd className="cifras mt-1 text-cuerpo text-tinta">{v.historia.length}</dd>
          </div>
          <div>
            <dt className="text-etiqueta font-semibold uppercase text-tinta-2">Gastado aquí</dt>
            <dd className="cifras mt-1 font-titulo text-total text-tinta">
              {dinero(v.totalGastado)}
            </dd>
          </div>
        </dl>
      </div>

      {abierta && (
        <Link
          href={`/d/${slug}/orden/${abierta.ordenId}`}
          className="presionable mt-4 flex items-center gap-3 rounded-xl border border-accion bg-[#2563EB14] p-4 hover:bg-[#2563EB22]"
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-acento" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-cuerpo font-semibold text-tinta">
              Está en el taller ahora
            </span>
            <span className="block truncate text-meta text-tinta-2">
              Orden #0{abierta.numero} · {ESTADO_INFO[abierta.estado].largo}
            </span>
          </span>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="shrink-0 text-tinta-2">
            <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}

      {/* ── Línea de tiempo ───────────────────────────────────────────────── */}
      <h2 className="mt-8 text-etiqueta font-semibold uppercase text-tinta-2">
        Todo lo que se le ha hecho
      </h2>

      <ol className="mt-4">
        {v.historia.map((h, i) => (
          <li key={h.ordenId} className="relative flex gap-4 pb-4 last:pb-0">
            {/* riel de la línea de tiempo */}
            <div className="flex shrink-0 flex-col items-center">
              <span
                className={`mt-4 h-2.5 w-2.5 rounded-full ${
                  h.archivada ? 'bg-borde-fuerte' : 'bg-acento'
                }`}
                aria-hidden
              />
              {i < v.historia.length - 1 && <span className="w-px flex-1 bg-borde" aria-hidden />}
            </div>

            <Link
              href={`/d/${slug}/orden/${h.ordenId}`}
              className="presionable min-w-0 flex-1 rounded-xl border border-borde bg-superficie p-4 hover:border-borde-fuerte"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="text-cuerpo font-semibold text-tinta">
                  {fechaLarga(h.fecha)}
                </span>
                <span className="cifras text-meta text-tinta-3">
                  {h.kilometraje.toLocaleString('es-EC')} km
                </span>
              </div>

              <p className="mt-1.5 text-cuerpo text-tinta-2">{h.servicios}</p>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-borde pt-3">
                <span className="cifras text-meta text-tinta-3">#0{h.numero}</span>
                {h.mecanico && (
                  <span className="text-meta text-tinta-3">{h.mecanico.split(' ')[0]}</span>
                )}
                {h.factura ? (
                  <span className="cifras rounded bg-[#22C55E1F] px-2 py-0.5 text-micro font-semibold uppercase text-aprobado">
                    {h.factura}
                  </span>
                ) : (
                  <span className="rounded bg-elevada px-2 py-0.5 text-micro font-semibold uppercase text-tinta-2">
                    {ESTADO_INFO[h.estado].largo}
                  </span>
                )}
                <span className="cifras ml-auto font-titulo text-total text-tinta">
                  {dinero(h.total)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ol>

      {v.historia.length === 0 && (
        <p className="mt-4 rounded-xl border border-dashed border-borde px-5 py-8 text-center text-cuerpo text-tinta-2">
          Este carro todavía no ha entrado al taller.
        </p>
      )}
    </main>
  )
}
