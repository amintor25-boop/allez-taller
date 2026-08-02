import Link from 'next/link'
import { BuscadorFacturas } from '@/components/taller/BuscadorFacturas'
import { SelectorMes } from '@/components/taller/SelectorMes'
import {
  buscarComprobantes,
  etiquetaMes,
  ESTADOS_FACTURA,
  POR_PAGINA,
  RANGOS,
  type ClaveOrden,
} from '@/lib/consultas-facturacion'
import { abrirDemo } from '@/lib/demos'
import { dinero, fechaCorta, hora } from '@/lib/dominio'

export const dynamic = 'force-dynamic'

// FACTURACIÓN.
//
// La pantalla que contesta "¿y la contabilidad?". Con 600 comprobantes en la
// base, una tabla sin buscador, filtros, orden y páginas es un muro: todo lo de
// aquí existe para que el dueño llegue en dos toques a la factura que busca.

type Params = {
  rango?: string
  estado?: string
  q?: string
  orden?: string
  dir?: string
  pagina?: string
}

export default async function PaginaFacturacion({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Params>
}) {
  const { slug } = await params
  const sp = await searchParams
  const demo = await abrirDemo(slug)

  const r = await buscarComprobantes(demo.id, {
    rango: sp.rango,
    estado: sp.estado,
    q: sp.q,
    orden: sp.orden as ClaveOrden,
    dir: sp.dir as 'asc' | 'desc',
    pagina: Number(sp.pagina),
  })

  // El mes que sacará el cierre. Con un rango que no es un mes (Hoy, Esta
  // semana, Este año) se usa el mes en curso y el botón lo dice.
  const esMes = /^\d{4}-(0[1-9]|1[0-2])$/.test(r.consulta.rango)
  const ahoraEc = new Date(Date.now() - 5 * 3_600_000)
  const mesDelCierre = esMes
    ? r.consulta.rango
    : `${ahoraEc.getUTCFullYear()}-${String(ahoraEc.getUTCMonth() + 1).padStart(2, '0')}`

  const base = `/d/${slug}/facturacion`
  const con = (cambios: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams()
    const actual: Record<string, string | number | undefined> = {
      rango: r.consulta.rango === 'mes' ? undefined : r.consulta.rango,
      estado: r.consulta.estado === 'todas' ? undefined : r.consulta.estado,
      q: r.consulta.q || undefined,
      orden: r.consulta.orden === 'fecha' ? undefined : r.consulta.orden,
      dir: r.consulta.dir === 'desc' ? undefined : r.consulta.dir,
      pagina: r.consulta.pagina === 1 ? undefined : r.consulta.pagina,
      ...cambios,
    }
    for (const [k, v] of Object.entries(actual)) if (v !== undefined && v !== '') p.set(k, String(v))
    const s = p.toString()
    return s ? `${base}?${s}` : base
  }

  const desde = (r.consulta.pagina - 1) * POR_PAGINA

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <h1 className="font-titulo text-pantalla text-tinta">Facturación</h1>

      {/* ── Rangos ────────────────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {RANGOS.map((x) => (
          <Link
            key={x.clave}
            href={con({ rango: x.clave === 'mes' ? undefined : x.clave, pagina: undefined })}
            className={ficha(
              r.consulta.rango === x.clave || (x.clave === 'mes' && r.consulta.rango === 'mes'),
            )}
          >
            {x.etiqueta}
          </Link>
        ))}
        <SelectorMes
          meses={r.meses}
          valor={/^\d{4}-\d{2}$/.test(r.consulta.rango) ? r.consulta.rango : ''}
          base={base}
        />
      </div>

      {/* ── Estado y búsqueda ─────────────────────────────────────────────── */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {ESTADOS_FACTURA.map((e) => (
          <Link
            key={e.clave}
            href={con({ estado: e.clave === 'todas' ? undefined : e.clave, pagina: undefined })}
            className={ficha(r.consulta.estado === e.clave)}
          >
            {e.etiqueta}
          </Link>
        ))}
        <BuscadorFacturas inicial={r.consulta.q} />
      </div>

      {/* ── El cierre, arriba de la tabla ─────────────────────────────────── */}
      <section className="mt-4 rounded-xl border border-borde bg-superficie p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-etiqueta font-semibold uppercase text-tinta-2">
              Facturado <span className="first-letter:uppercase">{r.etiqueta}</span>
            </p>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="cifras font-titulo text-cifra text-tinta">{dinero(r.total)}</span>
              {r.variacion !== null && (
                <span
                  className={`cifras text-cuerpo font-semibold ${
                    r.variacion >= 0 ? 'text-aprobado' : 'text-alta-texto'
                  }`}
                >
                  {r.variacion >= 0 ? '+' : ''}
                  {r.variacion} % vs {r.etiquetaAnterior.replace(/ de \d{4}$/, '')}
                </span>
              )}
            </div>
            {r.comparacionParcial && r.variacion !== null && (
              <p className="mt-1 text-meta text-tinta-3">
                Comparado con los mismos días transcurridos
              </p>
            )}
          </div>

          {/* El cierre es MENSUAL por definición. Cuando el rango es "Hoy" o
              "Este año" no hay un mes que imprimir, así que el botón dice cuál
              va a sacar en vez de cambiar de período sin avisar. */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/d/${slug}/facturacion/cierre?mes=${mesDelCierre}`}
              className="presionable flex h-11 items-center gap-2 rounded-lg border border-borde px-4 text-cuerpo font-semibold text-tinta hover:border-borde-fuerte"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                <path d="M4.5 6V2.5h7V6M4.5 12H3.5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1M4.5 10h7v3.5h-7z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {esMes ? 'Imprimir cierre' : `Cierre de ${etiquetaMes(mesDelCierre).split(' de ')[0]}`}
            </Link>

            {/* La exportación para el contador existía y funcionaba desde el
                paso 13, pero no tenía ni un botón que llevara a ella: solo se
                llegaba escribiendo la dirección a mano. */}
            <a
              href={`/api/d/${slug}/facturacion/csv?mes=${mesDelCierre}`}
              download
              className="presionable flex h-11 items-center gap-2 rounded-lg border border-borde px-4 text-cuerpo font-semibold text-tinta-2 hover:border-borde-fuerte hover:text-tinta"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                <path d="M8 2.5v8m0 0L5 7.5m3 3 3-3M2.5 12.5h11" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Para el contador
            </a>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-borde pt-4 lg:grid-cols-5">
          <Dato etiqueta="Subtotal" valor={dinero(r.subtotal)} />
          <Dato etiqueta="IVA 15 % cobrado" valor={dinero(r.iva)} acento />
          <Dato etiqueta="Comprobantes" valor={String(r.emitidos)} />
          <Dato etiqueta="Ticket promedio" valor={dinero(r.ticketPromedio)} />
          <Dato etiqueta="Anuladas" valor={String(r.anulados)} apagado />
        </dl>
      </section>

      {/* ── Tabla ─────────────────────────────────────────────────────────── */}
      <section className="mt-4 overflow-hidden rounded-xl border border-borde bg-superficie">
        <div className="hidden grid-cols-[7rem_1fr_9rem_6rem_7rem_8rem] items-center gap-4 border-b border-borde px-5 py-2.5 lg:grid">
          <Encabezado href={con({ orden: 'fecha', dir: sigDir(r.consulta, 'fecha'), pagina: undefined })} activa={r.consulta.orden === 'fecha'} dir={r.consulta.dir}>
            Fecha
          </Encabezado>
          <Encabezado href={con({ orden: 'cliente', dir: sigDir(r.consulta, 'cliente'), pagina: undefined })} activa={r.consulta.orden === 'cliente'} dir={r.consulta.dir}>
            Cliente y comprobante
          </Encabezado>
          <span className="text-etiqueta font-semibold uppercase text-tinta-2">Estado</span>
          <span className="text-right text-etiqueta font-semibold uppercase text-tinta-2">Subtotal</span>
          <span className="text-right text-etiqueta font-semibold uppercase text-tinta-2">IVA</span>
          <Encabezado href={con({ orden: 'total', dir: sigDir(r.consulta, 'total'), pagina: undefined })} activa={r.consulta.orden === 'total'} dir={r.consulta.dir} derecha>
            Total
          </Encabezado>
        </div>

        {r.comprobantes.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-cuerpo text-tinta">
              {r.consulta.q
                ? `Ningún comprobante coincide con «${r.consulta.q}».`
                : 'No se emitió ningún comprobante en este rango.'}
            </p>
            {/* La búsqueda va acotada al rango elegido, y el mes en curso lleva
                pocos días. Sin esta salida, buscar una placa el día 2 devuelve
                nada y parece que el buscador no sirve. */}
            {r.consulta.q && r.consulta.rango !== 'anio' && (
              <p className="mt-1.5 text-meta text-tinta-3">
                La búsqueda mira solo {r.etiqueta.toLowerCase()}.
              </p>
            )}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {r.consulta.q && r.consulta.rango !== 'anio' && (
                <Link
                  href={con({ rango: 'anio', pagina: undefined })}
                  className="presionable inline-flex h-11 items-center rounded-lg bg-accion px-4 text-cuerpo font-semibold text-white hover:bg-accion-hover"
                >
                  Buscarlo en todo el año
                </Link>
              )}
              <Link
                href={base}
                className="presionable inline-flex h-11 items-center rounded-lg border border-borde px-4 text-cuerpo font-semibold text-tinta hover:border-borde-fuerte"
              >
                Ver todo el mes
              </Link>
            </div>
          </div>
        ) : (
          <ul>
            {r.comprobantes.map((f) => (
              <li key={f.id} className="border-b border-borde last:border-0">
                <Link
                  href={`/d/${slug}/orden/${f.ordenId}`}
                  className="presionable grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-elevada lg:grid-cols-[7rem_1fr_9rem_6rem_7rem_8rem]"
                >
                  <span className="cifras order-1 text-meta text-tinta-3">
                    {fechaCorta(f.emitidaEn)}
                    <span className="hidden lg:inline"> · {hora(f.emitidaEn)}</span>
                  </span>

                  <span className="order-3 min-w-0 lg:order-2">
                    <span className="block truncate text-cuerpo text-tinta">{f.cliente}</span>
                    {/* La PLACA va primero. En un teléfono el renglón se corta
                        siempre después del número de comprobante, y la placa
                        —el dato con el que un taller reconoce el trabajo—
                        nunca llegaba a verse. */}
                    <span className="block truncate text-meta text-tinta-3">
                      <span className="cifras">{f.placa}</span> · {f.vehiculo}
                      <span className="hidden sm:inline">
                        {' '}· <span className="cifras">{f.numero}</span>
                      </span>
                    </span>
                  </span>

                  <span className="order-4 lg:order-3">
                    <Distintivo estado={f.estado} />
                  </span>

                  <span className="cifras order-5 hidden text-right text-cuerpo text-tinta-2 lg:block">
                    {dinero(f.subtotal)}
                  </span>
                  <span className="cifras order-6 hidden text-right text-cuerpo text-tinta-2 lg:block">
                    {dinero(f.iva)}
                  </span>
                  <span
                    className={`cifras order-2 text-right font-titulo text-total lg:order-7 ${
                      f.estado === 'anulada' ? 'text-tinta-3 line-through' : 'text-tinta'
                    }`}
                  >
                    {dinero(f.total)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* ── Páginas ─────────────────────────────────────────────────────── */}
        {r.filas > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borde bg-elevada px-5 py-3">
            <p className="cifras text-meta text-tinta-2">
              {desde + 1}–{Math.min(desde + POR_PAGINA, r.filas)} de {r.filas}
            </p>
            {r.paginas > 1 && (
              <div className="flex items-center gap-2">
                <Paso href={con({ pagina: r.consulta.pagina - 1 })} activo={r.consulta.pagina > 1}>
                  Anterior
                </Paso>
                <span className="cifras px-1 text-meta text-tinta-2">
                  {r.consulta.pagina} / {r.paginas}
                </span>
                <Paso
                  href={con({ pagina: r.consulta.pagina + 1 })}
                  activo={r.consulta.pagina < r.paginas}
                >
                  Siguiente
                </Paso>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}

function ficha(activa: boolean): string {
  return `presionable flex h-11 shrink-0 items-center rounded-xl border px-4 text-meta font-semibold ${
    activa
      ? 'border-accion bg-accion text-white'
      : 'border-borde bg-superficie text-tinta-2 hover:border-borde-fuerte hover:text-tinta'
  }`
}

function sigDir(c: { orden: string; dir: string }, columna: string): 'asc' | 'desc' | undefined {
  if (c.orden !== columna) return columna === 'cliente' ? 'asc' : 'desc'
  return c.dir === 'asc' ? 'desc' : 'asc'
}

function Encabezado({
  href,
  activa,
  dir,
  derecha,
  children,
}: {
  href: string
  activa: boolean
  dir: string
  derecha?: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1 text-etiqueta font-semibold uppercase hover:text-tinta ${
        activa ? 'text-tinta' : 'text-tinta-2'
      } ${derecha ? 'justify-end' : ''}`}
    >
      {children}
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className={activa ? '' : 'opacity-0'}>
        <path
          d={dir === 'asc' ? 'M5 2.5 8 7H2z' : 'M5 7.5 2 3h6z'}
          fill="currentColor"
        />
      </svg>
    </Link>
  )
}

