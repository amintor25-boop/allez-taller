import { filas } from '@/lib/db'
import { abrirDemo } from '@/lib/demos'
import { centavos, dinero, iniciales, telefonoLegible } from '@/lib/dominio'
import { CATALOGO_SERVICIOS } from '@/lib/datos-semilla'
import { ReiniciarDemo } from '@/components/taller/ReiniciarDemo'

export const dynamic = 'force-dynamic'

// Configuración del taller.
//
// Es una vista, no un formulario: no hay ni un campo ni un botón que no haga
// nada. Enseña de dónde salen los datos que aparecen en la factura y en la
// página que ve el cliente, que es lo que el dueño quiere entender.

export default async function PaginaConfiguracion({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ reiniciado?: string }>
}) {
  const { slug } = await params
  const q = await searchParams
  const demo = await abrirDemo(slug)

  const mecanicos = await filas<{ nombre: string; especialidad: string }>(
    `SELECT nombre, especialidad FROM mecanicos WHERE demo_id = ? ORDER BY orden`,
    [demo.id],
  )

  const telefono = demo.telefono ?? process.env.NEXT_PUBLIC_TELEFONO_TALLER ?? '+593979279337'

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <h1 className="font-titulo text-pantalla text-tinta">Configuración</h1>
      <p className="mt-1 text-meta text-tinta-2">
        De aquí salen los datos de la factura y de la página que ve el cliente
      </p>

      <section className="mt-5 overflow-hidden rounded-xl border border-borde bg-superficie">
        <h2 className="border-b border-borde px-5 py-3 text-etiqueta font-semibold uppercase text-tinta-2">
          El taller
        </h2>
        <dl>
          <Dato etiqueta="Nombre" valor={demo.taller_nombre} />
          <Dato etiqueta="RUC" valor={demo.ruc} cifras />
          <Dato etiqueta="Ciudad" valor={`${demo.ciudad} · Ecuador`} />
          <Dato
            etiqueta="Teléfono"
            valor={telefonoLegible(telefono)}
            cifras
            nota="Es el número al que llama el cliente desde su celular"
          />
          <Dato
            etiqueta="Enlace del taller"
            valor={`/d/${demo.slug}`}
            cifras
            nota="Cada taller tiene el suyo, con sus propios datos"
          />
        </dl>
      </section>

      <section className="mt-4 overflow-hidden rounded-xl border border-borde bg-superficie">
        <h2 className="border-b border-borde px-5 py-3 text-etiqueta font-semibold uppercase text-tinta-2">
          Impuestos
        </h2>
        <dl>
          <Dato etiqueta="IVA" valor="15 %" cifras />
          <Dato
            etiqueta="Los precios se cotizan"
            valor="Con IVA incluido"
            nota="Al cliente se le dice el valor final. La factura lo desglosa hacia atrás"
          />
          <Dato
            etiqueta="Numeración"
            valor="001-001"
            cifras
            nota="Establecimiento y punto de emisión"
          />
          <Dato
            etiqueta="Secuencial actual"
            valor={String(demo.secuencial).padStart(9, '0')}
            cifras
          />
        </dl>
      </section>

      <section className="mt-4 overflow-hidden rounded-xl border border-borde bg-superficie">
        <h2 className="border-b border-borde px-5 py-3 text-etiqueta font-semibold uppercase text-tinta-2">
          El equipo
        </h2>
        <ul>
          {mecanicos.map((m) => (
            <li
              key={m.nombre}
              className="flex items-center gap-3 border-b border-borde px-5 py-3.5 last:border-0"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-elevada text-[11px] font-semibold text-tinta-2">
                {iniciales(m.nombre)}
              </span>
              <span className="min-w-0">
                <span className="block text-cuerpo text-tinta">{m.nombre}</span>
                <span className="block text-meta text-tinta-3">{m.especialidad}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 overflow-hidden rounded-xl border border-borde bg-superficie">
        <h2 className="border-b border-borde px-5 py-3 text-etiqueta font-semibold uppercase text-tinta-2">
          Lista de precios
        </h2>
        <ul>
          {CATALOGO_SERVICIOS.map((s) => (
            <li
              key={s.nombre}
              className="flex items-center gap-4 border-b border-borde px-5 py-3 last:border-0"
            >
              <span className="min-w-0 flex-1 truncate text-cuerpo text-tinta">{s.nombre}</span>
              <span className="cifras shrink-0 text-cuerpo font-semibold text-tinta">
                {dinero(centavos(s.precio))}
              </span>
            </li>
          ))}
        </ul>
        <p className="border-t border-borde bg-columna px-5 py-3 text-meta text-tinta-3">
          Todos los precios llevan IVA incluido.
        </p>
      </section>

      {q.reiniciado === '1' && (
        <p
          role="status"
          className="entra mt-8 rounded-xl border border-aprobado/50 bg-[#22C55E10] px-5 py-4 text-cuerpo text-tinta"
        >
          Listo. El taller volvió a su estado inicial.
        </p>
      )}

      <ReiniciarDemo slug={slug} />
    </main>
  )
}

function Dato({
  etiqueta,
  valor,
  nota,
  cifras,
}: {
  etiqueta: string
  valor: string
  nota?: string
  cifras?: boolean
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-borde px-5 py-3.5 last:border-0">
      <dt className="w-full text-etiqueta font-semibold uppercase text-tinta-2 sm:w-56">
        {etiqueta}
      </dt>
      <dd className="min-w-0 flex-1">
        <span className={`block text-cuerpo text-tinta ${cifras ? 'cifras' : ''}`}>{valor}</span>
        {nota && <span className="mt-0.5 block text-meta text-tinta-3">{nota}</span>}
      </dd>
    </div>
  )
}
