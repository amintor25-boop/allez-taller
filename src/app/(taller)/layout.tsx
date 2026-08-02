import type { Metadata, Viewport } from 'next'
import { variablesFuente } from '@/lib/fuentes'
import '../globals.css'

// EL TALLER. Layout raíz propio, oscuro y denso. Pasar de aquí a la página del
// cliente es un cambio de documento completo — que es exactamente lo que pasa en
// la reunión cuando el prospecto saca su celular.

export const metadata: Metadata = {
  title: 'ALLEZ Taller',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B1226',
}

export default function LayoutTaller({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-EC" data-mundo="taller" className={variablesFuente}>
      <body className="min-h-dvh bg-fondo font-cuerpo text-tinta">{children}</body>
    </html>
  )
}
