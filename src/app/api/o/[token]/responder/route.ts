import { NextResponse } from 'next/server'
import { ahora, fila, filas, lote } from '@/lib/db'
import { registrarEvento, tocarActividad } from '@/lib/demos'
import { dinero, token as generarId } from '@/lib/dominio'

// El paso que decide la venta: el dueño del carro toca un botón en su celular y
// esto se escribe en la base. Desde acá el tablero del taller lo ve solo.
//
// Entiende dos idiomas a propósito:
//   · <form> nativo → responde con un 303 de vuelta a la página (patrón POST/Redirect/GET).
//     Este es el camino que funciona SIN JavaScript, y es el principal.
//   · JSON          → responde JSON. Lo usa la mejora progresiva del navegador,
//     que además reintenta sola si se cae la red.

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const esFormulario = !(req.headers.get('content-type') ?? '').includes('application/json')

  const volver = (aviso?: string) =>
    NextResponse.redirect(new URL(`/o/${token}${aviso ? `?aviso=${aviso}` : ''}`, req.url), 303)

  let respuesta: string
  try {
    respuesta = esFormulario
      ? String((await req.formData()).get('respuesta') ?? '')
      : (await req.json())?.respuesta
  } catch {
    return esFormulario ? volver('error') : NextResponse.json({ error: 'cuerpo ilegible' }, { status: 400 })
  }
  if (respuesta !== 'aprobado' && respuesta !== 'rechazado') {
    return esFormulario ? volver('error') : NextResponse.json({ error: 'respuesta inválida' }, { status: 400 })
  }

  const orden = await fila<{
    id: string
    demo_id: string
    numero: number
    estado: string
    respondido_en: string | null
    cliente: string
  }>(
    `SELECT o.id, o.demo_id, o.numero, o.estado, o.respondido_en, c.nombre AS cliente
       FROM ordenes o JOIN clientes c ON c.id = o.cliente_id
      WHERE o.token_publico = ?`,
    [token],
  )

  if (!orden) {
    return esFormulario ? volver('no-encontrada') : NextResponse.json({ error: 'orden inexistente' }, { status: 404 })
  }

  const pendientes = await filas<{ id: string; descripcion: string; precio: number }>(
    `SELECT id, descripcion, precio FROM items WHERE orden_id = ? AND estado = 'propuesto'`,
    [orden.id],
  )

  // Ya la respondieron (el propio cliente en otra pestaña, o el taller).
  // No es un error: se devuelve el resultado que ya existe y la página se acomoda.
  if (pendientes.length === 0) {
    const aprobados = await fila<{ n: number }>(
      `SELECT COUNT(*) AS n FROM items WHERE orden_id = ? AND estado = 'aprobado'`,
      [orden.id],
    )
    // Sin JavaScript esto no es un error que mostrar: se vuelve a la página y
    // ella sola pinta el estado que corresponde.
    if (esFormulario) return volver()
    return NextResponse.json(
      { respuesta: (aprobados?.n ?? 0) > 0 ? 'aprobado' : 'rechazado', yaRespondida: true },
      { status: 409 },
    )
  }

  const t = ahora()
  const estadoNuevo = respuesta === 'aprobado' ? 'reparacion' : 'listo'

  // Se coloca al final de su nueva columna para que la transición del tablero
  // se vea limpia y no salte por encima de órdenes más antiguas.
  const ultima = await fila<{ n: number | null }>(
    `SELECT MAX(orden_columna) AS n FROM ordenes WHERE demo_id = ? AND estado = ?`,
    [orden.demo_id, estadoNuevo],
  )

  await lote([
    {
      sql: `UPDATE items SET estado = ? WHERE orden_id = ? AND estado = 'propuesto'`,
      args: [respuesta, orden.id],
    },
    {
      sql: `UPDATE ordenes
               SET estado = ?, respondido_en = ?, respondido_por = ?,
                   orden_columna = ?, actualizada_en = ?
             WHERE id = ?`,
      args: [estadoNuevo, t, orden.cliente, (ultima?.n ?? 0) + 1, t, orden.id],
    },
    {
      sql: `INSERT INTO movimientos (id, demo_id, orden_id, desde, hasta, nota, creado_en)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `mv_${generarId(10)}`, orden.demo_id, orden.id, orden.estado, estadoNuevo,
        respuesta === 'aprobado' ? 'Aprobado por el cliente' : 'No autorizado por el cliente', t,
      ],
    },
  ])

  const monto = pendientes.reduce((s, i) => s + i.precio, 0)
  await registrarEvento(
    orden.demo_id,
    respuesta === 'aprobado' ? 'aprobado' : 'rechazado',
    `Orden #0${orden.numero} · ${orden.cliente} ${respuesta === 'aprobado' ? 'aprobó' : 'no autorizó'} ${dinero(monto)}`,
  )
  await tocarActividad(orden.demo_id)

  if (esFormulario) return volver()
  return NextResponse.json({ respuesta, total: monto, estado: estadoNuevo })
}
