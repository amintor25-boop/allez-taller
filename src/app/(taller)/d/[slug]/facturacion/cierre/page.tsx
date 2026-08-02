import Link from 'next/link'
import { BotonImprimir } from '@/components/taller/BotonImprimir'
import { cierreMensual, type Comprobante } from '@/lib/consultas-facturacion'
import { abrirDemo } from '@/lib/demos'
import { dinero, fechaCorta, fechaLarga } from '@/lib/dominio'

export const dynamic = 'force-dynamic'

// El cierre del mes, en papel.
//
// Es lo que el dueño imprime o guarda como PDF y le manda al contador. Va sobre
// blanco porque es un documento, no una pantalla, y porque un fondo oscuro
// gastaría media cartucho de tinta.

export default async function PaginaCierre({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ mes?: string }>
}) {
  const { slug } = await params
  const { mes } = await searchParams
  const demo = await abrirDemo(slug)
  const c = await cierreMensual(demo.id, mes)

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/d/${slug}/facturacion?rango=${c.mes}`}
          className="presionable -ml-2 inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-meta text-tinta-2 hover:text-tinta"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
            <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Facturación
        </Link>
        <BotonImprimir />
      </div>

      <article className="mt-3 rounded-xl border border-borde bg-white text-[#14181F] print:rounded-none print:border-0">
        <div className="px-6 py-7 sm:px-9">
          {/* ── Encabezado ────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E5E7EB] pb-5">
            <div>
              <p className="font-titulo text-[20px] leading-6">{demo.taller_nombre}</p>
              <p className="cifras mt-1 text-[13px] text-[#5C6472]">RUC {demo.ruc}</p>
              <p className="text-[13px] text-[#5C6472]">{demo.ciudad} · Ecuador</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5C6472]">
                Cierre de facturación
              </p>
              <p className="font-titulo text-[20px] leading-6 first-letter:uppercase">{c.etiqueta}</p>
            </div>
          </div>

          {/* ── Resumen ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-5 border-b border-[#E5E7EB] py-6 sm:grid-cols-4">
            <Resumen
              etiqueta="Comprobantes"
              valor={String(c.comprobantes.length)}
              nota={
                c.cuadre.anuladas > 0
                  ? `${c.emitidos} válidos · ${c.cuadre.anuladas} anulada${c.cuadre.anuladas === 1 ? '' : 's'}`
                  : undefined
              }
            />
            <Resumen etiqueta="Subtotal" valor={dinero(c.subtotal)} />
            <Resumen etiqueta="IVA 15 % cobrado" valor={dinero(c.iva)} />
            <Resumen etiqueta="Total facturado" valor={dinero(c.total)} fuerte />
          </div>

          {/* ── Rango de secuenciales ──────────────────────────────────────
              Lo primero que revisa un contador: un número que falta es una
              sanción. Que el sistema lo declare le ahorra la revisión. */}
          {c.secuencialDesde && (
            <p className="cifras border-b border-[#E5E7EB] py-4 text-[13px] text-[#14181F]">
              Del <span className="font-semibold">{c.secuencialDesde}</span> al{' '}
              <span className="font-semibold">{c.secuencialHasta}</span> ·{' '}
              {c.comprobantes.length} comprobantes ·{' '}
              {c.faltantes.length === 0 ? (
                <span className="text-[#15803D]">sin saltos</span>
              ) : (
                <span className="text-[#B91C1C]">
                  faltan {c.faltantes.length}: {c.faltantes.slice(0, 6).join(', ')}
                  {c.faltantes.length > 6 ? '…' : ''}
                </span>
              )}
            </p>
          )}

          {/* ── Cuadre ─────────────────────────────────────────────────────
              El resumen de arriba excluye las anuladas y la tabla de abajo las
              enseña tachadas. Sin esta resta escrita, los dos bloques no cuadran
              a la vista — y eso es lo que un contador señala con el dedo. */}
          <dl className="border-b border-[#E5E7EB] py-5 text-[13px]">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5C6472]">
              Cuadre del mes
            </p>
            <Cuadre
              etiqueta={`Autorizadas (${c.cuadre.autorizadas})`}
              valor={dinero(c.cuadre.totalAutorizadas)}
            />
            {/* Las anuladas NO se restan: se excluyen. Ponerles un menos delante
                dejaba la columna sin cuadrar —10.341 − 465 − 1.780 no da 8.561— y
                una resta que no da es lo primero que un contador señala. Las
                notas de crédito sí suman, en negativo, porque revierten venta. */}
            <Cuadre
              etiqueta={`Anuladas (${c.cuadre.anuladas})`}
              valor={dinero(c.cuadre.totalAnuladas)}
              nota="no suman"
              tenue
            />
            <Cuadre
              etiqueta={`Notas de crédito (${c.cuadre.notas})`}
              valor={dinero(c.cuadre.totalNotas)}
              tenue
            />
            <div className="mt-2 flex justify-between border-t border-[#C9CDD4] pt-2 font-semibold">
              <dt>Neto facturado</dt>
              <dd className="cifras">{dinero(c.total)}</dd>
            </div>
          </dl>

          {/* ── Detalle ───────────────────────────────────────────────────
              La tabla se desplaza DENTRO de su propia caja. En 375 px mide 616 px
              y el artículo tenía overflow-hidden: las columnas Placa, Subtotal,
              IVA y Total quedaban recortadas y no había forma de alcanzarlas.
              Al imprimir no hay desplazamiento que valga, así que ahí se suelta. */}
          <div className="mt-6 overflow-x-auto print:overflow-visible">
          <table className="tabla-larga w-full min-w-[560px] text-[12.5px] print:min-w-0">
            <thead>
              <tr className="border-b border-[#E5E7EB] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5C6472]">
                <th className="pb-2 text-left font-semibold">Fecha</th>
                <th className="pb-2 text-left font-semibold">Comprobante</th>
                <th className="pb-2 text-left font-semibold">Cliente</th>
                <th className="pb-2 text-left font-semibold">Placa</th>
                <th className="pb-2 text-right font-semibold">Subtotal</th>
                <th className="pb-2 text-right font-semibold">IVA</th>
                <th className="pb-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {c.comprobantes.map((f: Comprobante) => (
                <tr key={f.id} className="border-b border-[#F1F2F4]">
                  <td className="cifras py-2 pr-3 whitespace-nowrap">{fechaCorta(f.emitidaEn)}</td>
                  <td className="cifras py-2 pr-3 whitespace-nowrap">
                    {f.numero}
                    {f.estado !== 'autorizada' && (
                      <span className="ml-1 text-[10px] uppercase text-[#5C6472]">
                        {f.estado === 'anulada' ? '(anulada)' : '(nota de crédito)'}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3">{f.cliente}</td>
                  <td className="cifras py-2 pr-3 whitespace-nowrap">{f.placa}</td>
                  <td className="cifras py-2 text-right whitespace-nowrap">{dinero(f.subtotal)}</td>
                  <td className="cifras py-2 pl-3 text-right whitespace-nowrap">{dinero(f.iva)}</td>
                  <td className="cifras py-2 pl-3 text-right font-semibold whitespace-nowrap">
                    {dinero(f.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#14181F] font-semibold">
                <td className="pt-2.5" colSpan={4}>
                  Totales
                </td>
                <td className="cifras pt-2.5 text-right">{dinero(c.subtotal)}</td>
                <td className="cifras pt-2.5 pl-3 text-right">{dinero(c.iva)}</td>
                <td className="cifras pt-2.5 pl-3 text-right">{dinero(c.total)}</td>
              </tr>
            </tfoot>
          </table>
          </div>

          {c.comprobantes.length === 0 && (
            <p className="py-8 text-center text-[13px] text-[#5C6472]">
              No se emitió ninguna factura en este mes.
            </p>
          )}

          <p className="mt-6 text-[11px] text-[#5C6472]">
            Emitido el {fechaLarga(new Date().toISOString())}. Los precios se cotizan con IVA
            incluido; el subtotal resulta de dividir el total para 1,15 y el IVA es la diferencia.
          </p>

          {/* ── Firmas ─────────────────────────────────────────────────────
              Solo al imprimir. Es el papel que el dueño le entrega al contador
              en la mano cada mes: sin esas dos rayas es un PDF, con ellas es un
              documento que se firma y se archiva. En pantalla no pinta nada. */}
          <div className="hidden print:mt-16 print:grid print:grid-cols-2 print:gap-16">
            <div>
              <div className="border-t border-[#14181F]" />
              <p className="mt-1 text-[11px] text-[#5C6472]">Elaborado por</p>
            </div>
            <div>
              <div className="border-t border-[#14181F]" />
              <p className="mt-1 text-[11px] text-[#5C6472]">Recibido por</p>
            </div>
          </div>
        </div>

        <p className="border-t border-[#E5E7EB] bg-[#F7F8FA] px-6 py-3 text-center text-[12px] text-[#5C6472] sm:px-9">
          Documento de demostración · sin validez tributaria
        </p>
      </article>
    </main>
  )
}

function Cuadre({
  etiqueta,
  valor,
  nota,
  tenue,
}: {
  etiqueta: string
  valor: string
  nota?: string
  tenue?: boolean
}) {
  return (
    <div className={`flex items-baseline justify-between py-0.5 ${tenue ? 'text-[#5C6472]' : ''}`}>
      <dt>
        {etiqueta}
        {nota && <span className="ml-2 text-[11px] uppercase tracking-[0.06em]">{nota}</span>}
      </dt>
      <dd className="cifras">{valor}</dd>
    </div>
  )
}

function Resumen({
  etiqueta,
  valor,
  nota,
  fuerte,
}: {
  etiqueta: string
  valor: string
  nota?: string
  fuerte?: boolean
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5C6472]">
        {etiqueta}
      </p>
      <p className={`cifras mt-1 font-titulo ${fuerte ? 'text-[28px] leading-9' : 'text-[19px] leading-7'}`}>
        {valor}
      </p>
      {nota && <p className="cifras mt-0.5 text-[11px] text-[#5C6472]">{nota}</p>}
    </div>
  )
}
