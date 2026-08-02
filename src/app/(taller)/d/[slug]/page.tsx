import { Tablero } from '@/components/taller/Tablero'
import { Recorrido } from '@/components/taller/Recorrido'
import type { DatosModal } from '@/components/taller/ModalPresupuesto'
import { ordenDe, tableroDe } from '@/lib/consultas-taller'
import { abrirDemo } from '@/lib/demos'
import { urlPublicaOrden } from '@/lib/base-url'
import { mensajeWhatsApp } from '@/lib/mensaje'
import { qrSvg } from '@/lib/qr'

export const dynamic = 'force-dynamic'

export default async function PaginaTablero({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ qr?: string }>
}) {
  const { slug } = await params
  const { qr } = await searchParams

  const demo = await abrirDemo(slug)
  const tarjetas = await tableroDe(demo.id)

  // El modal del presupuesto se arma entero en el servidor —mensaje y código
  // incluidos— y viaja dentro del HTML. Cuando aparece ya está dibujado: ni una
  // petición más, ni un parpadeo, delante del cliente.
  const modal = qr ? await armarModal(demo.id, demo.taller_nombre, qr) : null

  return (
    <>
      <Tablero slug={slug} tarjetas={tarjetas} modal={modal} />
      {/* Solo la primera vez que se abre este enlace, y nunca encima del modal
          del presupuesto: dos capas a la vez serían un desorden. */}
      {demo.tour_visto === 0 && !modal && <Recorrido slug={slug} />}
    </>
  )
}

async function armarModal(
  demoId: string,
  taller: string,
  ordenId: string,
): Promise<DatosModal | null> {
  const orden = await ordenDe(demoId, ordenId)
  if (!orden) return null

  const pendientes = orden.items.filter((i) => i.estado === 'propuesto')
  const yaRespondio = pendientes.length === 0 && orden.respondidoEn
  // Si ya respondió, se muestra lo que se le propuso, no una lista vacía.
  const mostrados = pendientes.length > 0 ? pendientes : orden.items.filter((i) => i.tipo === 'hallazgo')
  if (mostrados.length === 0) return null

  const url = await urlPublicaOrden(orden.token)
  const enviadoEn = orden.presupuestoEnviadoEn ?? new Date().toISOString()

  return {
    ordenId: orden.id,
    numero: orden.numero,
    placa: orden.placa,
    cliente: orden.cliente,
    telefonoCliente: orden.telefonoCliente,
    vehiculo: `${orden.marca} ${orden.modelo} ${orden.anio}`,
    monto: mostrados.reduce((s, i) => s + i.precio, 0),
    respuestaPrevia: yaRespondio
      ? {
          estado: orden.items.some((i) => i.estado === 'aprobado') ? 'aprobado' : 'rechazado',
          por: orden.respondidoPor,
          en: orden.respondidoEn,
        }
      : null,
    url,
    enviadoEn,
    qr: await qrSvg(url),
    mensaje: mensajeWhatsApp({
      taller,
      cliente: orden.cliente,
      marca: orden.marca,
      modelo: orden.modelo,
      placa: orden.placa,
      items: mostrados.map((i) => ({ descripcion: i.descripcion, precio: i.precio })),
      url,
      telefono: process.env.NEXT_PUBLIC_TELEFONO_TALLER ?? '+593979279337',
      fechaIso: enviadoEn,
    }),
  }
}
