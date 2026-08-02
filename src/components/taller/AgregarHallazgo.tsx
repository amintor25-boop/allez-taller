'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { comprimirFoto } from '@/lib/comprimir-foto'
import { dinero } from '@/lib/dominio'

// Lo que el mecánico encuentra durante el diagnóstico y hay que consultar con el
// dueño del carro. Es el paso que arranca la venta.

/**
 * Hallazgos frecuentes. Un toque llena descripción, precio y foto.
 *
 * Están aquí por una razón práctica: en la reunión no se puede depender de
 * escribir bien a la primera ni de que la cámara coopere. El de pastillas es el
 * del recorrido en vivo.
 */
const FRECUENTES = [
  { clave: 'pastillas', descripcion: 'Pastillas de freno delanteras', detalle: 'Al límite, se ven los testigos', precio: 86, foto: '/fotos/pastillas.jpg' },
  { clave: 'amortiguadores', descripcion: 'Amortiguadores delanteros', detalle: 'Par delantero, con fuga de aceite', precio: 220, foto: '/fotos/amortiguadores.jpg' },
  { clave: 'embrague', descripcion: 'Kit de embrague', detalle: 'Disco, prensa y collarín', precio: 340, foto: '/fotos/embrague.jpg' },
  { clave: 'correa', descripcion: 'Correa de distribución', detalle: 'Cristalizada y con juego en el tensor', precio: 180, foto: '/fotos/correa.svg' },
]

