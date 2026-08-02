import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Placa } from '@/components/Placa'
import { DiscoPintura } from '@/components/taller/DiscoPintura'
import { dinero, ESTADOS, ESTADO_INFO, PRIORIDAD_INFO, type Estado } from '@/lib/dominio'
import type { Tarjeta } from '@/lib/consultas-taller'

// La tarjeta del tablero. La placa manda: es lo que cualquier mecánico reconoce
// antes que ningún texto, así que va arriba a la izquierda y dibujada de verdad.
//
// ABRIR LA ORDEN ES UN ENLACE DE VERDAD, no un onClick.
// Antes era `router.push` dentro de un manejador: si el JavaScript no llegaba a
// correr —una pieza que no cargó, la red que tosió, el teléfono todavía
// hidratando— la tarjeta quedaba muerta y en silencio. Con <a href> abre
// siempre, incluso sin JavaScript. Lo mismo que ya se hizo con los botones de
// la página del cliente.

export function TarjetaOrden({
  t,
  arrastrando,
  onMover,
  href,
  menuAbierto,
  onMenu,
  ...resto
}: {
  t: Tarjeta
  arrastrando?: boolean
  onMover: (estado: Estado) => void
  href: string
  menuAbierto: boolean
  onMenu: (abierto: boolean) => void
} & React.ComponentPropsWithRef<'article'>) {
  return (
    <article
      {...resto}
      className={`relative select-none rounded-[10px] border bg-superficie transition-colors ${
        arrastrando
          ? 'border-acento shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7)]'
          : 'border-borde hover:border-borde-fuerte'
      } ${resto.className ?? ''}`}
    >
      <span
        className="absolute inset-y-0 left-0 w-[3px] rounded-l-[9px]"
        style={{ background: PRIORIDAD_INFO[t.prioridad].color }}
        aria-hidden
      />

      <div className="py-3 pl-4 pr-2.5">
        <div className="flex items-start gap-2">
          <Link
            href={href}
            draggable={false}
            aria-label={`Abrir la orden 0${t.numero} del ${t.placa}`}
            className="-m-1 flex min-h-11 min-w-0 flex-1 items-start gap-2 rounded p-1 text-left"
          >
            <Placa placa={t.placa} tamano="sm" />
            {t.prioridad === 'alta' && (
              <span className="mt-0.5 shrink-0 text-micro font-semibold uppercase text-alta-texto">
                Alta
              </span>
            )}
          </Link>

          <MenuMover
            estadoActual={t.estado}
            abierto={menuAbierto}
            onAbrir={onMenu}
            onElegir={onMover}
          />
        </div>

        <Link href={href} draggable={false} className="mt-2.5 block w-full text-left">
          {/* El disco de pintura va aquí, dentro de la línea del vehículo: es el
              atajo para encontrar "el plateado" entre doce tarjetas sin leer. */}
          <p className="flex items-center truncate text-meta text-tinta-2">
            <DiscoPintura color={t.color} />
            <span className="truncate">{t.vehiculo}</span>
          </p>

          <p className="mt-2 text-cuerpo font-semibold leading-[19px] text-tinta">
            <span className="cifras text-tinta-3">#0{t.numero}</span> {t.servicio}
          </p>
          <p className="mt-0.5 truncate text-meta text-tinta-3">{t.cliente}</p>

          {(t.esperandoCliente || t.noAutorizado || t.facturada) && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {t.esperandoCliente && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[#F59E0B1F] px-2 py-1 text-micro font-semibold uppercase text-media">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-media" aria-hidden />
                  Esperando cliente
                </span>
              )}
              {t.noAutorizado && (
                <span className="rounded-md bg-[#94A3B81F] px-2 py-1 text-micro font-semibold uppercase text-baja">
                  No autorizado
                </span>
              )}
              {/* El NÚMERO, no la palabra. "Facturada" no se puede dictar por
                  teléfono; 001-001-000000123 sí, y es lo que pide el contador
                  cuando llama. El verde sigue significando lo mismo. */}
              {t.facturada && (
                <span className="cifras rounded-md bg-[#22C55E1F] px-2 py-1 text-micro font-semibold text-aprobado">
                  {t.numeroFactura ?? 'FACTURADA'}
                </span>
              )}
            </div>
          )}

          <div className="mt-3 flex items-center gap-1.5 border-t border-borde pt-2.5">
            {t.siglas ? (
              <>
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-elevada text-[10px] font-semibold text-tinta-2"
                  title={t.mecanico ?? ''}
                >
                  {t.siglas}
                </span>
                <span className="min-w-0 truncate text-meta text-tinta-3">
                  {t.mecanico?.split(' ')[0]}
                </span>
              </>
            ) : (
              <span className="truncate text-meta italic text-tinta-3">Sin asignar</span>
            )}
            <span className="cifras ml-auto shrink-0 pl-1 text-meta text-tinta-3">{t.antiguedad}</span>
            <span className="cifras shrink-0 font-titulo text-total text-tinta">
              {dinero(t.total)}
            </span>
          </div>
        </Link>
      </div>
    </article>
  )
}

