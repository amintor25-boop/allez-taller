import type { Config } from 'tailwindcss'

// Dos paletas deliberadamente opuestas. El contraste entre la pantalla del taller
// y la del dueño del carro es parte del argumento de venta, así que los colores
// de un mundo no se usan nunca en el otro.

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── EL TALLER (oscuro, denso, herramienta de trabajo) ──
        fondo: '#0B1226',
        columna: '#0E1730',
        superficie: '#111C38',
        elevada: '#162243',
        borde: '#24314F',
        'borde-fuerte': '#33436B',
        // Pista de un elemento gráfico que hay que poder CONTAR, no solo
        // intuir. `borde-fuerte` da 1,73:1 sobre la superficie y a cuatro
        // píxeles de alto desaparece: se leería "tres barras" en vez de "tres
        // de cinco". Este llega a 3,18:1, el mínimo de un elemento no textual.
        pista: '#5A6B95',
        tinta: '#F2F5FC',
        'tinta-2': '#A8B6D4',
        'tinta-3': '#8494B8',
        accion: '#2563EB',
        'accion-hover': '#1D4ED8',
        // El azul de acción sobre superficie oscura da 3,26:1: sirve de fondo de
        // botón con texto blanco encima, no de color de texto. Este llega a 6,62:1.
        'accion-texto': '#60A5FA',
        acento: '#00E5FF',
        alta: '#EF4444',
        'alta-texto': '#F98080',  // el rojo puro no llega a 4.5:1 en etiquetas de 10 px
        media: '#F59E0B',
        baja: '#94A3B8',
        aprobado: '#22C55E',

        // ── EL CLIENTE (claro, amplio, cálido) ──
        'cli-fondo': '#FBFAF7',
        'cli-tarjeta': '#FFFFFF',
        'cli-borde': '#ECE6DC',
        'cli-tinta': '#14181F',
        'cli-tinta-2': '#5C6472',
        // Blanco sobre #16A34A daba 3,30:1 y el botón lleva texto de 20 px con
        // peso 600, que no cuenta como texto grande. #15803D da 5,02:1 y a
        // simple vista es el mismo verde.
        'cli-si': '#15803D',
        'cli-si-hover': '#14682F',
        'cli-no-borde': '#D4CEC3',
        'cli-aviso': '#FEF6E7',

        // ── La placa ──
        'placa-cuerpo': '#F3F4F1',
        'placa-franja': '#0A2C7C',
        'placa-tinta': '#10131A',
      },
      fontFamily: {
        titulo: ['var(--fuente-titulo)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        cuerpo: ['var(--fuente-cuerpo)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Escala del taller
        micro: ['0.625rem', { lineHeight: '0.75rem', letterSpacing: '0.14em' }],
        etiqueta: ['0.6875rem', { lineHeight: '0.875rem', letterSpacing: '0.10em' }],
        meta: ['0.8125rem', { lineHeight: '1.125rem' }],
        cuerpo: ['0.875rem', { lineHeight: '1.3125rem' }],
        total: ['1.375rem', { lineHeight: '1.5rem', letterSpacing: '-0.01em' }],
        seccion: ['1.25rem', { lineHeight: '1.625rem', letterSpacing: '-0.01em' }],
        pantalla: ['1.75rem', { lineHeight: '2rem', letterSpacing: '-0.015em' }],
        cifra: ['2.5rem', { lineHeight: '2.625rem', letterSpacing: '-0.02em' }],
        // Escala del cliente
        'cli-etiqueta': ['0.8125rem', { lineHeight: '1rem', letterSpacing: '0.08em' }],
        'cli-cuerpo': ['1.125rem', { lineHeight: '1.8125rem' }],
        'cli-boton': ['1.25rem', { lineHeight: '1.5rem' }],
        'cli-titulo': ['1.875rem', { lineHeight: '2.375rem', letterSpacing: '-0.01em' }],
        'cli-precio': ['3.5rem', { lineHeight: '3.5rem', letterSpacing: '-0.03em' }],
      },
      transitionTimingFunction: {
        fuerte: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
    },
  },
  plugins: [],
}

export default config
