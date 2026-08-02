// "Preparando el taller".
//
// Se ve una sola vez y solo cuando alguien teclea a mano un enlace que nadie
// había generado. La semilla —doce meses de facturación, 3.226 sentencias—
// corre POR DETRÁS: la petición no la espera, porque una función de Netlify se
// corta a los diez segundos y lo que vería el visitante sería un error.
//
// La recarga es una etiqueta <meta>, no JavaScript: así también funciona con el
// guion apagado, que es cuando más falta hace que la pantalla se resuelva sola.

export function Preparando({ taller }: { taller: string }) {
  return (
    <>
      <meta httpEquiv="refresh" content="3" />
      <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col justify-center px-6 py-10 text-center">
        <p className="cifras text-etiqueta font-semibold uppercase tracking-wider text-acento">
          Un momento
        </p>
        <h1 className="mt-3 font-titulo text-pantalla text-tinta">Preparando {taller}</h1>
        <p className="mt-3 text-cuerpo text-tinta-2">
          Estamos armando el taller con su último año de trabajo: órdenes, facturación,
          inventario y agenda. Tarda unos segundos y esta pantalla se actualiza sola.
        </p>

        <div className="mx-auto mt-7 h-1 w-40 overflow-hidden rounded-full bg-borde">
          <div className="barra-progreso h-full rounded-full bg-acento" />
        </div>

        <noscript>
          <p className="mt-6 text-meta text-tinta-3">
            Si no se actualiza sola, vuelva a cargar la página.
          </p>
        </noscript>
      </main>
    </>
  )
}
