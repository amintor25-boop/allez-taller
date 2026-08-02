'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const SECCIONES = [
  { ruta: '', etiqueta: 'Tablero' },
  { ruta: '/recepcion', etiqueta: 'Recepción', recorrido: 'recepcion' },
  { ruta: '/facturacion', etiqueta: 'Facturación', recorrido: 'facturacion' },
  { ruta: '/inventario', etiqueta: 'Inventario' },
  { ruta: '/agenda', etiqueta: 'Agenda' },
  { ruta: '/reportes', etiqueta: 'Reportes' },
  { ruta: '/configuracion', etiqueta: 'Configuración' },
]

export function NavTaller({ slug }: { slug: string }) {
  const aqui = usePathname()

  return (
    <nav className="flex gap-1 overflow-x-auto px-2 sm:px-4" aria-label="Secciones">
      {SECCIONES.map((s) => {
        const destino = `/d/${slug}${s.ruta}`
        const activa = s.ruta === '' ? aqui === destino : aqui.startsWith(destino)
        return (
          <Link
            key={s.ruta}
            href={destino}
            aria-current={activa ? 'page' : undefined}
            data-recorrido={'recorrido' in s ? (s as { recorrido: string }).recorrido : undefined}
            className={`flex h-11 shrink-0 items-center border-b-2 px-3 text-cuerpo transition-colors ${
              activa
                ? 'border-accion font-semibold text-tinta'
                : 'border-transparent text-tinta-2 hover:text-tinta'
            }`}
          >
            {s.etiqueta}
          </Link>
        )
      })}
    </nav>
  )
}
