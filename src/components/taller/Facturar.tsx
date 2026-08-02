'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Placa } from '@/components/Placa'
import { VistaMensaje } from './VistaMensaje'
import { dinero } from '@/lib/dominio'

// Emitir la factura y mandarle el comprobante al cliente.
//
// El botón se convierte en barra de progreso: emitir un comprobante no puede
// sentirse gratis. Es uno de los tres momentos con movimiento del proyecto.

export type EnvioComprobante = {
  cliente: string
  telefonoCliente: string
  placa: string
  vehiculo: string
  mensaje: string
  url: string
  qr: string
  emitidaEn: string
}

export function Facturar({
  slug,
  ordenId,
  total,
  facturada,
  envio,
}: {
  slug: string
  ordenId: string
  total: number
  facturada: boolean
  envio: EnvioComprobante | null
}) {
  const router = useRouter()
  const [emitiendo, setEmitiendo] = useState(false)
  const [modal, setModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function emitir() {
    setEmitiendo(true)
    setError(null)
    const arranque = Date.now()
    try {
      const r = await fetch(`/api/d/${slug}/orden/${ordenId}/facturar`, { method: 'POST' })
      const datos = await r.json()
      if (!r.ok) throw new Error(datos.error ?? 'No se pudo emitir la factura')

      // La barra llega al final aunque el servidor conteste en 10 ms: un
      // comprobante que aparece de golpe no se siente emitido.
      const falta = 900 - (Date.now() - arranque)
      if (falta > 0) await new Promise((r) => setTimeout(r, falta))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo emitir la factura')
      setEmitiendo(false)
    }
  }

  if (!facturada) {
    return (
      <section className="rounded-xl border border-borde bg-superficie p-5">
        <h2 className="text-etiqueta font-semibold uppercase text-tinta-2">Cierre</h2>
        <p className="mt-2 text-[15px] leading-6 text-tinta">
          El trabajo autorizado suma {dinero(total)}. Al facturar, la orden pasa a listo para
          entrega.
        </p>

        <button
          type="button"
          onClick={emitir}
          disabled={emitiendo || total <= 0}
          className="presionable relative mt-4 h-14 w-full overflow-hidden rounded-xl bg-accion text-cuerpo font-semibold text-white hover:bg-accion-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {emitiendo && (
            <span
              className="barra-progreso absolute inset-y-0 left-0 bg-white/25"
              aria-hidden
            />
          )}
          <span className="relative">
            {emitiendo ? 'Emitiendo comprobante…' : 'Marcar lista y facturar'}
          </span>
        </button>

        {total <= 0 && (
          <p className="mt-2 text-meta text-tinta-3">
            No hay trabajos autorizados que cobrar todavía.
          </p>
        )}

        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-alta px-3 py-2 text-meta text-tinta">
            {error}
          </p>
        )}
      </section>
    )
  }

  if (!envio) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setModal(true)}
        className="presionable flex h-14 w-full items-center justify-center gap-2.5 rounded-xl bg-aprobado text-cuerpo font-semibold text-[#062D14] hover:brightness-110"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            fill="none"
            strokeLinejoin="round"
          />
        </svg>
        Enviar comprobante por WhatsApp
      </button>

      {modal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Enviar el comprobante al cliente"
          onClick={(e) => e.target === e.currentTarget && setModal(false)}
        >
          <div className="entra my-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-borde-fuerte bg-elevada shadow-[0_40px_90px_-20px_rgba(0,0,0,0.9)]">
            <div className="flex items-center gap-3 border-b border-borde px-5 py-4">
              <Placa placa={envio.placa} tamano="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-etiqueta font-semibold uppercase text-tinta-2">
                  Comprobante para el cliente
                </p>
                <p className="truncate text-meta text-tinta-3">{envio.vehiculo}</p>
              </div>
              <button
                type="button"
                onClick={() => setModal(false)}
                aria-label="Cerrar"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-tinta-3 hover:bg-superficie hover:text-tinta"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden>
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:gap-6">
              <section className="order-2 sm:order-1">
                <h3 className="text-etiqueta font-semibold uppercase text-tinta-2">
                  Lo que le llega al cliente
                </h3>
                <VistaMensaje
                  cliente={envio.cliente}
                  telefono={envio.telefonoCliente}
                  mensaje={envio.mensaje}
                  url={envio.url}
                  enviadoEn={envio.emitidaEn}
                />
              </section>

              <section className="order-1 flex flex-col items-center sm:order-2">
                <div
                  className="w-full max-w-[240px] rounded-xl bg-white p-3 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: envio.qr }}
                />
                <p className="mt-4 text-center text-[15px] leading-6 text-tinta">
                  El cliente lo escanea y ve su comprobante.
                </p>
                <div className="mt-4 w-full rounded-lg border border-borde bg-superficie p-3">
                  <p className="text-micro uppercase text-tinta-3">O dicte este enlace</p>
                  <p className="mt-1 break-all font-mono text-[12px] leading-4 text-tinta-2">
                    {envio.url}
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
