'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

// Un solo campo que busca por placa, cliente o número de comprobante a la vez.
// Es lo primero que toca cualquiera que entra a esta pantalla, así que no hay
// botón de buscar ni selector de "buscar por": se escribe y aparece.

export function BuscadorFacturas({ inicial }: { inicial: string }) {
  const router = useRouter()
  const ruta = usePathname()
  const params = useSearchParams()

  const [texto, setTexto] = useState(inicial)
  const primeraVez = useRef(true)

  // Lo último que este componente mandó a la URL. Sirve para distinguir un
  // cambio de fuera del propio eco.
  const enviado = useRef(inicial)

  // El valor de la URL manda si cambia POR FUERA —al cambiar de mes, o al
  // volver atrás con el navegador—. Pero `inicial` también vuelve como eco de
  // la navegación que este mismo componente disparó un cuarto de segundo antes,
  // y esa página tarda cientos de milisegundos en volver porque consulta seis
  // centenares de comprobantes. Sin esta comparación, el eco pisa lo que se
  // siguió escribiendo: se teclea "PBX-12", vuelve "PBX" y el campo salta hacia
  // atrás comiéndose el resto delante del prospecto.
  useEffect(() => {
    if (inicial !== enviado.current) {
      enviado.current = inicial
      setTexto(inicial)
    }
  }, [inicial])

  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false
      return
    }
    if (texto === inicial) return

    const reloj = setTimeout(() => {
      const p = new URLSearchParams(params.toString())
      enviado.current = texto.trim()
      if (texto.trim()) p.set('q', texto.trim())
      else p.delete('q')
      p.delete('pagina') // una búsqueda nueva arranca en la primera página
      router.replace(`${ruta}?${p.toString()}`, { scroll: false })
    }, 250)

    return () => clearTimeout(reloj)
  }, [texto, inicial, params, ruta, router])

  return (
    <div className="relative min-w-0 flex-1 sm:max-w-sm">
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tinta-3"
      >
        <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
        <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>

      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        type="search"
        inputMode="search"
        autoComplete="off"
        placeholder="Placa, cliente o número de comprobante"
        aria-label="Buscar comprobantes"
        className="h-11 w-full rounded-xl border border-borde bg-superficie pl-10 pr-3 text-[15px] text-tinta placeholder:text-tinta-3"
      />
    </div>
  )
}
