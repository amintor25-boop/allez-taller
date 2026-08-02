'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

// Recorrido guiado de la primera apertura.
//
// Cuatro pasos, cada uno señalando algo que está de verdad en pantalla. No es
// un carrusel de promesas: es "mire esto, y ahora esto".
//
// Se apoya en atributos `data-recorrido` puestos en la barra de secciones y en
// el tablero. Si un anclaje no aparece —una columna vacía, una pantalla
// estrecha donde la barra se desplazó— el paso se centra y sigue funcionando.
// Nunca deja al prospecto mirando un agujero en un sitio equivocado.
//
// Sin JavaScript no aparece, y eso está bien: el demo funciona igual. Un
// recorrido es una cortesía, no un requisito.

type Paso = {
  ancla: string | null
  titulo: string
  texto: string
}

const PASOS: Paso[] = [
  {
    ancla: 'tarjeta',
    titulo: 'Cada tarjeta es un carro',
    texto:
      'Lo que está adentro del taller ahora mismo. Arrástrela entre columnas o use el menú de la propia tarjeta para moverla.',
  },
  {
    ancla: 'recepcion',
    titulo: 'Se busca por placa',
    texto:
      'Escriba una placa y aparecen el dueño, el vehículo y todo lo que se le ha hecho antes. Si es un carro nuevo, se registra ahí mismo.',
  },
  {
    ancla: 'aprobacion',
    titulo: 'Aquí espera el cliente',
    texto:
      'Cuando usted manda un presupuesto por WhatsApp, la tarjeta se queda en esta columna. En cuanto el cliente aprueba desde su celular, se mueve sola a En reparación.',
  },
  {
    ancla: 'facturacion',
    titulo: 'Y lo demás del taller',
    texto:
      'Facturación con el cierre del mes, inventario, agenda y reportes. Con doce meses de movimiento, para que vea cómo se ve lleno.',
  },
]

/** Aire alrededor de lo señalado. */
const HOLGURA = 8

type Marco = { top: number; left: number; width: number; height: number } | null

