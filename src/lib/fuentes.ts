import { Inter, Space_Grotesk } from 'next/font/google'

// Se auto-hospedan en el build: ninguna petición a Google en tiempo de ejecución,
// que además es lo que hace que carguen rápido con datos móviles lentos.

export const fuenteTitulo = Space_Grotesk({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--fuente-titulo',
  display: 'swap',
})

export const fuenteCuerpo = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--fuente-cuerpo',
  display: 'swap',
})

export const variablesFuente = `${fuenteTitulo.variable} ${fuenteCuerpo.variable}`
