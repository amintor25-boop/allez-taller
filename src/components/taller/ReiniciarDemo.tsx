'use client'

import { useState } from 'react'

// Reiniciar el demo. Discreto a propósito: es lo último de la pantalla de
// configuración, en gris, y pide confirmación antes de hacer nada. Un botón
// rojo y grande aquí sería un accidente esperando a que alguien lo toque en
// mitad de una reunión.
//
// El formulario es nativo: sin JavaScript el primer toque envía directamente,
// que es el comportamiento correcto cuando no hay forma de preguntar.

export function ReiniciarDemo({ slug }: { slug: string }) {
  const [seguro, setSeguro] = useState(false)
  const [yendo, setYendo] = useState(false)

  return (
    <form
      method="post"
      action={`/api/d/${slug}/reiniciar`}
      onSubmit={(e) => {
        if (!seguro) {
          e.preventDefault()
          setSeguro(true)
          return
        }
        setYendo(true)
      }}
      className="mt-8 rounded-xl border border-borde bg-superficie p-5"
    >
      <h2 className="font-titulo text-seccion text-tinta">Reiniciar la demostración</h2>
      <p className="mt-1.5 text-meta text-tinta-2">
        Todo el trabajo del taller vuelve a como estaba: órdenes, presupuestos y facturas. Los
        repuestos que usted haya agregado al inventario se quedan.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={yendo}
          className={`presionable h-11 rounded-lg border px-4 text-cuerpo font-semibold disabled:opacity-50 ${
            seguro
              ? 'border-alta bg-[#EF444414] text-alta-texto hover:bg-[#EF444422]'
              : 'border-borde text-tinta-2 hover:border-borde-fuerte hover:text-tinta'
          }`}
        >
          {yendo ? 'Reiniciando…' : seguro ? 'Sí, reiniciar' : 'Reiniciar demo'}
        </button>

        {seguro && !yendo && (
          <button
            type="button"
            onClick={() => setSeguro(false)}
            className="h-11 rounded-lg px-3 text-cuerpo text-tinta-3 hover:text-tinta"
          >
            Mejor no
          </button>
        )}
      </div>
    </form>
  )
}
