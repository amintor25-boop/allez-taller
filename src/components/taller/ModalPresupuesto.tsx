'use client'

import { useEffect, useRef, useState } from 'react'
import { Placa } from '@/components/Placa'
import { dinero, hora } from '@/lib/dominio'
import { VistaMensaje } from './VistaMensaje'

// EL MODAL DEL PRESUPUESTO.
//
// Es el minuto que decide la venta. A la izquierda, exactamente lo que le va a
// llegar al dueño del carro; a la derecha, el código que el prospecto escanea con
// SU celular. Cuando responde, esto se transforma —no se cierra de golpe— y deja
// ver el tablero justo cuando la tarjeta empieza a viajar.

export type DatosModal = {
  ordenId: string
  numero: number
  placa: string
  cliente: string
  telefonoCliente: string
  vehiculo: string
  mensaje: string
  url: string
  qr: string
  monto: number
  enviadoEn: string
  // Si la orden ya se respondió antes de abrir el modal (por ejemplo al reabrirlo
  // desde el historial), se muestra el resultado y no un QR que ya no sirve.
  respuestaPrevia: { estado: 'aprobado' | 'rechazado'; por: string | null; en: string | null } | null
}

export type EstadoModal = 'esperando' | 'aprobado' | 'rechazado'

export function ModalPresupuesto({
  datos,
  estado,
  respondidoPor,
  respondidoEn,
  onCerrar,
}: {
  datos: DatosModal
  estado: EstadoModal
  respondidoPor: string | null
  respondidoEn: string | null
  onCerrar: () => void
}) {
  const [copiado, setCopiado] = useState(false)
  const caja = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    document.addEventListener('keydown', tecla)
    caja.current?.focus()
    return () => document.removeEventListener('keydown', tecla)
  }, [onCerrar])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(datos.url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* sin portapapeles: el enlace está a la vista para dictarlo */
    }
  }

  const respondido = estado !== 'esperando'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={`Presupuesto de la orden 0${datos.numero}`}
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div
        ref={caja}
        tabIndex={-1}
        className="entra my-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-borde-fuerte bg-elevada shadow-[0_40px_90px_-20px_rgba(0,0,0,0.9)] outline-none"
      >
        {/* ── Cabecera ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 border-b border-borde px-5 py-4">
          <Placa placa={datos.placa} tamano="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-etiqueta font-semibold uppercase text-tinta-2">
              Presupuesto · orden #0{datos.numero}
            </p>
            <p className="truncate text-meta text-tinta-3">{datos.vehiculo}</p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-tinta-3 hover:bg-superficie hover:text-tinta"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden>
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:gap-6">
          {/* ── Vista previa del mensaje ──────────────────────────────── */}
          <section className="order-2 sm:order-1">
            <h3 className="text-etiqueta font-semibold uppercase text-tinta-2">
              Lo que le llega al cliente
            </h3>
            <VistaMensaje
              cliente={datos.cliente}
              telefono={datos.telefonoCliente}
              mensaje={datos.mensaje}
              url={datos.url}
              enviadoEn={datos.enviadoEn}
            />
          </section>

          {/* ── QR y estado ───────────────────────────────────────────── */}
          <section className="order-1 flex flex-col items-center sm:order-2">
            {respondido ? (
              <Respuesta
                estado={estado}
                respondidoPor={respondidoPor}
                respondidoEn={respondidoEn}
                monto={datos.monto}
              />
            ) : (
              <>
                <div
                  className="w-full max-w-[240px] rounded-xl bg-white p-3 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: datos.qr }}
                />
                <p className="mt-4 text-center text-[15px] leading-6 text-tinta">
                  Muéstrele este código al cliente.
                  <br />
                  Lo escanea con la cámara de su celular.
                </p>

                <div className="mt-4 w-full rounded-lg border border-borde bg-superficie p-3">
                  <p className="text-micro uppercase text-tinta-3">O dicte este enlace</p>
                  <p className="mt-1 break-all font-mono text-[12px] leading-4 text-tinta-2">
                    {datos.url}
                  </p>
                  <button
                    type="button"
                    onClick={copiar}
                    className="presionable mt-2 w-full rounded-md border border-borde px-3 py-2 text-meta font-semibold text-tinta-2 hover:border-borde-fuerte hover:text-tinta"
                  >
                    {copiado ? 'Copiado' : 'Copiar enlace'}
                  </button>
                </div>

                <p className="mt-4 flex items-center gap-2 text-cuerpo text-tinta-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-acento" aria-hidden />
                  Esperando respuesta del cliente…
                </p>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function Respuesta({
  estado,
  respondidoPor,
  respondidoEn,
  monto,
}: {
  estado: EstadoModal
  respondidoPor: string | null
  respondidoEn: string | null
  monto: number
}) {
  const aprobado = estado === 'aprobado'
  return (
    <div className="entra flex flex-col items-center py-6 text-center">
      {aprobado ? (
        <svg width="96" height="96" viewBox="0 0 88 88" role="img" aria-label="Aprobado">
          <circle cx="44" cy="44" r="42" fill="#22C55E1F" />
          <path
            d="M28 45.5 39 56l21-24"
            fill="none"
            stroke="#22C55E"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="traza-check"
            pathLength={48}
          />
        </svg>
      ) : (
        <svg width="96" height="96" viewBox="0 0 88 88" role="img" aria-label="No autorizado">
          <circle cx="44" cy="44" r="42" fill="#94A3B81F" />
          <path d="M30 44h28" stroke="#94A3B8" strokeWidth="6" strokeLinecap="round" />
        </svg>
      )}

      <p className="mt-5 font-titulo text-pantalla text-tinta">
        {aprobado ? 'Aprobado' : 'No autorizado'}
      </p>

      {respondidoPor && (
        <p className="mt-2 text-[15px] text-tinta-2">
          {respondidoPor}
          {respondidoEn && <span className="cifras"> · {hora(respondidoEn)}</span>}
        </p>
      )}

      {aprobado && (
        <p className="cifras mt-4 font-titulo text-cifra text-aprobado">{dinero(monto)}</p>
      )}
    </div>
  )
}
