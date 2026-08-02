'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TarjetaOrden } from './TarjetaOrden'
import { ModalPresupuesto, type DatosModal, type EstadoModal } from './ModalPresupuesto'
import { ESTADOS, ESTADO_INFO, type Estado } from '@/lib/dominio'
import type { Tarjeta } from '@/lib/consultas-taller'

const COLOR_COLUMNA: Record<Estado, string> = {
  ingresado: '#6B7BA0',
  diagnostico: '#2563EB',
  aprobacion: '#F59E0B',
  reparacion: '#00E5FF',
  listo: '#22C55E',
}

const UMBRAL_ARRASTRE = 6 // px antes de considerar que es un arrastre y no un clic
const ESPERA_TACTIL = 250 // ms de sostener con el dedo antes de arrastrar

// ── Ritmo de la consulta periódica ──────────────────────────────────────────
//
// 3 segundos exactos mientras el modal del QR está abierto: es el camino de oro
// y no se toca. Después de unos minutos sin novedad va aflojando, y con la
// pestaña oculta se detiene del todo. Cada consulta es una invocación de función
// en Netlify, y el plan gratis se agota si esto corre a ciegas toda la tarde.
const RITMO_ESPERANDO = 3_000
const RITMO_TIBIO = 10_000
const RITMO_FRIO = 30_000
const RITMO_REPOSO = 20_000 // sin modal: solo para que el tablero no se quede viejo

// OJO: el retroceso cuenta desde que se ABRIÓ el modal, no desde el último cambio
// del tablero. Mientras se espera al cliente no cambia nada por definición, así que
// medir "tiempo sin cambios" hacía que la consulta se fuera a 10 y luego a 30
// segundos justo mientras el prospecto decidía — y la tarjeta se habría movido
// medio minuto tarde, en silencio, delante del cliente.
//
// Diez minutos de 3 segundos son 200 consultas: cabe de sobra en el plan gratis y
// ninguna decisión en una reunión tarda más que eso.
const ESPERA_VIVA = 600_000 // 10 min a 3 s
const ESPERA_LARGA = 1_200_000 // 20 min

/** El momento de la venta necesita aire: el visto bueno se queda a la vista
 *  antes de que el modal se disuelva y la tarjeta empiece a viajar. */
const PAUSA_CELEBRACION = 2_200

/** Huella del tablero. Si no cambia, no hay nada que repintar. */
function firma(tarjetas: Tarjeta[]): string {
  return tarjetas.map((t) => `${t.id}:${t.estado}:${t.total}:${t.esperandoCliente ? 1 : 0}:${t.facturada ? 1 : 0}`).join('|')
}

type Arrastre = {
  id: string
  origen: Estado
  destino: Estado
  dx: number
  dy: number
}

