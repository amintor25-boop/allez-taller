'use client'

import { hora } from '@/lib/dominio'

/** El mensaje tal cual se verá en el teléfono del cliente. */
export function VistaMensaje({
  cliente,
  telefono,
  mensaje,
  url,
  enviadoEn,
}: {
  cliente: string
  telefono: string
  mensaje: string
  url: string
  // La hora del envío viene del servidor. Calcularla aquí daría una hora distinta
  // a la del servidor y React se quejaría de hidratación.
  enviadoEn: string
}) {
  const lineas = mensaje.split('\n')

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-borde">
      <div className="flex items-center gap-2 bg-[#F4F1EA] px-3 py-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C9C2B6] text-[11px] font-semibold text-[#3B3730]">
          {cliente
            .split(' ')
            .slice(0, 2)
            .map((p) => p[0])
            .join('')}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[12px] font-semibold text-[#111B21]">{cliente}</span>
          <span className="block truncate text-[10px] text-[#4A5560]">{telefono}</span>
        </span>
      </div>

      <div className="bg-[#ECE5DD] px-3 py-4">
        <div className="ml-auto max-w-[92%] rounded-lg rounded-tr-sm bg-[#DCF8C6] px-3 py-2 shadow-sm">
          <p className="whitespace-pre-wrap break-words text-[12.5px] leading-[18px] text-[#111B21]">
            {lineas.map((l, i) =>
              l === url ? (
                // Un enlace de verdad, no un span pintado de azul.
                //
                // Era lo único con pinta de tocable de todo el modal y no hacía
                // nada. Y no había NI UN <a href="/o/…"> en toda la aplicación:
                // un prospecto que abre su enlace solo, desde un portátil, no
                // tenía forma de llegar de un clic a la pantalla del cliente,
                // que es el centro de la venta.
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener"
                  className="text-[#0A5FA3] underline underline-offset-2 hover:text-[#084b82]"
                >
                  {l}
                  {'\n'}
                </a>
              ) : (
                <span key={i}>
                  {l}
                  {i < lineas.length - 1 ? '\n' : ''}
                </span>
              ),
            )}
          </p>
          <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-[#4A5560]">
            {hora(enviadoEn)}
            <svg width="14" height="10" viewBox="0 0 16 11" aria-hidden>
              <path
                d="M1 5.5 4 8.5 9.5 2M6.5 5.5 9.5 8.5 15 2"
                stroke="#53BDEB"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </p>
        </div>
      </div>
    </div>
  )
}