function Distintivo({ estado }: { estado: string }) {
  if (estado === 'anulada') {
    return (
      <span className="rounded bg-[#94A3B81F] px-2 py-0.5 text-micro font-semibold uppercase text-baja">
        Anulada
      </span>
    )
  }
  if (estado === 'nota_credito') {
    return (
      <span className="rounded bg-[#F59E0B1F] px-2 py-0.5 text-micro font-semibold uppercase text-media">
        Nota de crédito
      </span>
    )
  }
  return (
    <span className="rounded bg-[#22C55E1F] px-2 py-0.5 text-micro font-semibold uppercase text-aprobado">
      Autorizada
    </span>
  )
}

function Paso({ href, activo, children }: { href: string; activo: boolean; children: React.ReactNode }) {
  if (!activo) {
    return (
      <span className="flex h-11 items-center rounded-lg px-3 text-meta font-semibold text-tinta-3">
        {children}
      </span>
    )
  }
  return (
    <Link
      href={href}
      className="presionable flex h-11 items-center rounded-lg border border-borde px-3 text-meta font-semibold text-tinta hover:border-borde-fuerte"
    >
      {children}
    </Link>
  )
}

function Dato({
  etiqueta,
  valor,
  acento,
  apagado,
}: {
  etiqueta: string
  valor: string
  acento?: boolean
  apagado?: boolean
}) {
  return (
    <div>
      <dt className="text-etiqueta font-semibold uppercase text-tinta-2">{etiqueta}</dt>
      <dd
        className={`cifras mt-1 font-titulo text-[22px] leading-7 ${
          acento ? 'text-media' : apagado ? 'text-tinta-3' : 'text-tinta'
        }`}
      >
        {valor}
      </dd>
    </div>
  )
}
