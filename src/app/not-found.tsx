import Link from 'next/link'
import { headers } from 'next/headers'
import { variablesFuente } from '@/lib/fuentes'
import { SLUG_PRINCIPAL } from '@/lib/demos'
import './globals.css'

// Página no encontrada.
//
// Trae su propio <html> porque los dos mundos —taller y cliente— tienen cada
// uno su layout raíz dentro de un grupo de rutas, y esta página no vive en
// ninguno de los dos. Usa la paleta del taller, que es donde puede aparecer.
//
// Casi nunca debería verse: un enlace /d/lo-que-sea que no exista se crea
// sembrado en vez de morir en un 404. Queda para las direcciones mal escritas
// a mano, y sale en español, con la misma cara que el resto y con una salida.

export default async function NoEncontrada() {
  // Se sale al taller EN EL QUE ESTABA el visitante, no al de bolsillo: un
  // prospecto que trastea su propio enlace y se topa con un 404 no puede acabar
  // dentro del demo de otro.
  const ruta = (await headers()).get('x-invoke-path') ?? (await headers()).get('x-matched-path') ?? ''
  const suyo = ruta.match(/\/d\/([^/?#]+)/)?.[1]
  const slug = suyo || SLUG_PRINCIPAL

  return (
    <html lang="es-EC" data-mundo="taller" className={variablesFuente}>
      <body className="min-h-dvh bg-fondo font-cuerpo text-tinta">
        <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-6 py-10">
          <p className="cifras text-etiqueta font-semibold uppercase tracking-wider text-tinta-3">
            Error 404
          </p>
          <h1 className="mt-3 font-titulo text-pantalla text-tinta">Esta página no existe</h1>
          <p className="mt-3 text-cuerpo text-tinta-2">
            La dirección está mal escrita o apunta a algo que ya no está. No se perdió nada: el
            taller sigue donde estaba.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={`/d/${slug}`}
              className="presionable flex h-12 items-center rounded-xl bg-accion px-5 text-cuerpo font-semibold text-white hover:bg-accion-hover"
            >
              Ir al tablero
            </Link>
            <Link
              href={`/d/${slug}/recepcion`}
              className="presionable flex h-12 items-center rounded-xl border border-borde px-5 text-cuerpo font-semibold text-tinta-2 hover:border-borde-fuerte hover:text-tinta"
            >
              Buscar una placa
            </Link>
          </div>
        </main>
      </body>
    </html>
  )
}
