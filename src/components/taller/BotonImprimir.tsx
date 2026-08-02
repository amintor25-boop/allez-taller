'use client'

// Guardar como PDF sin librerías: el propio navegador lo hace mejor que
// cualquier paquete, sale con texto seleccionable y pesa cero en el paquete.

export function BotonImprimir({ etiqueta = 'Imprimir o guardar PDF' }: { etiqueta?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="presionable flex h-11 items-center gap-2 rounded-lg bg-accion px-4 text-cuerpo font-semibold text-white hover:bg-accion-hover print:hidden"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
        <path
          d="M4.5 6V2.5h7V6M4.5 12H3.5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1M4.5 10h7v3.5h-7z"
          stroke="currentColor"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {etiqueta}
    </button>
  )
}
