import Link from 'next/link'
import { NavTaller } from './NavTaller'

// Barra superior del taller. Densa a propósito: es una herramienta de trabajo,
// no una página de marketing. La identidad de ALLEZ va discreta a la izquierda y
// el nombre del taller manda visualmente — es el taller del prospecto, no el mío.

export function Cabecera({
  slug,
  taller,
  ciudad,
  enTaller,
}: {
  slug: string
  taller: string
  ciudad: string
  enTaller: number
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-borde bg-superficie print:hidden">
      <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
        <Link
          href={`/d/${slug}`}
          className="-my-2 -ml-1 flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-lg px-1 py-2 sm:justify-start"
          aria-label={`${taller}, ir al tablero`}
        >
          <Marca />
          <span className="hidden font-titulo text-[15px] tracking-[-0.02em] text-tinta sm:block">
            ALLEZ
          </span>
        </Link>

        <span className="hidden h-6 w-px bg-borde sm:block" aria-hidden />

        <div className="min-w-0 flex-1">
          <p className="truncate font-titulo text-[15px] leading-[18px] text-tinta">{taller}</p>
          <p className="text-micro uppercase text-tinta-3">{ciudad}</p>
        </div>

        <span className="hidden items-center gap-2 rounded-full border border-borde px-3 py-1.5 md:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-acento" aria-hidden />
          <span className="cifras text-meta text-tinta-2">
            <b className="font-semibold text-tinta">{enTaller}</b> en taller
          </span>
        </span>

        <Link
          href={`/d/${slug}/recepcion`}
          className="presionable flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-accion px-3 text-etiqueta font-semibold uppercase text-white hover:bg-accion-hover sm:px-4"
        >
          <span aria-hidden>+</span>
          Recepción
        </Link>
      </div>

      <NavTaller slug={slug} />
    </header>
  )
}

function Marca() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden className="shrink-0">
      <rect width="22" height="22" rx="6" fill="#2563EB" />
      <path d="M7 15.5 11 6l4 9.5" stroke="#00E5FF" strokeWidth="1.8" fill="none" strokeLinejoin="round" />
      <path d="M8.7 12.6h4.6" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
