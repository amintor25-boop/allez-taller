import { dinero } from '@/lib/dominio'
import type { Reportes as Datos } from '@/lib/consultas-reportes'

// Reportes. Todo calculado de las órdenes y facturas reales, sin librería de
// gráficos: las barras son SVG a mano, que pesan cero y no envejecen.

export function Reportes({ d }: { d: Datos }) {
  const pico = Math.max(1, ...d.meses.map((m) => m.total))

  // El promedio de los meses YA CERRADOS. El mes en curso se deja fuera: va a
  // media altura porque acaba de empezar y arrastraría la línea hacia abajo.
  // Sin ella hay que comparar doce alturas de memoria; con ella cada mes se lee
  // de un vistazo como "de los buenos" o "de los flojos".
  const cerrados = d.meses.filter((m) => !m.enCurso)
  const promedio = cerrados.length
    ? cerrados.reduce((a, m) => a + m.total, 0) / cerrados.length
    : 0
  const mejorMes = d.meses.reduce((a, b) => (b.total > a.total ? b : a), d.meses[0])
  // La barra mide PLATA, no veces. Antes medía veces mientras el número grande
  // de al lado mostraba dinero: dos escalas distintas en el mismo renglón, y
  // nadie las cruza. La pregunta es "lo que más hago, ¿es lo que más me deja?".
  const topServicio = Math.max(1, ...d.servicios.map((s) => s.ingreso))
  const topMecanico = Math.max(1, ...d.mecanicos.map((m) => m.ingreso))

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <h1 className="font-titulo text-pantalla text-tinta">Reportes</h1>
      <p className="mt-1 text-meta text-tinta-2">
        Comparado con los mismos días del mes anterior
      </p>

      {/* ── Seis indicadores ──────────────────────────────────────────────── */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {d.indicadores.map((i) => (
          <div key={i.etiqueta} className="rounded-xl border border-borde bg-superficie p-4">
            <p className="text-etiqueta font-semibold uppercase text-tinta-2">{i.etiqueta}</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="cifras font-titulo text-[28px] leading-9 text-tinta sm:text-cifra">{i.valor}</span>
              {i.variacion !== null && <Variacion valor={i.variacion} neutro={i.neutro} />}
            </div>
            {i.detalle && <p className="mt-1 text-meta text-tinta-3">{i.detalle}</p>}
          </div>
        ))}
      </div>

      {/* ── Ingresos de los últimos 12 meses ──────────────────────────────── */}
      <section className="mt-4 rounded-xl border border-borde bg-superficie p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-etiqueta font-semibold uppercase text-tinta-2">
            Ingresos por mes · últimos 12
          </h2>
          {mejorMes && (
            <p className="text-meta text-tinta-3">
              Mejor mes: <span className="text-tinta-2">{mejorMes.nombre}</span> con{' '}
              <span className="cifras text-tinta-2">{dinero(mejorMes.total)}</span>
            </p>
          )}
        </div>

        {/* En el celular el gráfico se desplaza dentro de su propia caja: si no,
            doce barras hacen desbordar la página entera hacia el costado. */}
        <div className="-mx-1 mt-6 overflow-x-auto px-1">
          <div
            className="min-w-[520px] sm:min-w-0"
            role="img"
            aria-label={`Ingresos de los últimos doce meses. Promedio de los meses cerrados: ${dinero(Math.round(promedio))}`}
          >
            {/* Tres filas con el mismo `gap` y columnas `flex-1`: quedan
                alineadas solas. Las cifras y los meses viven FUERA de la pista,
                para que el 100 % de una barra y el punto donde cae la línea del
                promedio midan exactamente lo mismo. Antes las etiquetas estaban
                dentro y la línea habría caído en cualquier sitio. */}
            <div className="flex gap-1.5 sm:gap-2">
              {d.meses.map((m) => (
                <span
                  key={m.clave}
                  className="cifras hidden flex-1 text-center text-micro text-tinta-2 sm:block"
                >
                  {Math.round(m.total / 100000) > 0 ? `${Math.round(m.total / 100000)}k` : ''}
                </span>
              ))}
            </div>

            <div className="relative mt-1 flex h-44 items-end gap-1.5 sm:gap-2">
              {d.meses.map((m) => (
                <div key={m.clave} className="group relative h-full flex-1">
                  <span
                    className={`absolute bottom-0 block w-full rounded-t-[4px] transition-colors group-hover:bg-acento ${
                      m.enCurso ? 'bg-accion/35' : 'bg-accion'
                    }`}
                    style={{ height: `${Math.max(2, (m.total / pico) * 100)}%` }}
                  />
                  <span className="pointer-events-none absolute -top-1 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded bg-elevada px-2 py-1 text-micro text-tinta shadow-lg group-hover:block">
                    {m.nombre} · {dinero(m.total)}
                  </span>
                </div>
              ))}

              {promedio > 0 && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-tinta-3"
                  style={{ bottom: `${(promedio / pico) * 100}%` }}
                >
                  <span className="cifras absolute -top-[15px] right-0 rounded bg-fondo px-1 text-micro text-tinta-3">
                    promedio {dinero(Math.round(promedio))}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-2 flex gap-1.5 sm:gap-2">
              {d.meses.map((m) => (
                <span
                  key={m.clave}
                  className={`flex-1 text-center text-micro uppercase ${
                    m.enCurso ? 'text-tinta-2' : 'text-tinta-3'
                  }`}
                >
                  {m.etiqueta}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* ── Lo que más se vende ─────────────────────────────────────────── */}
        <section className="overflow-hidden rounded-xl border border-borde bg-superficie">
          <div className="flex items-baseline justify-between border-b border-borde px-5 py-3">
            <h2 className="text-etiqueta font-semibold uppercase text-tinta-2">
              Lo que más se vende
            </h2>
            <span className="text-micro uppercase text-tinta-3">últimos {d.desdeDias} días</span>
          </div>
          <ul className="p-5 pt-4">
            {d.servicios.map((s) => (
              <li key={s.descripcion} className="mb-4 last:mb-0">
                <div className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1 truncate text-cuerpo text-tinta">
                    {s.descripcion}
                  </span>
                  <span className="cifras shrink-0 text-meta text-tinta-3">{s.veces} veces</span>
                  <span className="cifras w-24 shrink-0 text-right text-cuerpo font-semibold text-tinta">
                    {dinero(s.ingreso)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-columna">
                  <div
                    className="h-full rounded-full bg-accion"
                    style={{ width: `${Math.max(4, (s.ingreso / topServicio) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Productividad por mecánico ──────────────────────────────────── */}
        <section className="overflow-hidden rounded-xl border border-borde bg-superficie">
          <div className="flex items-baseline justify-between border-b border-borde px-5 py-3">
            <h2 className="text-etiqueta font-semibold uppercase text-tinta-2">
              Productividad por mecánico
            </h2>
            <span className="text-micro uppercase text-tinta-3">últimos {d.desdeDias} días</span>
          </div>

          <ul className="divide-y divide-borde">
            {d.mecanicos.map((m) => (
              <li key={m.nombre} className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-elevada text-[11px] font-semibold text-tinta-2">
                    {m.siglas}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-cuerpo font-semibold text-tinta">
                    {m.nombre}
                  </span>
                  <span className="cifras shrink-0 font-titulo text-total text-tinta">
                    {dinero(m.ingreso)}
                  </span>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-columna">
                  <div
                    className="h-full rounded-full bg-aprobado"
                    style={{ width: `${Math.max(4, (m.ingreso / topMecanico) * 100)}%` }}
                  />
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-3">
                  <Celda etiqueta="Carros" valor={String(m.carros)} />
                  <Celda etiqueta="Horas facturadas" valor={`${m.horas}`.replace('.', ',')} />
                  <Celda
                    etiqueta="Por hora"
                    valor={m.horas > 0 ? dinero(Math.round(m.ingreso / m.horas)) : '—'}
                  />
                </dl>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}

function Variacion({ valor, neutro }: { valor: number; neutro?: boolean }) {
  // Un "+0 %" no dice nada; se escribe con palabras.
  if (valor === 0) {
    return <span className="text-meta font-semibold text-tinta-3">sin cambio</span>
  }
  const sube = valor > 0
  return (
    <span
      className={`cifras inline-flex items-center gap-1 text-meta font-semibold ${
        neutro ? 'text-tinta-2' : sube ? 'text-aprobado' : 'text-alta-texto'
      }`}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
        <path d={sube ? 'M5 1.5 9 7H1z' : 'M5 8.5 1 3h8z'} fill="currentColor" />
      </svg>
      {sube ? '+' : ''}
      {valor} %
    </span>
  )
}

function Celda({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-micro uppercase text-tinta-3">{etiqueta}</dt>
      <dd className="cifras mt-0.5 text-cuerpo font-semibold text-tinta-2">{valor}</dd>
    </div>
  )
}
