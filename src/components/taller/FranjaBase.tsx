import { baseEnUso } from '@/lib/db'

// Contra qué base está corriendo esto.
//
// Solo aparece cuando algo no es lo normal: en Netlify no se pinta, porque ahí
// lo remoto es lo correcto. En la laptop, con la base local, tampoco molesta
// —una línea discreta abajo del todo—. Y si alguien logra levantar el servidor
// local contra Turso, la franja se pone en ámbar y lo dice con todas las letras.
//
// No es decoración: confundir las dos bases costó una tarde de depuración, y
// costaría una reunión si un `npm run dev` moviera las tarjetas del prospecto.

export function FranjaBase() {
  const base = baseEnUso()
  if (base.enNetlify) return null

  return (
    <p
      className={`px-4 py-1 text-center text-etiqueta ${
        base.remota
          ? 'bg-[#F59E0B] font-semibold uppercase tracking-wider text-[#111C38]'
          : 'text-tinta-3'
      }`}
    >
      {base.remota
        ? `▲ Escribiendo en PRODUCCIÓN · ${base.etiqueta}`
        : `Base de desarrollo · ${base.etiqueta}`}
    </p>
  )
}
