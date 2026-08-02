import Link from 'next/link'
import { baseUrl } from '@/lib/base-url'
import {
  ETIQUETA_EVENTO,
  PASOS,
  registroDeUso,
  resumenDemos,
  type ResumenDemo,
} from '@/lib/consultas-admin'
import { HORAS_INACTIVIDAD } from '@/lib/demos'
import { CopiarEnlace } from '@/components/taller/CopiarEnlace'

export const dynamic = 'force-dynamic'

// Consola de enlaces. No lleva contraseña a propósito: es una herramienta de una
// sola persona en su propio portátil, y una contraseña olvidada delante de un
// prospecto cuesta más de lo que protege. Tampoco está enlazada desde ninguna
// pantalla del taller ni indexada.

export default async function PaginaAdmin({
  searchParams,
}: {
  searchParams: Promise<{ nuevo?: string; error?: string }>
}) {
  const q = await searchParams
  const [demos, uso, base] = await Promise.all([resumenDemos(), registroDeUso(), baseUrl()])
  const recien = demos.find((d) => d.slug === q.nuevo) ?? null

  const repartidos = demos.filter((d) => !d.esPrincipal)
  const abiertos = repartidos.filter((d) => !d.sinAbrir).length

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-titulo text-pantalla text-tinta">Enlaces de demostración</h1>
          <p className="mt-1 text-meta text-tinta-2">
            Una copia aislada por prospecto · se reinicia sola a las {HORAS_INACTIVIDAD} h sin uso
          </p>
        </div>
        <Link
          href="/d/san-rafael"
          className="presionable flex h-11 items-center rounded-lg border border-borde px-4 text-cuerpo font-semibold text-tinta-2 hover:border-borde-fuerte hover:text-tinta"
        >
          Ir al tablero
        </Link>
      </header>

      {repartidos.length > 0 && (
        <p className="mt-3 text-meta text-tinta-3">
          <span className="cifras font-semibold text-tinta-2">{repartidos.length}</span>{' '}
          {repartidos.length === 1 ? 'repartido' : 'repartidos'} ·{' '}
          <span className="cifras font-semibold text-tinta-2">{abiertos}</span>{' '}
          {abiertos === 1 ? 'lo abrió' : 'lo abrieron'}
        </p>
      )}

      {/* ── Enlace recién creado ─────────────────────────────────────────── */}
      {recien && (
        <section className="entra mt-6 rounded-xl border border-aprobado/50 bg-[#22C55E10] p-5">
          <p className="text-etiqueta font-semibold uppercase text-aprobado">Enlace listo</p>
          <p className="mt-1.5 font-titulo text-seccion text-tinta">{recien.nombre}</p>
          <p className="cifras mt-3 break-all text-cuerpo text-tinta-2">
            {base}/d/{recien.slug}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href={`/d/${recien.slug}`}
              className="presionable flex h-11 items-center rounded-lg bg-accion px-4 text-cuerpo font-semibold text-white hover:bg-accion-hover"
            >
              Abrirlo
            </Link>
            <CopiarEnlace url={`${base}/d/${recien.slug}`} />
          </div>
        </section>
      )}

      {/* ── Generar uno nuevo ────────────────────────────────────────────── */}
      <form
        method="post"
        action="/api/admin/enlace"
        className="mt-6 rounded-xl border border-borde bg-superficie p-5"
      >
        <h2 className="font-titulo text-seccion text-tinta">Nuevo enlace</h2>
        <p className="mt-1 text-meta text-tinta-3">
          Nace con el historial completo: doce meses de facturación, inventario y agenda
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-2 block text-etiqueta font-semibold uppercase text-tinta-2">
              Nombre del taller
            </span>
            <input
              name="nombre"
              required
              maxLength={60}
              placeholder="Taller Hermanos Chávez"
              className="h-12 w-full rounded-xl border border-borde bg-elevada px-4 text-[16px] text-tinta placeholder:text-tinta-3"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-etiqueta font-semibold uppercase text-tinta-2">
              Dirección del enlace
            </span>
            <input
              name="slug"
              maxLength={40}
              placeholder="se genera del nombre"
              className="cifras h-12 w-full rounded-xl border border-borde bg-elevada px-4 text-[16px] text-tinta placeholder:text-tinta-3"
            />
          </label>

          <button
            type="submit"
            className="presionable h-12 rounded-xl bg-accion px-5 text-cuerpo font-semibold text-white hover:bg-accion-hover"
          >
            Crear enlace
          </button>
        </div>

        {q.error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-alta px-3 py-2 text-meta text-tinta"
          >
            {q.error}
          </p>
        )}
      </form>

      {/* ── Los enlaces ──────────────────────────────────────────────────── */}
      <section className="mt-6 overflow-hidden rounded-xl border border-borde bg-superficie">
        <h2 className="border-b border-borde px-5 py-3 text-etiqueta font-semibold uppercase text-tinta-2">
          {demos.length === 1 ? 'Un enlace' : `${demos.length} enlaces`}
        </h2>
        <ul>
          {demos.map((d) => (
            <Fila key={d.slug} demo={d} base={base} />
          ))}
        </ul>
      </section>

      {/* ── Registro de uso ──────────────────────────────────────────────── */}
      <section className="mt-6 overflow-hidden rounded-xl border border-borde bg-superficie">
        <h2 className="border-b border-borde px-5 py-3 text-etiqueta font-semibold uppercase text-tinta-2">
          Registro de uso
        </h2>

        {uso.length === 0 ? (
          <p className="px-5 py-8 text-center text-cuerpo text-tinta-2">
            Todavía no hay nada anotado. Aquí aparece lo que hace cada prospecto dentro de su
            enlace: qué abrió, qué envió, qué aprobó su cliente.
          </p>
        ) : (
          <ul>
            {uso.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-borde px-5 py-1.5 last:border-0"
              >
                <span className="w-40 shrink-0 truncate text-meta font-semibold text-tinta">
                  {ETIQUETA_EVENTO[e.tipo]}
                </span>
                <Link
                  href={`/d/${e.slug}`}
                  className="cifras flex h-11 shrink-0 items-center text-meta text-accion-texto hover:underline"
                >
                  {e.slug}
                </Link>
                <span className="min-w-0 flex-1 truncate text-meta text-tinta-2">{e.detalle}</span>
                <span className="cifras shrink-0 text-meta text-tinta-3" title={e.cuando}>
                  hace {e.hace}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

/**
 * Hasta dónde llegó el prospecto, en cinco tramos.
 *
 * Es lo único de /admin que no ve nadie más que quien reparte los enlaces, y
 * contesta a quién llamar y con qué: al que abrió y se quedó en el tablero se le
 * llama distinto que al que mandó un presupuesto y su cliente ya respondió.
 *
 * Se llena HASTA donde llegó, no marcando uno por uno los pasos que hizo. Alguien
 * puede mandar un presupuesto sin haber arrastrado nunca una tarjeta, y pintar
 * ese hueco en medio parecía un fallo de dibujo en vez de un dato. La precisión
 * la lleva la etiqueta de al lado, que dice el paso exacto.
 *
 * El tramo vacío va en `pista` (#5A6B95): sobre la superficie #111C38 da 3,18:1,
 * el mínimo de un elemento gráfico. Con `borde` serían 1,30 y con `borde-fuerte`
 * 1,73 — a seis píxeles de alto se leería "tres barras" en vez de "tres de
 * cinco", y ahí la idea muere. Los cumplidos van en el azul de acción y el
 * último alcanzado en cian, para que el ojo caiga en dónde se quedó.
 */
function Recorrido({ pasos, hasta }: { pasos: boolean[]; hasta: string | null }) {
  const ultimo = pasos.lastIndexOf(true)

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="flex gap-1" role="img" aria-label={`Llegó hasta: ${hasta ?? 'no lo ha abierto'}`}>
        {PASOS.map((p, i) => (
          <span
            key={p.clave}
            title={p.etiqueta}
            className={`block h-1.5 w-7 rounded-full ${
              i === ultimo ? 'bg-acento' : i < ultimo ? 'bg-accion' : 'bg-pista'
            }`}
          />
        ))}
      </span>
      <span className="text-meta text-tinta-3">
        {hasta ? (
          <>
            llegó a <span className="text-tinta-2">{hasta.toLowerCase()}</span>
          </>
        ) : (
          'no lo ha abierto'
        )}
      </span>
    </div>
  )
}

function Fila({ demo, base }: { demo: ResumenDemo; base: string }) {
  const url = `${base}/d/${demo.slug}`

  return (
    <li className="border-b border-borde px-5 py-4 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/d/${demo.slug}`}
              className="-my-2 inline-flex min-h-11 items-center text-cuerpo font-semibold text-tinta hover:underline"
            >
              {demo.nombre}
            </Link>
            {demo.esPrincipal && (
              <span className="rounded border border-borde px-1.5 py-0.5 text-etiqueta font-semibold uppercase text-tinta-3">
                el de la reunión
              </span>
            )}
            {demo.sinAbrir && !demo.esPrincipal && (
              <span className="rounded border border-borde px-1.5 py-0.5 text-etiqueta font-semibold uppercase text-tinta-3">
                sin abrir
              </span>
            )}
            {demo.soloMiro && (
              <span className="rounded border border-media/40 px-1.5 py-0.5 text-etiqueta font-semibold uppercase text-media">
                solo miró
              </span>
            )}
          </div>
          <p className="cifras mt-1 break-all text-meta text-tinta-3">{url}</p>
          {!demo.esPrincipal && <Recorrido pasos={demo.recorrido} hasta={demo.llegoHasta} />}

          {(demo.ultimoDetalle || !demo.esPrincipal) && (
            <p className="mt-1.5 truncate text-meta text-tinta-2">
              {demo.ultimoDetalle ??
                (demo.sinAbrir ? 'Todavía no lo ha abierto nadie' : 'Entró y no tocó nada')}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <CopiarEnlace url={url} />
          <p className="cifras text-right text-meta text-tinta-3">
            {demo.aperturas > 0 && (
              <>
                {demo.aperturas} {demo.aperturas === 1 ? 'visita' : 'visitas'} · hace{' '}
                {demo.actividadHace}
                <br />
              </>
            )}
            {demo.sinAbrir && !demo.esPrincipal ? (
              <>creado hace {demo.creadoHace}</>
            ) : demo.horasParaReinicio > 0 ? (
              <>se reinicia en {demo.horasParaReinicio} h</>
            ) : (
              <span className="text-media">se reinicia al abrirlo</span>
            )}
          </p>
        </div>
      </div>
    </li>
  )
}