export function AgregarHallazgo({
  slug,
  ordenId,
  hayPendientes,
  totalPendiente,
}: {
  slug: string
  ordenId: string
  hayPendientes: boolean
  totalPendiente: number
}) {
  const router = useRouter()

  const [abierto, setAbierto] = useState(false)
  const [campos, setCampos] = useState({ descripcion: '', detalle: '', precio: '' })
  const [fotoSembrada, setFotoSembrada] = useState<string | null>(null)
  const [fotoPropia, setFotoPropia] = useState<{ datos: string; mime: string; vista: string } | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const vistaFoto = fotoPropia?.vista ?? FRECUENTES.find((f) => f.clave === fotoSembrada)?.foto ?? null

  function elegirFrecuente(f: (typeof FRECUENTES)[number]) {
    setCampos({ descripcion: f.descripcion, detalle: f.detalle, precio: String(f.precio) })
    setFotoSembrada(f.clave)
    setFotoPropia(null)
    setError(null)
  }

  async function tomarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    try {
      const c = await comprimirFoto(archivo)
      setFotoPropia({ datos: c.datos, mime: c.mime, vista: `data:${c.mime};base64,${c.datos}` })
      setFotoSembrada(null)
    } catch {
      setError('No se pudo procesar esa foto.')
    } finally {
      e.target.value = ''
    }
  }

  async function agregar() {
    setGuardando(true)
    setError(null)
    try {
      const r = await fetch(`/api/d/${slug}/orden/${ordenId}/hallazgo`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...campos,
          precio: Number(campos.precio),
          fotoSembrada: fotoPropia ? undefined : fotoSembrada,
          foto: fotoPropia ? { datos: fotoPropia.datos, mime: fotoPropia.mime } : undefined,
        }),
      })
      const datos = await r.json()
      if (!r.ok) throw new Error(datos.error ?? 'No se pudo agregar')

      setCampos({ descripcion: '', detalle: '', precio: '' })
      setFotoSembrada(null)
      setFotoPropia(null)
      setAbierto(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo agregar')
    } finally {
      setGuardando(false)
    }
  }

  // Enviar lleva al tablero con el modal abierto: es ahí donde hay que estar
  // cuando el cliente responda, porque es la tarjeta la que tiene que moverse.
  async function enviarPresupuesto() {
    setEnviando(true)
    setError(null)
    try {
      const r = await fetch(`/api/d/${slug}/orden/${ordenId}/presupuesto`, { method: 'POST' })
      const datos = await r.json()
      if (!r.ok) throw new Error(datos.error ?? 'No se pudo enviar')
      router.push(`/d/${slug}?qr=${ordenId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar')
      setEnviando(false)
    }
  }

  // El formulario del hallazgo, en una constante: lo usan la rama de
  // "todavía no hay nada" y la de "ya hay uno, agregue otro".
  const formulario = (
        <>
          <h2 className="text-etiqueta font-semibold uppercase text-tinta-2">¿Qué encontró?</h2>

          <div className="mt-3 flex flex-wrap gap-2">
            {FRECUENTES.map((f) => (
              <button
                key={f.clave}
                type="button"
                onClick={() => elegirFrecuente(f)}
                className={`presionable flex min-h-11 items-center rounded-lg border px-3 py-2 text-meta font-semibold ${
                  fotoSembrada === f.clave
                    ? 'border-accion bg-accion text-white'
                    : 'border-borde bg-elevada text-tinta-2 hover:border-borde-fuerte hover:text-tinta'
                }`}
              >
                {f.descripcion} · ${f.precio}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            <input
              value={campos.descripcion}
              onChange={(e) => setCampos({ ...campos, descripcion: e.target.value })}
              placeholder="Pastillas de freno delanteras"
              className="h-12 w-full rounded-xl border border-borde bg-elevada px-4 text-[16px] text-tinta placeholder:text-tinta-3"
            />
            <input
              value={campos.detalle}
              onChange={(e) => setCampos({ ...campos, detalle: e.target.value })}
              placeholder="Al límite, se ven los testigos (opcional)"
              className="h-12 w-full rounded-xl border border-borde bg-elevada px-4 text-[16px] text-tinta placeholder:text-tinta-3"
            />

            <div className="flex items-center gap-3">
              <span className="font-titulo text-[22px] text-tinta-2">$</span>
              <input
                value={campos.precio}
                onChange={(e) =>
                  setCampos({ ...campos, precio: e.target.value.replace(/[^\d.]/g, '').slice(0, 7) })
                }
                inputMode="decimal"
                placeholder="86"
                className="cifras h-12 w-32 rounded-xl border border-borde bg-elevada px-4 font-titulo text-[20px] text-tinta placeholder:text-tinta-3"
              />
              <span className="text-meta text-tinta-3">IVA incluido</span>
            </div>

            <div className="flex items-center gap-3">
              {vistaFoto ? (
                <img
                  src={vistaFoto}
                  alt="Foto del hallazgo"
                  className="h-16 w-16 rounded-lg border border-borde bg-white object-contain"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-borde text-micro uppercase text-tinta-3">
                  Sin foto
                </span>
              )}
              <label className="presionable inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-borde bg-elevada px-4 text-meta font-semibold text-tinta-2 hover:text-tinta">
                {vistaFoto ? 'Cambiar foto' : 'Tomar foto'}
                <input type="file" accept="image/*" capture="environment" onChange={tomarFoto} className="sr-only" />
              </label>
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-3 rounded-lg border border-alta px-3 py-2 text-meta text-tinta">
              {error}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={agregar}
              disabled={guardando || !campos.descripcion.trim() || !campos.precio}
              className="presionable h-12 flex-1 rounded-xl bg-accion text-cuerpo font-semibold text-white hover:bg-accion-hover disabled:opacity-40"
            >
              {guardando ? 'Agregando…' : 'Agregar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAbierto(false)
                setError(null)
              }}
              className="h-12 rounded-xl px-4 text-cuerpo text-tinta-2 hover:text-tinta"
            >
              Cancelar
            </button>
          </div>
        </>
  )

  return (
    <section className="rounded-xl border border-borde bg-superficie p-5">
      {hayPendientes ? (
        <>
          <h2 className="text-etiqueta font-semibold uppercase text-tinta-2">Falta el visto bueno</h2>
          <p className="mt-2 text-[15px] leading-6 text-tinta">
            Hay {dinero(totalPendiente)} esperando que el cliente autorice.
          </p>
          <button
            type="button"
            onClick={enviarPresupuesto}
            disabled={enviando}
            className="presionable mt-4 flex h-14 w-full items-center justify-center gap-2.5 rounded-xl bg-aprobado text-cuerpo font-semibold text-[#062D14] hover:brightness-110 disabled:opacity-60"
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
            {enviando ? 'Enviando…' : 'Enviar presupuesto por WhatsApp'}
          </button>

          {/* Un carro rara vez trae un solo problema. Con un hallazgo puesto,
              el bloque entero se sustituía por el botón de WhatsApp y no había
              forma de añadir el segundo sin mandar el presupuesto primero. */}
          {abierto ? (
            <div className="mt-4">{formulario}</div>
          ) : (
            <button
              type="button"
              onClick={() => setAbierto(true)}
              className="presionable mt-3 flex h-11 w-full items-center justify-center rounded-lg border border-borde text-cuerpo font-semibold text-tinta-2 hover:border-borde-fuerte hover:text-tinta"
            >
              + Agregar otro hallazgo
            </button>
          )}

          {error && (
            <p role="alert" className="mt-3 rounded-lg border border-alta px-3 py-2 text-meta text-tinta">
              {error}
            </p>
          )}
        </>
      ) : !abierto ? (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="presionable flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-borde-fuerte text-cuerpo font-semibold text-tinta-2 hover:text-tinta"
        >
          <span className="text-[18px] leading-none" aria-hidden>
            +
          </span>
          Agregar hallazgo
        </button>
      ) : (
        formulario
      )}
    </section>
  )
}
