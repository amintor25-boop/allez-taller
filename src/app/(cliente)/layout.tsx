import type { Metadata, Viewport } from 'next'
import { variablesFuente } from '@/lib/fuentes'
import '../globals.css'

// EL CLIENTE. Layout raíz propio: esta rama del sitio se abre en el celular del
// dueño del carro y no comparte nada con las pantallas del taller.

export const metadata: Metadata = {
  title: 'Su vehículo en el taller',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FBFAF7',
}

export default function LayoutCliente({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-EC" data-mundo="cliente" className={variablesFuente}>
      <body className="min-h-dvh bg-cli-fondo font-cuerpo text-cli-tinta">{children}</body>
    </html>
  )
}
