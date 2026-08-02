import Link from 'next/link'
import { BotonImprimir } from '@/components/taller/BotonImprimir'
import { Comprobante } from '@/components/taller/Comprobante'
import { ordenDe } from '@/lib/consultas-taller'
import { abrirDemo } from '@/lib/demos'
import { NoExiste } from '@/components/taller/NoExiste'

export const dynamic = 'force-dynamic'

// El comprobante solo, para imprimirlo o guardarlo como PDF. Sin cabecera del
// sistema, sin nada alrededor: es el papel que se le entrega al cliente.

export default async function PaginaComprobante({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params
  const demo = await abrirDemo(slug)
  const orden = await ordenDe(demo.id, id)
  if (!orden) return <NoExiste que="Esa orden" />

  // La orden existe pero todavía no se facturó. Un 404 aquí sería mentira —y
  // dejaba al visitante sin más salida que el botón atrás del navegador.
  if (!orden.factura) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6">
        <h1 className="font-titulo text-pantalla text-tinta">Todavía no hay comprobante</h1>
        <p className="mt-3 text-cuerpo text-tinta-2">
          La orden #0{orden.numero} del {orden.marca} {orden.modelo} {orden.placa} sigue abierta.
          El comprobante se emite desde la propia orden cuando el trabajo está listo.
        </p>
        <Link
          href={`/d/${slug}/orden/${orden.id}`}
          className="presionable mt-6 inline-flex h-12 items-center rounded-xl bg-accion px-5 text-cuerpo font-semibold text-white hover:bg-accion-hover"
        >
          Ir a la orden #0{orden.numero}
        </Link>
      </main>
    )
  }

  const cobrables = orden.items.filter((i) => i.estado !== 'rechazado' && i.estado !== 'propuesto')

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/d/${slug}/orden/${orden.id}`}
          className="presionable -ml-2 inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-meta text-tinta-2 hover:text-tinta"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
            <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Orden #0{orden.numero}
        </Link>
        <BotonImprimir />
      </div>

      <div className="mt-3 print:mt-0">
        <Comprobante
          d={{
            taller: demo.taller_nombre,
            ruc: demo.ruc,
            ciudad: demo.ciudad,
            numero: orden.factura.numero,
            claveAcceso: orden.factura.clave_acceso,
            subtotal: orden.factura.subtotal,
            iva: orden.factura.iva,
            total: orden.factura.total,
            emitidaEn: orden.factura.emitida_en,
            cliente: orden.cliente,
            cedula: orden.cedulaCliente,
            placa: orden.placa,
            vehiculo: `${orden.marca} ${orden.modelo} ${orden.anio}`,
            items: cobrables.map((i) => ({ descripcion: i.descripcion, precio: i.precio })),
          }}
        />
      </div>
    </main>
  )
}
