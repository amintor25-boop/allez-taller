// "Esto no está aquí", dentro del taller.
//
// Se devuelve DESDE LA PÁGINA en vez de llamar a notFound(). Next manda las
// fronteras de not-found por streaming: el contenido viaja en el flujo de RSC y
// el HTML llega con el cuerpo vacío, así que sin JavaScript el visitante ve una
// pantalla negra sin una palabra ni una salida. Devolviéndola como cualquier
// otra vista, llega renderizada. Es lo que ya hacía bien la página del cliente.
//
// La barra de secciones queda encima, y esa es la salida: el visitante sigue
// dentro de SU taller.

export function NoExiste({ que }: { que: string }) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-14 sm:px-6">
      <p className="cifras text-etiqueta font-semibold uppercase tracking-wider text-tinta-3">
        No encontrado
      </p>
      <h1 className="mt-3 font-titulo text-pantalla text-tinta">Esto no está aquí</h1>
      <p className="mt-3 text-cuerpo text-tinta-2">
        {que} no existe en este taller. Puede que la dirección esté mal escrita, o que el demo se
        haya reiniciado desde entonces.
      </p>
      <p className="mt-6 text-meta text-tinta-3">
        Use la barra de arriba para volver al tablero o a cualquier otra sección.
      </p>
    </main>
  )
}
