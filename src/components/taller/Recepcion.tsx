'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Placa } from '@/components/Placa'
import { comprimirFoto } from '@/lib/comprimir-foto'
import type { Coincidencia, FichaVehiculo } from '@/lib/consultas-taller'
import {
  COMBUSTIBLES,
  dinero,
  ESTADO_INFO,
  fechaCorta,
  normalizarPlaca,
  placaValida,
  telefonoLegible,
} from '@/lib/dominio'

// RECEPCIÓN.
//
// Se usa de pie junto al carro, con el celular en una mano y sol en la pantalla.
// De ahí todo lo de abajo: la placa es un campo enorme con forma de placa, el
// combustible y el color se eligen tocando y no escribiendo, y los botones son
// de 56 px para un pulgar con grasa.
//
// No hay botón de buscar: se escribe la placa y el resultado aparece solo.
// El formato da igual — pbx1234, pbx 1234 y PBX-1234 son la misma placa.

const MARCAS = ['Chevrolet', 'Kia', 'Hyundai', 'Toyota', 'Nissan', 'Great Wall', 'Chery', 'Mazda', 'Suzuki', 'Renault', 'Ford', 'Volkswagen', 'Otra']
const COLORES = ['Blanco', 'Negro', 'Gris', 'Plateado', 'Rojo', 'Azul', 'Verde', 'Otro']

type Paso = 'buscar' | 'nuevo' | 'orden'

