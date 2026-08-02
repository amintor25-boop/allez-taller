import Link from 'next/link'
import { telefonoTaller } from '@/lib/entorno'
import { NoExiste } from '@/components/taller/NoExiste'
import { Placa } from '@/components/Placa'
import { AgregarHallazgo } from '@/components/taller/AgregarHallazgo'
import { Comprobante } from '@/components/taller/Comprobante'
import { Facturar, type EnvioComprobante } from '@/components/taller/Facturar'
import { urlPublicaOrden } from '@/lib/base-url'
import { mensajeFactura } from '@/lib/mensaje'
import { qrSvg } from '@/lib/qr'
import { ordenDe } from '@/lib/consultas-taller'
import { abrirDemo } from '@/lib/demos'
import {
  antiguedad,
  dinero,
  ESTADO_INFO,
  fechaCorta,
  hora,
  iniciales,
  PRIORIDAD_INFO,
  telefonoLegible,
} from '@/lib/dominio'

export const dynamic = 'force-dynamic'

// Detalle de orden. Desde aquí arranca el camino de oro: se agrega el hallazgo,
// se envía el presupuesto y el tablero se queda esperando la respuesta.

export default async function PaginaOrden({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params
  const demo = await abrirDemo(slug)
  const orden = await ordenDe(demo.id, id)
  if (!orden) return <NoExiste que="Esa orden" />

  const total = orden.items
    .filter((i) => i.estado !== 'rechazado' && i.estado !== 'propuesto')
    .reduce((s, i) => s + i.precio, 0)
  const propuesto = orden.items.filter((i) => i.estado === 'propuesto').reduce((s, i) => s + i.precio, 0)
  const cobrables = orden.items.filter((i) => i.estado !== 'rechazado' && i.estado !== 'propuesto')

  // El envío del comprobante se arma en el servidor, igual que el del presupuesto:
  // cuando el modal abre, el QR ya está dibujado.
  let envio: EnvioComprobante | null = null
  if (orden.factura) {
    const url = await urlPublicaOrden(orden.token)
    envio = {
      cliente: orden.cliente,
      telefonoCliente: orden.telefonoCliente,
      placa: orden.placa,
      vehiculo: `${orden.marca} ${orden.modelo} ${orden.anio}`,
      url,
      qr: await qrSvg(url),
      emitidaEn: orden.factura.emitida_en,
      mensaje: mensajeFactura({
        taller: demo.taller_nombre,
        cliente: orden.cliente,
        marca: orden.marca,
        modelo: orden.modelo,
        placa: orden.placa,
        numero: orden.factura.numero,
        total: orden.factura.total,
        url,
        telefono: telefonoTaller(),
        fechaIso: orden.factura.emitida_en,
      }),
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <Link
        href={`/d/${slug}`}
        className="presionable -ml-2 inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-meta text-tinta-2 hover:text-tinta"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
          <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Tablero
      </Link>

      {/* ── Cabecera de la orden: la placa manda ─────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-start gap-x-5 gap-y-4 rounded-xl border border-borde bg-superficie p-5">
        {/* La placa lleva a la ficha del carro: es la llave de todo su historial. */}
        <Link
          href={`/d/${slug}/vehiculo/${orden.vehiculoId}`}
          className="presionable -m-1 rounded-lg p-1"
          aria-label={`Ver el historial del vehículo ${orden.placa}`}
        >
          <Placa placa={orden.placa} tamano="md" />
        </Link>

        <div className="min-w-0 flex-1 basis-full sm:basis-auto">
          <p className="font-titulo text-seccion text-tinta">
            {orden.marca} {orden.modelo} {orden.anio}
          </p>
          <p className="mt-0.5 text-meta text-tinta-2">
            {orden.color} · {orden.kilometraje.toLocaleString('es-EC')} km · combustible {orden.combustible}
          </p>
          <Link
            href={`/d/${slug}/vehiculo/${orden.vehiculoId}`}
            className="presionable -ml-2 mt-1 inline-flex h-11 items-center gap-1 rounded-lg px-2 text-meta font-semibold text-accion-texto hover:underline"
          >
            Ver todo el historial del carro
            <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden>
              <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>

        <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:items-end">
          <span className="cifras text-etiqueta uppercase text-tinta-3">Orden #0{orden.numero}</span>
          <div className="flex items-center gap-2">
            <span
              className="rounded-md px-2 py-1 text-micro font-semibold uppercase"
              style={{
                color: PRIORIDAD_INFO[orden.prioridad].color,
                background: `${PRIORIDAD_INFO[orden.prioridad].color}14`,
              }}
            >
              {PRIORIDAD_INFO[orden.prioridad].etiqueta}
            </span>
            <span className="rounded-md bg-elevada px-2 py-1 text-micro font-semibold uppercase text-tinta-2">
              {ESTADO_INFO[orden.estado].largo}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* ── Trabajo ──────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <section className="overflow-hidden rounded-xl border border-borde bg-superficie">
            <h2 className="border-b border-borde px-5 py-3 text-etiqueta font-semibold uppercase text-tinta-2">
              Trabajo
            </h2>
            {orden.items.length === 0 && (
              <p className="px-5 py-6 text-cuerpo text-tinta-2">
                Todavía no se ha cargado ningún trabajo. Se agrega cuando el mecánico
                revise el carro.
              </p>
            )}
            <ul>
              {orden.items.map((i) => (
                <li key={i.id} className="flex gap-4 border-b border-borde px-5 py-4 last:border-0">
                  {i.foto_url && (
                    <img
                      src={i.foto_url}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-lg border border-borde bg-white object-contain"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-cuerpo font-semibold text-tinta">{i.descripcion}</p>
                    {i.detalle && <p className="mt-0.5 text-meta text-tinta-3">{i.detalle}</p>}
                    {i.estado === 'propuesto' && (
                      <span className="mt-2 inline-block rounded bg-[#F59E0B1F] px-2 py-0.5 text-micro font-semibold uppercase text-media">
                        Esperando al cliente
                      </span>
                    )}
                    {i.estado === 'rechazado' && (
                      <span className="mt-2 inline-block rounded bg-[#94A3B81F] px-2 py-0.5 text-micro font-semibold uppercase text-baja">
                        No autorizado
                      </span>
                    )}
                  </div>
                  <span
                    className={`cifras shrink-0 font-titulo text-total ${
                      i.estado === 'rechazado' ? 'text-tinta-3 line-through' : 'text-tinta'
                    }`}
                  >
                    {dinero(i.precio)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-baseline justify-between bg-elevada px-5 py-4">
              <span className="text-etiqueta font-semibold uppercase text-tinta-2">Autorizado</span>
              <span className="cifras font-titulo text-cifra text-tinta">{dinero(total)}</span>
            </div>
            {propuesto > 0 && (
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-borde px-5 py-3">
                <span className="text-etiqueta font-semibold uppercase text-media">Por aprobar</span>
                {/* Cuánto lleva esperando. Es el número que decide si hay que
                    levantar el teléfono, porque eso es dinero parado. El dato ya
                    estaba en la base y esta pantalla no lo usaba. */}
                {orden.presupuestoEnviadoEn && (
                  <span className="cifras order-3 w-full text-meta text-tinta-3 sm:order-none sm:w-auto sm:flex-1">
                    enviado hace {antiguedad(orden.presupuestoEnviadoEn)}
                  </span>
                )}
                <span className="cifras font-titulo text-total text-media">{dinero(propuesto)}</span>
              </div>
            )}
          </section>

          {orden.factura ? (
            <>
              <Comprobante
                d={{
                  taller: demo.taller_nombre,
                  ruc: demo.ruc,
                  ciudad: demo.ciudad,
                  numero: orden.factura.numero,
                  claveAcceso: orden.factura.clave_acceso,
                  estado: orden.factura.estado,
                  subtotal: orden.factura.subtotal,
                  iva: orden.factura.iva,
                  total: orden.factura.total,
                  emitidaEn: orden.factura.emitida_en,
                  cliente: orden.cliente,
                  cedula: orden.cedulaCliente,
                  placa: orden.placa,
            vehiculo: `${orden.marca} ${orden.modelo} ${orden.anio}`,
                  kilometraje: orden.kilometraje,
                  mecanico: orden.mecanico,
                  numeroOrden: orden.numero,
                  items: cobrables.map((i) => ({ descripcion: i.descripcion, precio: i.precio })),
                }}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href={`/d/${slug}/orden/${orden.id}/comprobante`}
                  className="presionable flex h-14 items-center justify-center gap-2.5 rounded-xl border border-borde bg-superficie text-cuerpo font-semibold text-tinta hover:border-borde-fuerte"
                >
                  <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden>
                    <path d="M4.5 6V2.5h7V6M4.5 12H3.5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1M4.5 10h7v3.5h-7z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Imprimir o guardar PDF
                </Link>
                <Facturar slug={slug} ordenId={orden.id} total={total} facturada envio={envio} />
              </div>
            </>
          ) : (
            <>
              <AgregarHallazgo
                slug={slug}
                ordenId={orden.id}
                hayPendientes={propuesto > 0}
                totalPendiente={propuesto}
              />
              {propuesto === 0 && total > 0 && (
                <Facturar
                  slug={slug}
                  ordenId={orden.id}
                  total={total}
                  facturada={false}
                  envio={null}
                />
              )}
            </>
          )}

          {orden.fotoIngreso && (
            <section className="overflow-hidden rounded-xl border border-borde bg-superficie">
              <h2 className="border-b border-borde px-5 py-3 text-etiqueta font-semibold uppercase text-tinta-2">
                Cómo entró
              </h2>
              <img
                src={orden.fotoIngreso}
                alt={`Estado del ${orden.marca} ${orden.modelo} al ingresar`}
                className="max-h-80 w-full bg-black/30 object-contain"
              />
            </section>
          )}

          {orden.observacion && (
            <section className="rounded-xl border border-borde bg-superficie p-5">
              <h2 className="text-etiqueta font-semibold uppercase text-tinta-2">
                Lo que dijo el cliente
              </h2>
              <p className="mt-2 text-[15px] leading-6 text-tinta">{orden.observacion}</p>
            </section>
          )}
        </div>

        {/* ── Ficha y bitácora ─────────────────────────────────────────── */}
        <div className="space-y-4">
          <section className="rounded-xl border border-borde bg-superficie p-5">
            <h2 className="text-etiqueta font-semibold uppercase text-tinta-2">Cliente</h2>
            <p className="mt-2 text-cuerpo font-semibold text-tinta">{orden.cliente}</p>
            <p className="cifras mt-0.5 text-meta text-tinta-2">
              {telefonoLegible(orden.telefonoCliente)}
            </p>
            {orden.cedulaCliente && (
              <p className="cifras mt-0.5 text-meta text-tinta-3">CI {orden.cedulaCliente}</p>
            )}

            <h2 className="mt-5 text-etiqueta font-semibold uppercase text-tinta-2">Mecánico</h2>
            {orden.mecanico ? (
              <p className="mt-2 flex items-center gap-2 text-cuerpo text-tinta">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-elevada text-[10px] font-semibold text-tinta-2">
                  {iniciales(orden.mecanico)}
                </span>
                {orden.mecanico}
              </p>
            ) : (
              <p className="mt-2 text-cuerpo italic text-tinta-3">Sin asignar</p>
            )}
          </section>

          <section className="rounded-xl border border-borde bg-superficie p-5">
            <h2 className="text-etiqueta font-semibold uppercase text-tinta-2">Historial</h2>
            <ol className="mt-3 space-y-3">
              {orden.movimientos.map((m, n) => (
                <li key={n} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accion" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-cuerpo text-tinta">
                      {ESTADO_INFO[m.hasta as keyof typeof ESTADO_INFO]?.largo ?? m.hasta}
                    </p>
                    {m.nota && <p className="text-meta text-tinta-3">{m.nota}</p>}
                    <p className="cifras text-meta text-tinta-3">
                      {fechaCorta(m.creado_en)} · {hora(m.creado_en)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </main>
  )
}