/**
 * "Mover a" — obligatorio, no un extra.
 * El arrastre con el dedo no siempre sale a la primera, y en modo revisión no hay
 * nadie explicando. Con esto ninguna tarjeta se queda atascada.
 */
function MenuMover({
  estadoActual,
  abierto,
  onAbrir,
  onElegir,
}: {
  estadoActual: Estado
  abierto: boolean
  onAbrir: (v: boolean) => void
  onElegir: (e: Estado) => void
}) {
  const boton = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null)

  const opciones = ESTADOS.filter((e) => e !== estadoActual)
  const ANCHO = 208

  // El menú se dibuja en <body>, no dentro de la tarjeta: la tarjeta tiene
  // esquinas redondeadas y el tablero se desplaza en horizontal, así que
  // cualquiera de los dos lo recortaría. Y si la tarjeta está abajo del todo,
  // el menú se abre hacia arriba en vez de irse fuera de la pantalla.
  useLayoutEffect(() => {
    if (!abierto || !boton.current) {
      setPos(null)
      return
    }
    const r = boton.current.getBoundingClientRect()
    const alto = opciones.length * 38 + 36
    const izq = Math.max(8, Math.min(r.right - ANCHO, window.innerWidth - ANCHO - 8))
    setPos(
      window.innerHeight - r.bottom < alto + 16
        ? { left: izq, bottom: window.innerHeight - r.top + 6 }
        : { left: izq, top: r.bottom + 6 },
    )
  }, [abierto, opciones.length])

  // Al desplazar, la posición medida deja de valer: se cierra.
  useLayoutEffect(() => {
    if (!abierto) return
    const cerrar = () => onAbrir(false)
    window.addEventListener('scroll', cerrar, true)
    window.addEventListener('resize', cerrar)
    return () => {
      window.removeEventListener('scroll', cerrar, true)
      window.removeEventListener('resize', cerrar)
    }
  }, [abierto, onAbrir])

  return (
    <div className="relative shrink-0" data-no-arrastrar>
      <button
        ref={boton}
        type="button"
        onClick={() => onAbrir(!abierto)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label="Mover esta orden a otra columna"
        className="-my-2 -mr-1.5 flex h-11 w-11 items-center justify-center rounded-lg text-tinta-3 hover:bg-elevada hover:text-tinta"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
          <circle cx="3" cy="8" r="1.4" fill="currentColor" />
          <circle cx="8" cy="8" r="1.4" fill="currentColor" />
          <circle cx="13" cy="8" r="1.4" fill="currentColor" />
        </svg>
      </button>

      {abierto &&
        pos &&
        createPortal(
          <div
            role="menu"
            style={{ position: 'fixed', width: ANCHO, ...pos }}
            className="z-50 overflow-hidden rounded-lg border border-borde-fuerte bg-elevada py-1 shadow-[0_20px_45px_-15px_rgba(0,0,0,0.85)]"
          >
            <p className="px-3 py-1.5 text-micro uppercase text-tinta-3">Mover a</p>
            {opciones.map((e) => (
              <button
                key={e}
                role="menuitem"
                type="button"
                onClick={() => {
                  onElegir(e)
                  onAbrir(false)
                }}
                className="flex min-h-11 w-full items-center px-3 py-2 text-left text-cuerpo text-tinta-2 hover:bg-superficie hover:text-tinta"
              >
                {ESTADO_INFO[e].largo}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}
