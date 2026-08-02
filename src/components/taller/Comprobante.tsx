import { codigoBarrasSvg } from '@/lib/code128'
import { AMBIENTE_PRUEBAS, claveLegible, EMISION_NORMAL } from '@/lib/sri'
import { Placa } from '@/components/Placa'
import { desglosarIva, dinero, fechaCorta, fechaLarga, hora } from '@/lib/dominio'

// EL COMPROBANTE.
//
// Va sobre papel blanco dentro de la pantalla oscura: no es una pantalla del
// sistema, es un documento. Y tiene la forma de un RIDE —la representación
// impresa del comprobante electrónico— porque el dueño de un taller ecuatoriano
// ve tres de estos al día y no lo lee: reconoce su forma.
//
// TODO LO QUE APARECE ES CIERTO Y SE SOSTIENE. No hay ni un campo inventado para
// rellenar: el número de autorización ES la clave de acceso, el ambiente ES el
// dígito 24 de esa clave, el tipo de comprobante ES el que se emitió. Un contador
// puede leer los 49 dígitos uno por uno y todo cuadra.
//
// La leyenda del pie no es negociable: una clave de acceso bien formada es un
// documento tributario, y esto no lo es.

export type EstadoComprobante = 'autorizada' | 'anulada' | 'nota_credito'

export type DatosComprobante = {
  taller: string
  ruc: string
  ciudad: string
  numero: string
  claveAcceso: string
  estado: EstadoComprobante
  subtotal: number
  iva: number
  total: number
  emitidaEn: string
  cliente: string
  cedula: string
  placa: string
  vehiculo: string
  kilometraje: number
  mecanico: string | null
  numeroOrden: number
  items: { descripcion: string; precio: number }[]
}

const TITULO: Record<EstadoComprobante, string> = {
  autorizada: 'Factura',
  anulada: 'Factura',
  nota_credito: 'Nota de crédito',
}

/**
 * Reparte el subtotal entre los renglones.
 *
 * En un RIDE el detalle va SIN IVA y la suma de la columna tiene que dar el
 * subtotal sin impuestos, no el total. Nuestros precios se cotizan con el IVA
 * dentro, así que cada renglón se divide — y como redondear uno por uno puede
 * dejar la columna descuadrada en un centavo, la diferencia se ajusta en el
 * último, que es exactamente lo que hace cualquier sistema de facturación.
 */
function renglonesSinIva(items: { descripcion: string; precio: number }[], subtotal: number) {
  const base = items.map((i) => ({ ...i, sinIva: desglosarIva(i.precio).subtotal }))
  const suma = base.reduce((s, i) => s + i.sinIva, 0)
  if (base.length > 0 && suma !== subtotal) {
    base[base.length - 1].sinIva += subtotal - suma
  }
  return base
}

