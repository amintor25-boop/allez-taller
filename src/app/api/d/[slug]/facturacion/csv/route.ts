import { cierreMensual, type Comprobante } from '@/lib/consultas-facturacion'
import { buscarDemo } from '@/lib/demos'

// Exportación para el contador.
//
// Separador punto y coma y decimales con coma: así lo abre Excel en Ecuador sin
// que haya que tocar nada. Con coma como separador, Excel mete todo en una sola
// columna y el contador lo devuelve.

const SEP = ';'

function celda(valor: string | number): string {
  const t = String(valor)
  return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

/** 1234,56 — sin separador de miles, que Excel lo interpreta mal. */
function monto(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',')
}

function fechaLocal(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 5 * 60 * 60 * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const mes = new URL(req.url).searchParams.get('mes') ?? undefined

  const demo = await buscarDemo(slug)
  if (!demo) return new Response('Demo inexistente', { status: 404 })

  const c = await cierreMensual(demo.id, mes)

  const lineas = [
    ['Fecha', 'Comprobante', 'Estado', 'Clave de acceso', 'Cliente', 'Identificación', 'Placa', 'Vehículo', 'Subtotal', 'IVA 15%', 'Total'],
    ...c.comprobantes.map((f: Comprobante) => [
      fechaLocal(f.emitidaEn),
      f.numero,
      f.estado === 'autorizada' ? 'Autorizada' : f.estado === 'anulada' ? 'Anulada' : 'Nota de crédito',
      f.claveAcceso,
      f.cliente,
      f.cedula,
      f.placa,
      f.vehiculo,
      monto(f.subtotal),
      monto(f.iva),
      monto(f.total),
    ]),
    [],
    ['', '', '', '', '', '', '', 'TOTALES', monto(c.subtotal), monto(c.iva), monto(c.total)],
    [],
    ['Documento de demostración · sin validez tributaria'],
  ]

  // El BOM es lo que hace que Excel reconozca los acentos.
  const csv = '﻿' + lineas.map((f) => f.map(celda).join(SEP)).join('\r\n')
  const archivo = `facturacion-${demo.slug}-${c.mes}.csv`

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${archivo}"`,
      'cache-control': 'no-store',
    },
  })
}
