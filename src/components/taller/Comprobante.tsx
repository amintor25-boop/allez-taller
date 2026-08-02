import { codigoBarrasSvg } from '@/lib/code128'
import { claveLegible } from '@/lib/sri'
import { desglosarIva, dinero, fechaLarga, hora } from '@/lib/dominio'

// EL COMPROBANTE.
//
// Va sobre papel blanco dentro de la pantalla oscura, igual que la vista previa
// del mensaje: no es una pantalla del sistema, es un documento. Así se lee.
//
// La leyenda del pie no es negociable: una clave de acceso bien formada es un
// documento tributario, y esto no lo es.

export type DatosComprobante = {
  taller: string
  ruc: string
  ciudad: string
  numero: string
  claveAcceso: string
  subtotal: number
  iva: number
  total: number
  emitidaEn: string
  cliente: string
  cedula: string
  placa: string
  vehiculo: string
  items: { descripcion: string; precio: number }[]
}

/**
 * Reparte el subtotal entre los renglones.
 *
 * Cada renglón se muestra sin IVA, como en una factura de verdad. Redondear uno
 * por uno puede dejar la columna descuadrada en un centavo frente al subtotal,
 * así que la diferencia se ajusta en el último renglón — que es exactamente lo
 * que hace cualquier sistema de facturación.
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

  return (
    <div className="entra overflow-hidden rounded-xl border border-borde bg-white text-[#14181F]">
      <div className="px-6 py-6 sm:px-8">
        {/* ── Emisor ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E5E7EB] pb-5">
          <div>
            <p className="font-titulo text-[19px] leading-6">{d.taller}</p>
            <p className="cifras mt-1 text-[13px] text-[#5C6472]">RUC {d.ruc}</p>
            <p className="text-[13px] text-[#5C6472]">{d.ciudad} · Ecuador</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5C6472]">
              Factura
            </p>
            <p className="cifras font-titulo text-[19px] leading-6">{d.numero}</p>
          </div>
        </div>

        {/* ── Clave de acceso ───────────────────────────────────────────── */}
        <div className="border-b border-[#E5E7EB] py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5C6472]">
            Clave de acceso
          </p>
          <p className="cifras mt-1.5 break-all font-mono text-[13px] leading-[19px] text-[#14181F]">
            {claveLegible(d.claveAcceso)}
          </p>
          {/* El código va debajo de la clave, como en cualquier comprobante del
              SRI. Es Code 128 de verdad: un lector de celular lo lee y devuelve
              los mismos 49 dígitos que están escritos arriba. */}
          <div
            className="mt-3 max-w-[420px]"
            dangerouslySetInnerHTML={{ __html: codigoBarrasSvg(d.claveAcceso) }}
          />
          <p className="mt-2 text-[12px] text-[#5C6472]">
            49 dígitos · dígito verificador módulo 11
          </p>
        </div>

        {/* ── Datos del comprobante ─────────────────────────────────────── */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-[#E5E7EB] py-5 text-[13px] sm:grid-cols-4">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5C6472]">
              Emisión
            </dt>
            <dd className="mt-0.5">
              {fechaLarga(d.emitidaEn)}
              <span className="cifras text-[#5C6472]"> · {hora(d.emitidaEn)}</span>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5C6472]">
              Cliente
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
              Vehículo
            </dt>
            <dd className="mt-0.5">
              {d.vehiculo} <span className="cifras">{d.placa}</span>
            </dd>
          </div>
        </dl>

        {/* ── Detalle ───────────────────────────────────────────────────── */}
        <table className="mt-5 w-full text-[14px]">
          <thead>
            <tr className="border-b border-[#E5E7EB] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5C6472]">
              <th className="pb-2 text-left font-semibold">Descripción</th>
              <th className="pb-2 text-right font-semibold">Valor</th>
            </tr>
          </thead>
          <tbody>
            {renglones.map((r, i) => (
              <tr key={i} className="border-b border-[#F1F2F4]">
                <td className="py-2.5 pr-4">{r.descripcion}</td>
                <td className="cifras py-2.5 text-right">{dinero(r.sinIva)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Totales: el desglose hacia atrás ──────────────────────────── */}
        <div className="ml-auto mt-5 w-full max-w-xs space-y-1.5 text-[14px]">
          <div className="flex justify-between">
            <span className="text-[#5C6472]">Subtotal</span>
            <span className="cifras">{dinero(d.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5C6472]">IVA 15 %</span>
            <span className="cifras">{dinero(d.iva)}</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-[#14181F] pt-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em]">Total</span>
            <span className="cifras font-titulo text-[26px] leading-8">{dinero(d.total)}</span>
          </div>
        </div>
      </div>

      <p className="border-t border-[#E5E7EB] bg-[#F7F8FA] px-6 py-3 text-center text-[12px] text-[#5C6472] sm:px-8">
        Documento de demostración · sin validez tributaria
      </p>
    </div>
  )
}