export function Comprobante({ d }: { d: DatosComprobante }) {
  const renglones = renglonesSinIva(d.items, d.subtotal)
  const anulada = d.estado === 'anulada'

  return (
    <div className="entra overflow-hidden rounded-xl border border-borde bg-white text-[#14181F] print:rounded-none print:border-0">
      {/* ── Sello de estado ─────────────────────────────────────────────────
          Una anulada no puede imprimirse con la misma cara que una válida: hoy
          se podía sacar y entregar como si valiera. La banda va arriba del todo
          y sobrevive a la impresión con `print-color-adjust`. */}
      {d.estado !== 'autorizada' && (
        <p
          className={`px-6 py-2 text-center text-[12px] font-semibold uppercase tracking-[0.14em] sm:px-8 ${
            anulada ? 'bg-[#7F1D1D] text-white' : 'bg-[#78350F] text-white'
          }`}
          style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
        >
          {anulada ? 'Comprobante anulado · no surte efecto tributario' : 'Nota de crédito'}
        </p>
      )}

      <div className="px-6 py-6 sm:px-8">
        {/* ── Las dos cajas del RIDE ────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-[1fr_1.15fr]">
          {/* Emisor */}
          <div className="rounded-md border border-[#C9CDD4] p-4">
            <p className="font-titulo text-[18px] leading-6">{d.taller}</p>
            <dl className="mt-3 space-y-1 text-[12px] leading-[17px]">
              <Linea etiqueta="R.U.C." valor={d.ruc} cifras />
              <Linea etiqueta="Dirección matriz" valor={`${d.ciudad} · Ecuador`} />
              <Linea etiqueta="Obligado a llevar contabilidad" valor="NO" />
            </dl>
          </div>

          {/* Documento */}
          <div className="rounded-md border border-[#C9CDD4] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5C6472]">
              {TITULO[d.estado]} No.
            </p>
            <p className="cifras font-titulo text-[19px] leading-7">{d.numero}</p>

            <dl className="mt-3 space-y-1 text-[12px] leading-[17px]">
              <Linea etiqueta="Número de autorización" valor={d.claveAcceso} cifras quebrar />
              <Linea
                etiqueta="Fecha y hora de autorización"
                valor={`${fechaCorta(d.emitidaEn)} ${hora(d.emitidaEn)}`}
                cifras
              />
              <Linea etiqueta="Ambiente" valor={AMBIENTE_PRUEBAS === '1' ? 'PRUEBAS' : 'PRODUCCIÓN'} />
              <Linea etiqueta="Emisión" valor={EMISION_NORMAL === '1' ? 'NORMAL' : 'INDISPONIBILIDAD'} />
            </dl>

            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5C6472]">
              Clave de acceso
            </p>
            <p className="cifras mt-1 break-all text-[11.5px] leading-[16px]">
              {claveLegible(d.claveAcceso)}
            </p>
            {/* Code 128 de verdad: un lector de celular lo lee y devuelve los
                mismos 49 dígitos que están escritos encima. */}
            <div
              className="mt-2"
              dangerouslySetInnerHTML={{ __html: codigoBarrasSvg(d.claveAcceso, 38) }}
            />
          </div>
        </div>

        {/* ── Comprador ─────────────────────────────────────────────────── */}
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 rounded-md border border-[#C9CDD4] p-4 text-[13px] sm:grid-cols-3">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5C6472]">
              Razón social / Nombres
            </dt>
            <dd className="mt-0.5">{d.cliente}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5C6472]">
              Identificación
            </dt>
            <dd className="cifras mt-0.5">{d.cedula || 'Consumidor final'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5C6472]">
              Fecha de emisión
            </dt>
            <dd className="mt-0.5">{fechaLarga(d.emitidaEn)}</dd>
          </div>
        </dl>

        {/* ── Detalle ───────────────────────────────────────────────────────
            Cuatro columnas, no dos: dos columnas es una nota de venta. La
            cantidad es 1 de verdad —cada renglón es un servicio— y por eso el
            precio unitario y el total coinciden; no hay nada inventado ahí. */}
        <div className="mt-4 overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[440px] text-[13.5px] print:min-w-0">
            <thead>
              <tr className="border-y border-[#C9CDD4] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5C6472]">
                <th className="py-2 pr-3 text-right font-semibold">Cant.</th>
                <th className="py-2 pr-3 text-left font-semibold">Descripción</th>
                <th className="py-2 pr-3 text-right font-semibold">P. unitario</th>
                <th className="py-2 text-right font-semibold">P. total</th>
              </tr>
            </thead>
            <tbody>
              {renglones.map((r, i) => (
                <tr key={i} className="border-b border-[#F1F2F4]">
                  <td className="cifras py-2 pr-3 text-right">1</td>
                  <td className="py-2 pr-3">{r.descripcion}</td>
                  <td className="cifras py-2 pr-3 text-right">{dinero(r.sinIva)}</td>
                  <td className="cifras py-2 text-right">{dinero(r.sinIva)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
          {/* ── Información adicional ────────────────────────────────────────
              Es un recuadro real del comprobante electrónico, y es donde los
              datos del taller viven DENTRO del documento en vez de al lado. Al
              cliente le sirve: es lo que su contador necesita para justificar el
              gasto contra un vehículo concreto. */}
          <div className="rounded-md border border-[#C9CDD4] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5C6472]">
              Información adicional
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Placa placa={d.placa} tamano="sm" />
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12px] leading-[17px] sm:grid-cols-3">
                <Linea etiqueta="Vehículo" valor={d.vehiculo} apilado />
                <Linea etiqueta="Kilometraje" valor={`${d.kilometraje.toLocaleString('es-EC')} km`} cifras apilado />
                <Linea etiqueta="Orden" valor={`#0${d.numeroOrden}`} cifras apilado />
                {d.mecanico && <Linea etiqueta="Mecánico" valor={d.mecanico} apilado />}
              </dl>
            </div>
          </div>

          {/* ── Totales ───────────────────────────────────────────────────────
              Los ceros son lo que hace real el bloque: un contador barre la
              columna de etiquetas, y la ausencia de la línea de 0 % es
              precisamente lo que delata un documento fabricado. */}
          <div className="w-full space-y-1 text-[13px] sm:w-64">
            <Total etiqueta="Subtotal 15 %" valor={dinero(d.subtotal)} />
            <Total etiqueta="Subtotal 0 %" valor={dinero(0)} tenue />
            <Total etiqueta="Subtotal no objeto de IVA" valor={dinero(0)} tenue />
            <Total etiqueta="Subtotal exento de IVA" valor={dinero(0)} tenue />
            <Total etiqueta="Subtotal sin impuestos" valor={dinero(d.subtotal)} />
            <Total etiqueta="Total descuento" valor={dinero(0)} tenue />
            <Total etiqueta="IVA 15 %" valor={dinero(d.iva)} />
            <div className="flex items-baseline justify-between border-t border-[#14181F] pt-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em]">Valor total</span>
              <span className="cifras font-titulo text-[24px] leading-8">{dinero(d.total)}</span>
            </div>
          </div>
        </div>
      </div>

      <p className="border-t border-[#E5E7EB] bg-[#F7F8FA] px-6 py-3 text-center text-[12px] text-[#5C6472] sm:px-8">
        Documento de demostración · sin validez tributaria
      </p>
    </div>
  )
}

function Linea({
  etiqueta,
  valor,
  cifras,
  quebrar,
  apilado,
}: {
  etiqueta: string
  valor: string
  cifras?: boolean
  quebrar?: boolean
  apilado?: boolean
}) {
  if (apilado) {
    return (
      <div>
        <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5C6472]">
          {etiqueta}
        </dt>
        <dd className={cifras ? 'cifras' : ''}>{valor}</dd>
      </div>
    )
  }
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-[#5C6472]">{etiqueta}:</dt>
      <dd className={`${cifras ? 'cifras' : ''} ${quebrar ? 'break-all' : 'truncate'}`}>{valor}</dd>
    </div>
  )
}

function Total({ etiqueta, valor, tenue }: { etiqueta: string; valor: string; tenue?: boolean }) {
  return (
    <div className={`flex justify-between ${tenue ? 'text-[#8A919B]' : ''}`}>
      <span className={tenue ? '' : 'text-[#5C6472]'}>{etiqueta}</span>
      <span className="cifras">{valor}</span>
    </div>
  )
}
