'use client'

import { useRouter } from 'next/navigation'
import type { Mes } from '@/lib/consultas-facturacion'

// Los meses anteriores van en un selector, no en una tira horizontal: con dos
// años de historia la tira no cabe en ninguna pantalla, y el nativo del sistema
// se abre mejor en el celular que cualquier lista propia.

export function SelectorMes({
  meses,
  valor,
  base,
}: {
  meses: Mes[]
  valor: string
  base: string
}) {
  const router = useRouter()

  return (
    <select
      value={valor}
      aria-label="Ver un mes anterior"
      onChange={(e) => {
        if (e.target.value) router.push(`${base}?rango=${e.target.value}`)
        else router.push(base)
      }}
      className={`h-11 shrink-0 rounded-xl border bg-superficie px-3 text-meta font-semibold ${
        valor ? 'border-accion text-tinta' : 'border-borde text-tinta-2'
      }`}
    >
      <option value="">Mes anterior…</option>
      {meses.map((m) => (
        <option key={m.clave} value={m.clave}>
          {m.etiqueta}
        </option>
      ))}
    </select>
  )
}