export function Recepcion({ slug }: { slug: string }) {
  const router = useRouter()

  const [placa, setPlaca] = useState('')
  const [paso, setPaso] = useState<Paso>('buscar')
  const [ficha, setFicha] = useState<FichaVehiculo | null>(null)
  const [coincidencias, setCoincidencias] = useState<Coincidencia[]>([])
  const [buscando, setBuscando] = useState(false)

  const [nuevo, setNuevo] = useState({ marca: 'Chevrolet', modelo: '', anio: '', color: 'Blanco', cliente: '', telefono: '' })
  const [orden, setOrden] = useState({ kilometraje: '', combustible: '1/2' as (typeof COMBUSTIBLES)[number], observacion: '' })
  const [foto, setFoto] = useState<{ datos: string; mime: string; bytes: number; vista: string } | null>(null)
  const [procesandoFoto, setProcesandoFoto] = useState(false)

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const corte = useRef<AbortController | null>(null)

  // ── Búsqueda mientras se escribe ──────────────────────────────────────────
  useEffect(() => {
    if (paso !== 'buscar') return
    const limpia = placa.replace(/-/g, '')
    if (limpia.length < 3) {
      // Borrar el campo tiene que cancelar lo que ya salió. Si no, la respuesta
      // de la placa anterior vuelve y pinta "Placas que se parecen" con seis
      // vehículos que nadie buscó, sobre un campo vacío.
      corte.current?.abort()
      setBuscando(false)
      setFicha(null)
      setCoincidencias([])
      return
    }

    const reloj = setTimeout(async () => {
      corte.current?.abort()
      const ctrl = new AbortController()
      corte.current = ctrl
      setBuscando(true)
      try {
        const r = await fetch(`/api/d/${slug}/placa?placa=${encodeURIComponent(placa)}`, {
          signal: ctrl.signal,
        })
        const datos = await r.json()
        // Entre que salió la petición y volvió pudo pasar de todo: comprobamos
        // que sigue siendo la búsqueda vigente antes de pintar nada.
        if (ctrl.signal.aborted) return
        setFicha(datos.ficha ?? null)
        setCoincidencias(datos.coincidencias ?? [])
      } catch {
        /* búsqueda cancelada o red caída: se reintenta con la siguiente tecla */
      } finally {
        if (!ctrl.signal.aborted) setBuscando(false)
      }
    }, 200)

    // Al cambiar de placa o de paso se corta lo que esté en vuelo, no solo el
    // temporizador: cancelar el reloj no cancela un fetch que ya salió.
    return () => {
      clearTimeout(reloj)
      corte.current?.abort()
    }
  }, [placa, slug, paso])

  // Al pasar al formulario, el kilometraje arranca en el último registrado.
  function irAOrden() {
    setOrden((o) => ({ ...o, kilometraje: ficha ? String(ficha.kilometraje) : o.kilometraje }))
    setError(null)
    setPaso('orden')
  }

  async function tomarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setProcesandoFoto(true)
    setError(null)
    try {
      const c = await comprimirFoto(archivo)
      setFoto({ ...c, vista: `data:${c.mime};base64,${c.datos}` })
    } catch {
      setError('No se pudo procesar esa foto. Intente con otra.')
    } finally {
      setProcesandoFoto(false)
      e.target.value = ''
    }
  }

  async function crear() {
    setEnviando(true)
    setError(null)
    try {
      const r = await fetch(`/api/d/${slug}/orden`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          placa,
          vehiculoNuevo: ficha ? undefined : { ...nuevo, anio: Number(nuevo.anio) || undefined },
          kilometraje: Number(orden.kilometraje) || 0,
          combustible: orden.combustible,
          observacion: orden.observacion,
          foto: foto ? { datos: foto.datos, mime: foto.mime } : undefined,
        }),
      })
      const datos = await r.json()
      if (!r.ok) {
        if (r.status === 409 && datos.ordenId) {
          router.push(`/d/${slug}/orden/${datos.ordenId}`)
          return
        }
        throw new Error(datos.error ?? 'No se pudo crear la orden')
      }
      router.push(`/d/${slug}/orden/${datos.ordenId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la orden')
      setEnviando(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-16 pt-6 sm:px-6">
      {/* ── La placa: el campo principal, con forma de placa ──────────────── */}
      <label htmlFor="placa" className="block text-center text-etiqueta font-semibold uppercase text-tinta-2">
        {paso === 'buscar' ? 'Escriba la placa' : 'Placa'}
      </label>

      <div className="mx-auto mt-3 w-full max-w-[330px] overflow-hidden rounded-[10px] border-[3px] border-placa-tinta bg-placa-cuerpo">
        <div className="bg-placa-franja py-[3px] text-center text-[10px] font-semibold tracking-[0.28em] text-white/95">
          ECUADOR
        </div>
        <input
          id="placa"
          value={placa}
          onChange={(e) => {
            setPlaca(normalizarPlaca(e.target.value))
            if (paso !== 'buscar') setPaso('buscar')
          }}
          readOnly={paso !== 'buscar'}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          enterKeyHint="search"
          placeholder="PBX-1234"
          aria-describedby="ayuda-placa"
          className="w-full bg-transparent px-3 py-2 text-center font-titulo text-[36px] leading-[46px] tracking-[-0.02em] text-placa-tinta outline-none placeholder:text-placa-tinta/20"
        />
      </div>

      <p id="ayuda-placa" className="mt-2 text-center text-meta text-tinta-3">
        {buscando ? 'Buscando…' : 'Da igual cómo la escriba: pbx1234, pbx 1234 o PBX-1234'}
      </p>

      {/* ── Resultado de la búsqueda ──────────────────────────────────────── */}
      {paso === 'buscar' && (
        <>
          {ficha && <FichaEncontrada slug={slug} ficha={ficha} onAbrir={irAOrden} />}

          {!ficha && coincidencias.length > 0 && (
            <section className="mt-6">
              <h2 className="text-etiqueta font-semibold uppercase text-tinta-2">
                {coincidencias.length === 1 ? 'Una placa se parece' : 'Placas que se parecen'}
              </h2>
              <ul className="mt-3 space-y-2">
                {coincidencias.map((c) => (
                  <li key={c.placa}>
                    <button
                      type="button"
                      onClick={() => setPlaca(c.placa)}
                      className="presionable flex w-full items-center gap-3 rounded-xl border border-borde bg-superficie p-3 text-left hover:border-borde-fuerte"
                    >
                      <Placa placa={c.placa} tamano="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-cuerpo text-tinta">
                          {c.marca} {c.modelo}
                        </span>
                        <span className="block truncate text-meta text-tinta-3">{c.cliente}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!ficha && coincidencias.length === 0 && placaValida(placa) && !buscando && (
            <section className="mt-6 rounded-xl border border-borde bg-superficie p-5 text-center">
              <p className="font-titulo text-seccion text-tinta">Ese carro no está registrado</p>
              <p className="mt-2 text-cuerpo text-tinta-2">
                Se da de alta ahora mismo y se abre su orden.
              </p>
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setPaso('nuevo')
                }}
                className="presionable mt-5 h-14 w-full rounded-xl bg-accion text-cuerpo font-semibold text-white hover:bg-accion-hover"
              >
                Registrar {placa}
              </button>
            </section>
          )}
        </>
      )}

      {/* ── Alta de vehículo ──────────────────────────────────────────────── */}
      {paso === 'nuevo' && (
        <section className="mt-7 space-y-5">
          <h2 className="font-titulo text-seccion text-tinta">Carro nuevo</h2>

          <Campo etiqueta="Marca">
            <select
              value={nuevo.marca}
              onChange={(e) => setNuevo({ ...nuevo, marca: e.target.value })}
              className="h-14 w-full rounded-xl border border-borde bg-superficie px-4 text-[16px] text-tinta"
            >
              {MARCAS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Modelo">
            <input
              value={nuevo.modelo}
              onChange={(e) => setNuevo({ ...nuevo, modelo: e.target.value })}
              placeholder="Sail, Rio, Tucson…"
              className="h-14 w-full rounded-xl border border-borde bg-superficie px-4 text-[16px] text-tinta placeholder:text-tinta-3"
            />
          </Campo>

          <Campo etiqueta="Año">
            <input
              value={nuevo.anio}
              onChange={(e) => setNuevo({ ...nuevo, anio: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              inputMode="numeric"
              placeholder="2016"
              className="cifras h-14 w-full rounded-xl border border-borde bg-superficie px-4 text-[16px] text-tinta placeholder:text-tinta-3"
            />
          </Campo>

          <Campo etiqueta="Color">
            <Fichas
              opciones={COLORES}
              valor={nuevo.color}
              onElegir={(v) => setNuevo({ ...nuevo, color: v })}
            />
          </Campo>

          <Campo etiqueta="Dueño del carro">
            <input
              value={nuevo.cliente}
              onChange={(e) => setNuevo({ ...nuevo, cliente: e.target.value })}
              placeholder="Nombre y apellido"
              autoComplete="name"
              className="h-14 w-full rounded-xl border border-borde bg-superficie px-4 text-[16px] text-tinta placeholder:text-tinta-3"
            />
          </Campo>

          <Campo etiqueta="Teléfono">
            <input
              value={nuevo.telefono}
              onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })}
              inputMode="tel"
              placeholder="09…"
              autoComplete="tel"
              className="cifras h-14 w-full rounded-xl border border-borde bg-superficie px-4 text-[16px] text-tinta placeholder:text-tinta-3"
            />
          </Campo>

          <button
            type="button"
            disabled={!nuevo.modelo.trim() || !nuevo.cliente.trim()}
            onClick={irAOrden}
            className="presionable h-14 w-full rounded-xl bg-accion text-cuerpo font-semibold text-white hover:bg-accion-hover disabled:opacity-40"
          >
            Continuar
          </button>
        </section>
      )}

      {/* ── Datos de ingreso ──────────────────────────────────────────────── */}
      {paso === 'orden' && (
        <section className="mt-7 space-y-5">
          <h2 className="font-titulo text-seccion text-tinta">
            {ficha ? `${ficha.marca} ${ficha.modelo} ${ficha.anio}` : `${nuevo.marca} ${nuevo.modelo}`}
          </h2>

          <Campo
            etiqueta="Kilometraje"
            ayuda={ficha ? `Último registrado: ${ficha.kilometraje.toLocaleString('es-EC')} km` : undefined}
          >
            <div className="flex items-center gap-3">
              <input
                value={orden.kilometraje}
                onChange={(e) =>
                  setOrden({ ...orden, kilometraje: e.target.value.replace(/\D/g, '').slice(0, 7) })
                }
                inputMode="numeric"
                placeholder="0"
                className="cifras h-14 min-w-0 flex-1 rounded-xl border border-borde bg-superficie px-4 text-[20px] font-semibold text-tinta placeholder:text-tinta-3"
              />
              <span className="shrink-0 text-cuerpo text-tinta-2">km</span>
            </div>
          </Campo>

          <Campo etiqueta="Combustible">
            <Fichas
              opciones={[...COMBUSTIBLES]}
              valor={orden.combustible}
              onElegir={(v) => setOrden({ ...orden, combustible: v as (typeof COMBUSTIBLES)[number] })}
            />
          </Campo>

          <Campo etiqueta="¿Qué dijo el cliente?">
            <textarea
              value={orden.observacion}
              onChange={(e) => setOrden({ ...orden, observacion: e.target.value })}
              rows={3}
              placeholder="Suena algo adelante cuando frena…"
              className="w-full resize-none rounded-xl border border-borde bg-superficie px-4 py-3 text-[16px] leading-6 text-tinta placeholder:text-tinta-3"
            />
          </Campo>

          <Campo etiqueta="Foto de cómo entró">
            {foto ? (
              <div className="flex items-center gap-3">
                <img
                  src={foto.vista}
                  alt="Foto del vehículo al ingresar"
                  className="h-20 w-20 rounded-xl border border-borde object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="cifras text-meta text-tinta-2">{Math.round(foto.bytes / 1024)} KB</p>
                  <button
                    type="button"
                    onClick={() => setFoto(null)}
                    className="mt-1 text-cuerpo font-semibold text-tinta-2 underline underline-offset-4 hover:text-tinta"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ) : (
              <label className="presionable flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-borde-fuerte bg-superficie text-cuerpo font-semibold text-tinta-2 hover:text-tinta">
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                  <path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinejoin="round" />
                  <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.7" fill="none" />
                </svg>
                {procesandoFoto ? 'Preparando…' : 'Tomar foto'}
                <input type="file" accept="image/*" capture="environment" onChange={tomarFoto} className="sr-only" />
              </label>
            )}
          </Campo>

          {error && (
            <p role="alert" className="rounded-xl border border-alta bg-superficie px-4 py-3 text-cuerpo text-tinta">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={crear}
            disabled={enviando}
            className="presionable h-14 w-full rounded-xl bg-accion text-cuerpo font-semibold text-white hover:bg-accion-hover disabled:opacity-50"
          >
            {enviando ? 'Creando…' : 'Crear orden'}
          </button>

          <button
            type="button"
            onClick={() => setPaso('buscar')}
            className="h-12 w-full text-cuerpo text-tinta-2 hover:text-tinta"
          >
            Volver
          </button>
        </section>
      )}
    </main>
  )
}

// ─── Piezas ──────────────────────────────────────────────────────────────────

function Campo({
  etiqueta,
  ayuda,
  children,
}: {
  etiqueta: string
  ayuda?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="mb-2 text-etiqueta font-semibold uppercase text-tinta-2">{etiqueta}</p>
      {children}
      {ayuda && <p className="mt-1.5 text-meta text-tinta-3">{ayuda}</p>}
    </div>
  )
}

/** Se elige tocando, no escribiendo: es lo único que funciona con grasa en el dedo. */
function Fichas({
  opciones,
  valor,
  onElegir,
}: {
  opciones: string[]
  valor: string
  onElegir: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={valor === o}
          onClick={() => onElegir(o)}
          className={`presionable h-12 min-w-[64px] rounded-xl border px-4 text-cuerpo font-semibold capitalize ${
            valor === o
              ? 'border-accion bg-accion text-white'
              : 'border-borde bg-superficie text-tinta-2 hover:border-borde-fuerte hover:text-tinta'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

function FichaEncontrada({
  slug,
  ficha,
  onAbrir,
}: {
  slug: string
  ficha: FichaVehiculo
  onAbrir: () => void
}) {
  return (
    <section className="entra mt-6 space-y-4">
      <div className="rounded-xl border border-borde bg-superficie p-5">
        <p className="font-titulo text-seccion text-tinta">
          {ficha.marca} {ficha.modelo} {ficha.anio}
        </p>
        <p className="mt-1 text-meta text-tinta-2">
          {ficha.color} · {ficha.kilometraje.toLocaleString('es-EC')} km
        </p>

        <div className="mt-4 border-t border-borde pt-4">
          <p className="text-etiqueta font-semibold uppercase text-tinta-2">Dueño</p>
          <p className="mt-1.5 text-[17px] font-semibold text-tinta">{ficha.cliente}</p>
          <p className="cifras mt-0.5 text-cuerpo text-tinta-2">{telefonoLegible(ficha.telefono)}</p>
        </div>

        <Link
          href={`/d/${slug}/vehiculo/${ficha.vehiculoId}`}
          className="presionable mt-4 flex h-12 items-center justify-center rounded-xl border border-borde text-cuerpo font-semibold text-tinta-2 hover:border-borde-fuerte hover:text-tinta"
        >
          Ver la ficha completa del carro
        </Link>
      </div>

      {ficha.ordenAbierta ? (
        <div className="rounded-xl border border-media bg-superficie p-5">
          <p className="text-cuerpo font-semibold text-media">Este carro ya está en el taller</p>
          <p className="mt-1 text-cuerpo text-tinta-2">
            Orden #0{ficha.ordenAbierta.numero} · {ESTADO_INFO[ficha.ordenAbierta.estado].largo}
          </p>
          <Link
            href={`/d/${slug}/orden/${ficha.ordenAbierta.id}`}
            className="presionable mt-4 flex h-14 w-full items-center justify-center rounded-xl bg-accion text-cuerpo font-semibold text-white hover:bg-accion-hover"
          >
            Ver esa orden
          </Link>
        </div>
      ) : (
        <button
          type="button"
          onClick={onAbrir}
          className="presionable h-14 w-full rounded-xl bg-accion text-cuerpo font-semibold text-white hover:bg-accion-hover"
        >
          Abrir orden
        </button>
      )}

      <div className="overflow-hidden rounded-xl border border-borde bg-superficie">
        <h2 className="border-b border-borde px-5 py-3 text-etiqueta font-semibold uppercase text-tinta-2">
          {ficha.historial.length > 0
            ? `Ya ha venido ${ficha.historial.length} ${ficha.historial.length === 1 ? 'vez' : 'veces'}`
            : 'Primera visita'}
        </h2>
        {ficha.historial.length > 0 ? (
          <ul>
            {ficha.historial.map((v) => (
              <li key={v.numero} className="border-b border-borde last:border-0">
                {/* Una fila de registro que no lleva a ningún lado es una promesa
                    rota: cada visita abre su orden, con su factura. */}
                <Link
                  href={`/d/${slug}/orden/${v.id}`}
                  className="presionable flex min-h-[56px] items-center gap-3 px-5 py-3.5 hover:bg-elevada"
                >
                  <span className="cifras w-14 shrink-0 text-meta text-tinta-3">
                    {fechaCorta(v.fecha)}
                  </span>
                  <span className="min-w-0 flex-1 text-cuerpo text-tinta">{v.servicios}</span>
                  <span className="cifras shrink-0 text-cuerpo font-semibold text-tinta-2">
                    {dinero(v.total)}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden className="shrink-0 text-tinta-3">
                    <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-4 text-cuerpo text-tinta-2">
            Es la primera vez que este carro entra al taller.
          </p>
        )}
      </div>
    </section>
  )
}