export function Recorrido({ slug }: { slug: string }) {
  const [paso, setPaso] = useState(0)
  const [fuera, setFuera] = useState(false)
  const [marco, setMarco] = useState<Marco>(null)
  const [sitio, setSitio] = useState<{ top: number; left: number } | null>(null)
  const botonRef = useRef<HTMLButtonElement>(null)
  const tarjetaRef = useRef<HTMLElement>(null)
  const actual = PASOS[paso]

  // Se anota una sola vez, aunque el prospecto cierre el recorrido dos veces
  // seguidas: `sendBeacon` no espera respuesta y el guard evita el doble envío.
  const anotado = useRef(false)
  const terminar = useCallback(() => {
    if (!anotado.current) {
      anotado.current = true
      const url = `/api/d/${slug}/recorrido`
      if (navigator.sendBeacon) navigator.sendBeacon(url)
      else fetch(url, { method: 'POST', keepalive: true }).catch(() => {})
    }
    setFuera(true)
  }, [slug])

  // Medir el anclaje del paso. Se recalcula al cambiar de paso y cuando la
  // ventana se mueve: la barra de secciones se desplaza en horizontal y el
  // agujero se quedaría atrás.
  useEffect(() => {
    if (fuera) return

    let vivo = true

    function medir() {
      if (!vivo) return
      const el = actual.ancla
        ? document.querySelector<HTMLElement>(`[data-recorrido="${actual.ancla}"]`)
        : null
      if (!el) return setMarco(null)

      const r = el.getBoundingClientRect()
      // Fuera de la pantalla no se señala: se centra el paso y se explica igual.
      if (r.width === 0 || r.bottom < 0 || r.top > window.innerHeight) return setMarco(null)

      setMarco({
        top: r.top - HOLGURA,
        left: r.left - HOLGURA,
        width: r.width + HOLGURA * 2,
        height: r.height + HOLGURA * 2,
      })
    }

    // Traer el anclaje a la vista antes de medirlo, por si la barra está
    // desplazada en un teléfono.
    const el = actual.ancla
      ? document.querySelector<HTMLElement>(`[data-recorrido="${actual.ancla}"]`)
      : null
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' })

    medir()
    const t = setTimeout(medir, 260) // por si el desplazamiento fue suave
    window.addEventListener('resize', medir)
    window.addEventListener('scroll', medir, true)

    return () => {
      vivo = false
      clearTimeout(t)
      window.removeEventListener('resize', medir)
      window.removeEventListener('scroll', medir, true)
    }
  }, [paso, fuera, actual.ancla])

  // ── Dónde poner la tarjeta ─────────────────────────────────────────────────
  //
  // Se prueban cuatro sitios alrededor de lo señalado y gana el primero que
  // quepa entero. Hace falta probarlos todos: la columna "Espera aprobación"
  // mide seiscientos y pico de alto y no cabe ni encima ni debajo — con la
  // primera versión la tarjeta se salía por arriba de la pantalla y el paso 3,
  // que es el que explica la venta, no se leía.
  //
  // Se mide la tarjeta ya renderizada en vez de suponerle una altura: el texto
  // de cada paso es distinto y en un teléfono ocupa el doble de líneas.
  useLayoutEffect(() => {
    if (fuera) return

    const t = tarjetaRef.current?.getBoundingClientRect()
    if (!t) return

    const AIRE = 12
    const BORDE = 12
    const W = window.innerWidth
    const H = window.innerHeight
    const centrado = (v: number, largo: number, tope: number) =>
      Math.min(Math.max(BORDE, v), Math.max(BORDE, tope - largo - BORDE))

    // El centro se calcula en píxeles, nunca con `left: 50%` y un transform.
    //
    // La clase `entra` anima con `fill-mode: both` y termina en
    // `transform: none`: una animación gana al estilo en línea en la cascada, así
    // que el translate(-50%,-50%) desaparecía en cuanto la animación acababa y la
    // tarjeta se quedaba con su borde izquierdo en la mitad de la pantalla. En un
    // teléfono, el paso 3 se salía por la derecha con el botón cortado.
    const enElCentro = {
      top: Math.max(BORDE, (H - t.height) / 2),
      left: Math.max(BORDE, (W - t.width) / 2),
    }

    if (!marco) return setSitio(enElCentro)

    const candidatos = [
      { top: marco.top + marco.height + AIRE, left: centrado(marco.left + marco.width / 2 - t.width / 2, t.width, W) },
      { top: marco.top - AIRE - t.height, left: centrado(marco.left + marco.width / 2 - t.width / 2, t.width, W) },
      { top: centrado(marco.top, t.height, H), left: marco.left + marco.width + AIRE },
      { top: centrado(marco.top, t.height, H), left: marco.left - AIRE - t.width },
    ]

    const cabe = (c: { top: number; left: number }) =>
      c.top >= BORDE && c.left >= BORDE && c.top + t.height <= H - BORDE && c.left + t.width <= W - BORDE

    // Si ninguno cabe —un teléfono, con la columna más alta que la pantalla— se
    // centra: mejor tapar un poco que dejar media tarjeta fuera.
    setSitio(candidatos.find(cabe) ?? enElCentro)
  }, [marco, fuera, paso])

  // El foco viaja con el paso: quien navegue con teclado no se queda atrás.
  useEffect(() => {
    if (!fuera) botonRef.current?.focus()
  }, [paso, fuera])

  useEffect(() => {
    if (fuera) return
    function tecla(e: KeyboardEvent) {
      if (e.key === 'Escape') terminar()
      // Se usa la forma de función: dos pulsaciones rápidas leerían el mismo
      // paso y el recorrido se quedaría trabado en el mismo sitio.
      if (e.key === 'ArrowRight') setPaso((p) => Math.min(PASOS.length - 1, p + 1))
      if (e.key === 'ArrowLeft') setPaso((p) => Math.max(0, p - 1))
    }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [fuera, terminar])

  if (fuera) return null

  const ultimo = paso === PASOS.length - 1
  // Hasta que se sabe dónde va, la tarjeta ocupa su sitio pero no se ve: el
  // efecto de colocación corre antes de pintar, así que no hay parpadeo.
  const estiloTarjeta: React.CSSProperties = sitio
    ? { top: sitio.top, left: sitio.left }
    : { top: 0, left: 0, visibility: 'hidden' }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Recorrido">
      {/* El velo y el agujero son la misma pieza: una sombra enorme alrededor
          del recuadro señalado. Sin anclaje, un velo liso. */}
      {marco ? (
        <div
          className="recorrido-hueco pointer-events-none absolute rounded-xl"
          style={{ ...marco, position: 'absolute' }}
          aria-hidden
        />
      ) : (
        <div className="absolute inset-0 bg-[#040814C7]" onClick={terminar} aria-hidden />
      )}

      {/* Tocar fuera de la tarjeta cierra: es lo que espera cualquiera. */}
      <button
        type="button"
        onClick={terminar}
        tabIndex={-1}
        aria-label="Cerrar el recorrido"
        className="absolute inset-0 cursor-default"
      />

      <section
        ref={tarjetaRef}
        className="entra absolute w-[min(360px,calc(100vw-24px))] rounded-xl border border-borde-fuerte bg-superficie p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)]"
        style={estiloTarjeta}
      >
        <p className="cifras text-etiqueta font-semibold uppercase tracking-wider text-acento">
          Paso {paso + 1} de {PASOS.length}
        </p>
        <h2 className="mt-2 font-titulo text-seccion text-tinta">{actual.titulo}</h2>
        <p className="mt-2 text-cuerpo text-tinta-2">{actual.texto}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden>
            {PASOS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === paso ? 'w-5 bg-acento' : 'w-1.5 bg-borde-fuerte'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1">
            {!ultimo && (
              <button
                type="button"
                onClick={terminar}
                className="h-11 rounded-lg px-3 text-cuerpo text-tinta-3 hover:text-tinta"
              >
                Saltar
              </button>
            )}
            <button
              ref={botonRef}
              type="button"
              onClick={() => (ultimo ? terminar() : setPaso((p) => Math.min(PASOS.length - 1, p + 1)))}
              className="presionable h-11 rounded-lg bg-accion px-4 text-cuerpo font-semibold text-white hover:bg-accion-hover"
            >
              {ultimo ? 'Entendido' : 'Siguiente'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
