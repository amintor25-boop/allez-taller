import Link from 'next/link'
import { Placa } from '@/components/Placa'
import { nombreDia } from '@/lib/dominio'
import type { Cita } from '@/lib/consultas-decorativas'

// La semana del taller. Se desplaza en horizontal en el celular, igual que el
// tablero: es el mismo gesto y no hay que aprender nada nuevo.

/** El taller abre de ocho a seis. Fuera de eso no hay nada que enseñar. */
const APERTURA = 8
const CIERRE = 18
const PIXELES_HORA = 42
const ALTO = (CIERRE - APERTURA) * PIXELES_HORA
const HORAS = Array.from({ length: CIERRE - APERTURA + 1 }, (_, i) => APERTURA + i)

/** 0.75 → "45 min" · 1.5 → "1 h 30" · 2 → "2 h". "0.75 h" no lo dice nadie. */
function duracion(horas: number): string {
  const h = Math.floor(horas)
  const m = Math.round((horas - h) * 60)
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m}`
}

/** "10:30" → 10,5 */
function enHoras(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h + (m || 0) / 60
}

export function Agenda({ slug, citas }: { slug: string; citas: Cita[] }) {
  const dias = [0, 1, 2, 3, 4, 5]

  // Las horas que quedan libres, que es lo que el dueño anda buscando.
  const ocupadas = citas.reduce((s, c) => s + c.horas, 0)
  const capacidad = (CIERRE - APERTURA) * dias.length

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-titulo text-pantalla text-tinta">Agenda</h1>
          <p className="mt-1 text-meta text-tinta-2">
            {citas.length} citas · {duracion(ocupadas)} de {capacidad} h ocupadas
          </p>
        </div>
        <Link
          href={`/d/${slug}/recepcion`}
          className="presionable flex h-11 items-center rounded-lg border border-borde px-4 text-cuerpo font-semibold text-tinta hover:border-borde-fuerte"
        >
          Recibir un carro ahora
        </Link>
      </div>

      <div className="mt-5 flex gap-3 overflow-x-auto pb-4">
        {dias.map((dia) => {
          const delDia = citas.filter((c) => c.dia === dia)
          return (
            <section
              key={dia}
              className="w-[240px] shrink-0 rounded-xl bg-columna"
              aria-label={`${nombreDia(dia)}, ${delDia.length} citas`}
            >
              <div className="flex items-baseline justify-between px-3 pb-2 pt-3">
                <span className="text-etiqueta font-semibold uppercase text-tinta-2">
                  {nombreDia(dia)}
                </span>
                <span className="cifras text-etiqueta font-semibold text-tinta-3">
                  {delDia.length}
                </span>
              </div>
              <div className="mx-3 h-0.5 rounded-full bg-borde" aria-hidden />

              {/* El riel de horas. Cada cita se coloca a su hora y ocupa el
                  alto de lo que dura, así que LOS HUECOS QUEDAN DIBUJADOS — que
                  es la única pregunta por la que alguien abre una agenda:
                  "¿cuándo puedo meter otro carro?". Con la lista de antes había
                  que restar horas mentalmente para saberlo. */}
              {/* Alto FIJO y sin `flex-1`: dentro de una columna flexible de alto
                  automático, `flex-1` pone la base en cero y el riel se colapsa a
                  unos pocos píxeles. */}
              <div className="relative mx-3 mb-3 mt-1" style={{ height: `${ALTO}px` }}>
                {HORAS.map((h) => (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-t border-borde/60"
                    style={{ top: `${(h - APERTURA) * PIXELES_HORA}px` }}
                  >
                    <span className="cifras absolute -top-2 left-0 bg-columna pr-1 text-micro text-tinta-3">
                      {String(h).padStart(2, '0')}
                    </span>
                  </div>
                ))}

                {delDia.map((c) => {
                  const inicio = enHoras(c.hora)
                  // Por debajo de una hora el recuadro no llega a los 38 px que
                  // necesita la placa dibujada y se le corta el número por abajo.
                  // Ahí va como texto: sigue siendo la placa, y la geometría del
                  // riel no miente para hacerle sitio.
                  const contenido = <TarjetaCita c={c} compacta={c.horas < 1} />
                  const estilo = {
                    top: `${(inicio - APERTURA) * PIXELES_HORA}px`,
                    height: `${Math.max(34, c.horas * PIXELES_HORA - 4)}px`,
                  }
                  return c.vehiculoId ? (
                    <Link
                      key={c.id}
                      href={`/d/${slug}/vehiculo/${c.vehiculoId}`}
                      style={estilo}
                      className="presionable absolute left-7 right-0 overflow-hidden rounded-[10px] border border-borde bg-superficie px-2.5 py-1.5 hover:border-borde-fuerte"
                    >
                      {contenido}
                    </Link>
                  ) : (
                    <div
                      key={c.id}
                      style={estilo}
                      className="absolute left-7 right-0 overflow-hidden rounded-[10px] border border-borde bg-superficie px-2.5 py-1.5"
                    >
                      {contenido}
                    </div>
                  )
                })}

                {delDia.length === 0 && (
                  <p className="absolute left-7 right-0 top-1/2 -translate-y-1/2 rounded-lg border border-dashed border-borde px-3 py-4 text-center text-meta text-tinta-3">
                    Día libre
                  </p>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}

function TarjetaCita({ c, compacta }: { c: Cita; compacta?: boolean }) {
  if (compacta) {
    return (
      <div className="flex items-center gap-2">
        <span className="cifras shrink-0 text-meta font-semibold text-tinta">{c.hora}</span>
        <span className="cifras shrink-0 text-meta text-tinta-2">{c.placa}</span>
        <span className="min-w-0 flex-1 truncate text-micro text-tinta-3">{c.servicio}</span>
        <span className="cifras shrink-0 text-micro text-tinta-3">{duracion(c.horas)}</span>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="cifras text-meta font-semibold text-tinta">
          {c.hora}
          <span className="ml-1.5 font-normal text-tinta-3">{duracion(c.horas)}</span>
        </span>
        <Placa placa={c.placa} tamano="sm" />
      </div>
      <p className="mt-1 truncate text-meta text-tinta">{c.servicio}</p>
      <p className="truncate text-micro text-tinta-3">{c.cliente}</p>
      {c.siglas && (
        <div className="mt-2.5 flex items-center gap-2 border-t border-borde pt-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-elevada text-[10px] font-semibold text-tinta-2">
            {c.siglas}
          </span>
          <span className="truncate text-meta text-tinta-3">{c.mecanico?.split(' ')[0]}</span>
        </div>
      )}
    </>
  )
}
