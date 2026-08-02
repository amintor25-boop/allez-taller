'use client'

import { useEffect, useRef, useState } from 'react'

// Copiar el enlace al portapapeles.
//
// El enlace SIEMPRE está escrito en pantalla y se puede seleccionar a mano: este
// botón es una comodidad, no el único camino. Si el navegador no da permiso de
// portapapeles —pasa en http sin certificado— se selecciona el texto y se dice
// qué hacer, en vez de fallar en silencio.

export function CopiarEnlace({ url }: { url: string }) {
  const [estado, setEstado] = useState<'quieto' | 'copiado' | 'a-mano'>('quieto')
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null)

  // El temporizador se limpia al desmontar: si no, vuelve a llamar al setter
  // sobre un componente que ya no está.
  useEffect(() => () => { if (reloj.current) clearTimeout(reloj.current) }, [])

  function avisar(nuevo: 'copiado' | 'a-mano') {
    setEstado(nuevo)
    if (reloj.current) clearTimeout(reloj.current)
    reloj.current = setTimeout(() => setEstado('quieto'), 2200)
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url)
      avisar('copiado')
    } catch {
      avisar('a-mano')
    }
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={copiar}
        className="presionable h-11 shrink-0 rounded-lg border border-borde px-3.5 text-meta font-semibold text-tinta-2 hover:border-borde-fuerte hover:text-tinta"
      >
        Copiar
      </button>
      <span role="status" aria-live="polite" className="text-meta text-tinta-3">
        {estado === 'copiado' && 'Copiado'}
        {estado === 'a-mano' && 'Cópielo a mano'}
      </span>
    </span>
  )
}
