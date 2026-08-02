import Link from 'next/link'
import { Placa } from '@/components/Placa'
import { nombreDia } from '@/lib/dominio'
import type { Cita } from '@/lib/consultas-decorativas'

// La semana del taller. Se desplaza en horizontal en el celular, igual que el
// tablero: es el mismo gesto y no hay que aprender nada nuevo.

export function Agenda({ slug, citas }: { slug: string; citas: Cita[] }) {
  const dias = [0, 1, 2, 3, 4, 5]

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-titulo text-pantalla text-tinta">Agenda</h1>
          <p className="mt-1 text-meta text-tinta-2">
            {citas.length} citas esta semana
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
              className="flex w-[240px] shrink-0 flex-col rounded-xl bg-columna"
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

              <div className="flex flex-1 flex-col gap-2 p-3">
                {delDia.map((c) => {
                  // Una tarjeta con placa, hora y mecánico se ve tocable; tiene
                  // que llevar a la ficha del carro.
                  const contenido = <TarjetaCita c={c} />
                  return c.vehiculoId ? (
                    <Link
                      key={c.id}
                      href={`/d/${slug}/vehiculo/${c.vehiculoId}`}
                      className="presionable block rounded-[10px] border border-borde bg-superficie p-3 hover:border-borde-fuerte"
                    >
                      {contenido}
                    </Link>
                  ) : (
                    <div key={c.id} className="rounded-[10px] border border-borde bg-superficie p-3">
                      {contenido}
                    </div>
                  )
                })}

                {delDia.length === 0 && (
                  <p className="rounded-lg border border-dashed border-borde px-3 py-6 text-center text-meta text-tinta-3">
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

function TarjetaCita({ c }: { c: Cita }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="cifras font-titulo text-[17px] text-tinta">{c.hora}</span>
        <Placa placa={c.placa} tamano="sm" />
      </div>
      <p className="mt-2.5 text-cuerpo text-tinta">{c.servicio}</p>
      <p className="mt-0.5 truncate text-meta text-tinta-3">{c.cliente}</p>
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
