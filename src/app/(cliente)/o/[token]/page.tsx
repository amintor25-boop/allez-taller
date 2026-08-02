import { ordenPorToken } from '@/lib/consultas'
import { telefonoMarcable } from '@/lib/dominio'
import { VistaCliente, type DatosVista, type ItemVista } from './vista'
import { telefonoTaller } from '@/lib/entorno'

// El estado cambia desde el taller mientras el cliente tiene la página abierta,
// así que nunca se sirve una versión guardada.
export const dynamic = 'force-dynamic'

const TELEFONO = telefonoTaller()

export default async function PaginaOrdenPublica({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ aviso?: string }>
}) {
  const { token } = await params
  const { aviso } = await searchParams
  const orden = await ordenPorToken(token)

  if (!orden) return <NoEncontrada />

  // Las fotos sembradas viven en /public y se sirven directo, sin pasar por una
  // función. Solo las que se suben en vivo (base64 en la base) van por /api/foto.
  const aVista = (i: {
    id: string
    descripcion: string
    detalle: string
    precio: number
    foto_id: string | null
    foto_ruta: string | null
  }): ItemVista => ({
    id: i.id,
    descripcion: i.descripcion,
    detalle: i.detalle,
    precio: i.precio,
    fotoUrl: i.foto_ruta ?? (i.foto_id ? `/api/foto/${i.foto_id}` : null),
  })

  const datos: DatosVista = {
    token: orden.token,
    taller: orden.taller,
    telefono: orden.telefonoTaller || TELEFONO,
    placa: orden.placa,
    vehiculo: `${orden.marca} ${orden.modelo} ${orden.anio} · ${orden.color}`,
    cliente: orden.cliente,
    mecanico: orden.mecanico,
    estadoOrden: orden.estado,
    propuestos: orden.items.filter((i) => i.estado === 'propuesto').map(aVista),
    yaAprobados: orden.items.filter((i) => i.estado === 'aprobado').map(aVista),
    respuesta: orden.items.some((i) => i.estado === 'propuesto')
      ? null
      : orden.respondidoEn
        ? orden.items.some((i) => i.estado === 'aprobado')
          ? 'aprobado'
          : 'rechazado'
        : null,
    // Solo llega por el camino sin JavaScript, cuando el POST nativo falló.
    aviso: aviso === 'error' ? 'error' : null,
    factura: orden.factura ? { numero: orden.factura.numero, total: orden.factura.total } : null,
    facturados: orden.items
      .filter((i) => i.estado !== 'rechazado' && i.estado !== 'propuesto')
      .map(aVista),
  }

  return <VistaCliente datos={datos} />
}

/** Un enlace mal copiado no puede terminar en una pantalla en blanco. */
function NoEncontrada() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col justify-center px-5 pb-16 text-center">
      <h1 className="font-titulo text-cli-titulo">No encontramos esa orden</h1>
      <p className="mt-4 text-cli-cuerpo text-cli-tinta-2">
        Puede que el enlace se haya copiado incompleto.
      </p>
      <p className="mt-2 text-cli-cuerpo text-cli-tinta-2">
        Llame al taller y le decimos cómo va su carro.
      </p>
      <a
        href={`tel:${telefonoMarcable(TELEFONO)}`}
        className="presionable mt-9 flex h-16 w-full items-center justify-center rounded-2xl bg-[#2563EB] text-cli-boton font-semibold text-white"
      >
        Llamar al taller
      </a>
    </main>
  )
}
