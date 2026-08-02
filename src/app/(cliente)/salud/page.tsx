import { headers } from 'next/headers'

// Página de prueba de conexión. Se abre desde el celular para saber, en dos
// segundos y sin interpretar nada, si el teléfono alcanza la laptop.
// Vive en el mundo claro porque se mira en un celular, con sol encima.

export const dynamic = 'force-dynamic'

export default async function Salud() {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '—'

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col justify-center px-6 text-center">
      <svg width="96" height="96" viewBox="0 0 88 88" className="mx-auto" role="img" aria-label="Conectado">
        <circle cx="44" cy="44" r="42" fill="#EAF7EF" />
        <path
          d="M28 45.5 39 56l21-24"
          fill="none"
          stroke="#16A34A"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="traza-check"
          pathLength={48}
        />
      </svg>

      <h1 className="mt-7 font-titulo text-cli-titulo">Conectado</h1>
      <p className="mt-4 text-cli-cuerpo text-cli-tinta-2">
        Este teléfono sí alcanza la laptop. El QR va a funcionar.
      </p>

      <p className="cifras mt-8 break-all rounded-2xl border border-cli-borde bg-cli-tarjeta px-5 py-4 text-[15px] text-cli-tinta-2">
        {host}
      </p>

      <p className="mt-4 text-[14px] text-cli-tinta-2">
        Entra al tablero por esta misma dirección para que el QR salga con ella.
      </p>
    </main>
  )
}