export function Tablero({
  slug,
  tarjetas,
  modal,
}: {
  slug: string
  tarjetas: Tarjeta[]
  modal?: DatosModal | null
}) {
  const router = useRouter()
  const [lista, setLista] = useState(tarjetas)

  const [modalAbierto, setModalAbierto] = useState(Boolean(modal))
  const [estadoModal, setEstadoModal] = useState<EstadoModal>(modal?.respuestaPrevia?.estado ?? 'esperando')
  const [respuesta, setRespuesta] = useState<{ por: string | null; en: string | null }>({
    por: modal?.respuestaPrevia?.por ?? null,
    en: modal?.respuestaPrevia?.en ?? null,
  })
  const celebrando = useRef(false)
  const [arrastre, pintarArrastre] = useState<Arrastre | null>(null)

  // El arrastre vive en una referencia además del estado. Varios eventos de
  // puntero pueden caer en el mismo tick y el estado de React todavía no se
  // habría actualizado: los manejadores leerían un valor viejo y el arrastre se
  // perdería. La referencia siempre está al día; el estado solo sirve para pintar.
  const arrastreRef = useRef<Arrastre | null>(null)
  const setArrastre = useCallback((v: Arrastre | null) => {
    arrastreRef.current = v
    pintarArrastre(v)
  }, [])
  const [menu, setMenu] = useState<string | null>(null)
  const [fallo, setFallo] = useState<string | null>(null)
  const [recienMovida, setRecienMovida] = useState<string | null>(null)

  // Los datos del servidor mandan… salvo mientras se está celebrando una
  // respuesta: ahí el repintado espera a que el modal se disuelva, para que la
  // tarjeta se vea viajar y no aparezca ya movida detrás del modal.
  useEffect(() => {
    if (!celebrando.current) setLista(tarjetas)
  }, [tarjetas])

  const nodos = useRef(new Map<string, HTMLElement>())
  const posiciones = useRef(new Map<string, DOMRect>())
  const columnas = useRef(new Map<Estado, HTMLElement>())

  // ── La transición que sí debe notarse ────────────────────────────────────
  // Cuando una orden cambia de columna —la arrastró alguien o la aprobó el
  // cliente desde su celular— la tarjeta viaja desde donde estaba hasta donde
  // quedó, en vez de desaparecer y reaparecer. Es el momento que vende.
  useLayoutEffect(() => {
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    for (const [id, nodo] of nodos.current) {
      const antes = posiciones.current.get(id)
      const ahora = nodo.getBoundingClientRect()

      if (antes && !quieto) {
        const dx = antes.left - ahora.left
        const dy = antes.top - ahora.top
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          nodo.animate(
            [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0,0)' }],
            { duration: 700, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
          )
        }
      }
      posiciones.current.set(id, ahora)
    }

    // Las posiciones de tarjetas que ya no existen se descartan; las de las que
    // solo cambiaron de columna se conservan a propósito: son el punto de partida
    // de la animación.
    for (const id of posiciones.current.keys()) {
      if (!lista.some((t) => t.id === id)) posiciones.current.delete(id)
    }
  })

  // Una función por id, memorizada. Si se creara una nueva en cada render, React
  // la llamaría con null y volvería a montar la referencia cada vez, y la
  // animación de arriba nunca tendría un punto de partida.
  const refsPorId = useRef(new Map<string, (n: HTMLElement | null) => void>())
  const registrar = useCallback((id: string) => {
    let f = refsPorId.current.get(id)
    if (!f) {
      f = (nodo: HTMLElement | null) => {
        if (nodo) nodos.current.set(id, nodo)
        else nodos.current.delete(id)
      }
      refsPorId.current.set(id, f)
    }
    return f
  }, [])

  // ── Mover una orden ───────────────────────────────────────────────────────
  async function mover(id: string, destino: Estado) {
    const antes = lista
    const tarjeta = antes.find((t) => t.id === id)
    if (!tarjeta || tarjeta.estado === destino) return

    // Se pinta primero y se pregunta después: la reunión no espera a la red.
    setLista(antes.map((t) => (t.id === id ? { ...t, estado: destino } : t)))
    setRecienMovida(id)
    setTimeout(() => setRecienMovida((v) => (v === id ? null : v)), 900)

    try {
      const r = await fetch(`/api/d/${slug}/orden/${id}/mover`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ estado: destino }),
      })
      if (!r.ok) throw new Error()
      router.refresh()
    } catch {
      setLista(antes) // se devuelve sola a donde estaba
      setFallo('No se pudo mover la orden. Vuelva a intentarlo.')
      setTimeout(() => setFallo(null), 4000)
    }
  }

  // ── Arrastre con Pointer Events (ratón, lápiz y dedo) ─────────────────────
  // `armado` = ya se puede arrastrar. Con el dedo se arma al sostener; con ratón,
  // de inmediato. Pero el puntero NO se captura hasta que el dedo se mueve de
  // verdad: capturarlo antes hace que el navegador dispare el clic sobre la
  // tarjeta en vez de sobre el botón interno, y un toque normal no abre nada.
  const pendiente = useRef<{
    id: string
    origen: Estado
    x: number
    y: number
    armado: boolean
    reloj?: number
  } | null>(null)
  const rectas = useRef<{ estado: Estado; izq: number; der: number }[]>([])

  function medirColumnas() {
    rectas.current = ESTADOS.map((e) => {
      const el = columnas.current.get(e)
      const r = el?.getBoundingClientRect()
      return { estado: e, izq: r?.left ?? 0, der: r?.right ?? 0 }
    })
  }

  function columnaBajo(x: number): Estado | null {
    return rectas.current.find((c) => x >= c.izq && x <= c.der)?.estado ?? null
  }

  function alBajar(e: React.PointerEvent, t: Tarjeta) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if ((e.target as HTMLElement).closest('[data-no-arrastrar]')) return

    const tactil = e.pointerType === 'touch'
    pendiente.current = {
      id: t.id,
      origen: t.estado,
      x: e.clientX,
      y: e.clientY,
      armado: !tactil,
    }

    // Con el dedo hay que sostener un momento antes de poder arrastrar: si no,
    // arrastrar la tarjeta impediría desplazar la lista, que es lo primero que
    // hace la gente. Sostener solo ARMA; el arrastre empieza al mover.
    if (tactil) {
      pendiente.current.reloj = window.setTimeout(() => {
        if (pendiente.current) pendiente.current.armado = true
      }, ESPERA_TACTIL)
    }
  }

  function alMover(e: React.PointerEvent) {
    const p = pendiente.current
    if (!p) return

    const vivo = arrastreRef.current
    const dx = e.clientX - p.x
    const dy = e.clientY - p.y
    const lejos = Math.hypot(dx, dy) > UMBRAL_ARRASTRE

    if (!vivo) {
      if (!lejos) return

      // Se movió antes de sostener: está desplazando la lista, no arrastrando.
      if (!p.armado) {
        clearTimeout(p.reloj)
        pendiente.current = null
        return
      }

      // Recién aquí se captura el puntero: ya hay movimiento de verdad, así que
      // no hay ningún clic que estropear.
      medirColumnas()
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch {}
      setArrastre({ id: p.id, origen: p.origen, destino: p.origen, dx, dy })
      return
    }

    e.preventDefault()
    setArrastre({ ...vivo, dx, dy, destino: columnaBajo(e.clientX) ?? vivo.origen })
  }

  // Se acaba de arrastrar: el clic que el navegador dispara al soltar no debe
  // navegar. Es el único caso en que hay que frenar el enlace.
  const arrastroReciente = useRef(0)

  function alSoltar() {
    if (pendiente.current?.reloj) clearTimeout(pendiente.current.reloj)
    pendiente.current = null
    const vivo = arrastreRef.current
    if (!vivo) return
    arrastroReciente.current = Date.now()
    setArrastre(null)
    if (vivo.destino !== vivo.origen) mover(vivo.id, vivo.destino)
  }

  // ── Consulta periódica ────────────────────────────────────────────────────
  const listaRef = useRef(lista)
  listaRef.current = lista
  const modalAbiertoRef = useRef(modalAbierto)
  modalAbiertoRef.current = modalAbierto

  // Cuándo se abrió el modal: es el reloj que gobierna el ritmo de la consulta.
  const abiertoDesde = useRef<number | null>(modalAbierto ? Date.now() : null)
  useEffect(() => {
    abiertoDesde.current = modalAbierto ? Date.now() : null
  }, [modalAbierto])

  useEffect(() => {
    let vivo = true
    let reloj: ReturnType<typeof setTimeout> | undefined
    let huella = firma(listaRef.current)

    function ritmo(): number {
      if (!modalAbiertoRef.current) return RITMO_REPOSO
      const esperando = Date.now() - (abiertoDesde.current ?? Date.now())
      if (esperando > ESPERA_LARGA) return RITMO_FRIO
      if (esperando > ESPERA_VIVA) return RITMO_TIBIO
      return RITMO_ESPERANDO
    }

    function programar() {
      if (!vivo) return
      reloj = setTimeout(consultar, ritmo())
    }

    async function consultar() {
      if (!vivo) return
      if (document.visibilityState !== 'visible') return programar()

      try {
        const r = await fetch(`/api/d/${slug}/tablero`, { cache: 'no-store' })
        if (r.ok) {
          const { tarjetas: nuevas } = (await r.json()) as { tarjetas: Tarjeta[] }
          const nueva = firma(nuevas)
          if (nueva !== huella) {
            huella = nueva
            recibir(nuevas)
          }
        }
      } catch {
        /* red caída: se reintenta en el siguiente turno, sin molestar en pantalla */
      }
      programar()
    }

    /** Llegaron datos nuevos. Si son la respuesta que se estaba esperando,
     *  primero se celebra y después se repinta. */
    function recibir(nuevas: Tarjeta[]) {
      const objetivo = modal && modalAbiertoRef.current ? nuevas.find((t) => t.id === modal.ordenId) : undefined

      if (objetivo && !objetivo.esperandoCliente && objetivo.respondidoEn) {
        celebrando.current = true
        setEstadoModal(objetivo.estado === 'reparacion' ? 'aprobado' : 'rechazado')
        setRespuesta({ por: objetivo.respondidoPor, en: objetivo.respondidoEn })

        setTimeout(() => {
          setModalAbierto(false)
          celebrando.current = false
          setLista(nuevas) // aquí arranca el viaje de la tarjeta
          router.replace(`/d/${slug}`, { scroll: false })
        }, PAUSA_CELEBRACION)
        return
      }

      if (!celebrando.current) setLista(nuevas)
    }

    // Al volver a la pestaña se consulta de inmediato: nadie espera 3 segundos
    // mirando datos viejos.
    function alVolver() {
      if (document.visibilityState !== 'visible') return
      clearTimeout(reloj)
      consultar()
    }

    document.addEventListener('visibilitychange', alVolver)
    programar()

    return () => {
      vivo = false
      clearTimeout(reloj)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [slug, modal, router])

  function cerrarModal() {
    setModalAbierto(false)
    router.replace(`/d/${slug}`, { scroll: false })
  }

  // Cerrar el menú al tocar fuera o con Escape.
  //
  // OJO CON EL "FUERA". Este oyente cerraba con CUALQUIER pointerdown, incluido
  // el que caía encima de una opción del propio menú. Como `pointerdown` es un
  // evento discreto, React vaciaba el estado de forma síncrona y desmontaba el
  // portal ANTES de que el navegador llegara a emitir el click: la opción salía
  // del DOM diez milisegundos después de tocarla y `onElegir` no corría nunca.
  // Medido: cero peticiones a /mover, contadores de columna idénticos. El menú
  // se veía, respondía al toque y no hacía nada — y es justo el camino que se
  // usa con el dedo cuando el arrastre no sale a la primera.
  //
  // El menú vive en un portal colgado de <body>, así que el botón de los tres
  // puntos no es su ancestro: hay que nombrar los dos.
  useEffect(() => {
    if (!menu) return
    const fuera = (e: Event) => {
      const donde = e.target as HTMLElement | null
      if (donde?.closest?.('[role="menu"], [data-no-arrastrar]')) return
      setMenu(null)
    }
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null)
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('pointerdown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [menu])

  return (
    <>
      <main className="flex min-h-0 flex-1 gap-3 overflow-x-auto px-4 pb-6 pt-4 sm:px-6">
        {ESTADOS.map((estado) => {
          const enColumna = lista.filter((t) => t.estado === estado)
          const destinoActivo = arrastre?.destino === estado && arrastre.origen !== estado

          return (
            <section
              key={estado}
              ref={(el) => {
                if (el) columnas.current.set(estado, el)
              }}
              className={`flex w-[268px] shrink-0 flex-col rounded-xl border transition-colors ${
                destinoActivo ? 'border-acento bg-elevada' : 'border-transparent bg-columna'
              }`}
              aria-label={`${ESTADO_INFO[estado].largo}, ${enColumna.length} órdenes`}
              data-recorrido={estado === 'aprobacion' ? 'aprobacion' : undefined}
            >
              <div className="flex items-center justify-between px-3 pb-2 pt-3">
                <span className="text-etiqueta font-semibold uppercase text-tinta-2">
                  {ESTADO_INFO[estado].corto}
                </span>
                <span className="cifras text-etiqueta font-semibold text-tinta-3">
                  {enColumna.length}
                </span>
              </div>
              <div
                className="mx-3 h-0.5 rounded-full"
                style={{ background: COLOR_COLUMNA[estado] }}
                aria-hidden
              />

              <div className="flex flex-1 flex-col gap-2.5 p-3">
                {enColumna.map((t, i) => {
                  const esta = arrastre?.id === t.id
                  return (
                    <TarjetaOrden
                      key={t.id}
                      data-recorrido={estado === 'diagnostico' && i === 0 ? 'tarjeta' : undefined}
                      ref={registrar(t.id)}
                      t={t}
                      arrastrando={esta}
                      menuAbierto={menu === t.id}
                      onMenu={(v) => setMenu(v ? t.id : null)}
                      onMover={(destino) => mover(t.id, destino)}
                      href={`/d/${slug}/orden/${t.id}`}
                      onPointerDown={(e) => alBajar(e, t)}
                      onPointerMove={alMover}
                      onPointerUp={alSoltar}
                      onPointerCancel={alSoltar}
                      onClickCapture={(e) => {
                        if (Date.now() - arrastroReciente.current < 350) {
                          e.preventDefault()
                          e.stopPropagation()
                        }
                      }}
                      className={`${esta ? 'z-50 cursor-grabbing' : 'cursor-grab'} ${
                        recienMovida === t.id ? 'anillo-acento' : ''
                      }`}
                      style={
                        esta
                          ? {
                              transform: `translate(${arrastre!.dx}px, ${arrastre!.dy}px) rotate(1.5deg)`,
                              touchAction: 'none',
                            }
                          : undefined
                      }
                    />
                  )
                })}

                {enColumna.length === 0 && (
                  <p className="rounded-lg border border-dashed border-borde px-3 py-6 text-center text-meta text-tinta-3">
                    {destinoActivo ? 'Suelte aquí' : 'Sin órdenes'}
                  </p>
                )}
              </div>
            </section>
          )
        })}
      </main>

      {modal && modalAbierto && (
        <ModalPresupuesto
          datos={modal}
          estado={estadoModal}
          respondidoPor={respuesta.por}
          respondidoEn={respuesta.en}
          onCerrar={cerrarModal}
        />
      )}

      {fallo && (
        <p
          role="alert"
          className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-alta bg-elevada px-4 py-3 text-cuerpo text-tinta shadow-lg"
        >
          {fallo}
        </p>
      )}
    </>
  )
}
