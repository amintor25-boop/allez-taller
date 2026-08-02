import { NextResponse } from 'next/server'
import { ahora, fila, lote } from '@/lib/db'
import { buscarDemo, registrarEvento, tocarActividad } from '@/lib/demos'
import { centavos, token as generarId } from '@/lib/dominio'

// Alta de repuesto.
//
// Lo que da de alta el prospecto lleva `sembrada = 0`: sobrevive al reinicio de
// las 48 horas, mientras que lo sembrado vuelve a su estado inicial.
//
// Igual que en la página del cliente, el formulario nativo funciona sin
// JavaScript: si el navegador manda el formulario a pelo, se responde con un
// redirect 303 y la pantalla se repinta con el repuesto ya adentro.

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const esFormulario = !(req.headers.get('content-type') ?? '').includes('application/json')
  const volver = (parametros = '') =>
    NextResponse.redirect(new URL(`/d/${slug}/inventario${parametros}`, req.url), 303)
  const falla = (mensaje: string, estado: number) =>
    esFormulario
      ? volver(`?error=${encodeURIComponent(mensaje)}`)
      : NextResponse.json({ error: mensaje }, { status: estado })

  let cuerpo: any
  try {
    cuerpo = esFormulario
      ? Object.fromEntries(await req.formData())
      : await req.json()
  } catch {
    return falla('No se entendió el formulario', 400)
  }

  const demo = await buscarDemo(slug)
  if (!demo) return falla('demo inexistente', 404)

  const nombre = String(cuerpo.nombre ?? '').trim().slice(0, 90)
  const categoria = String(cuerpo.categoria ?? '').trim().slice(0, 40) || 'Otros'
  const ubicacion = String(cuerpo.ubicacion ?? '').trim().slice(0, 12).toUpperCase() || '—'
  const stock = Math.max(0, Math.min(9999, Math.round(Number(cuerpo.stock) || 0)))
  const minimo = Math.max(0, Math.min(9999, Math.round(Number(cuerpo.minimo) || 0)))
  const precio = centavos(Number(cuerpo.precio) || 0)

  if (!nombre) return falla('Falta el nombre del repuesto', 400)
  if (precio <= 0) return falla('Falta el precio', 400)

  // El código se propone solo a partir de la categoría, pero se puede escribir.
  const propuesto = String(cuerpo.codigo ?? '').trim().toUpperCase().slice(0, 16)
  const codigo = propuesto || `${categoria.slice(0, 3).toUpperCase()}-${generarId(4)}`

  const repetido = await fila<{ id: string }>(
    `SELECT id FROM inventario WHERE demo_id = ? AND UPPER(codigo) = ?`,
    [demo.id, codigo],
  )
  if (repetido) return falla(`Ya hay un repuesto con el código ${codigo}`, 409)

  const id = `inv_${generarId(12)}`
  const t = ahora()

  await lote([
    {
      sql: `INSERT INTO inventario (id, demo_id, codigo, nombre, categoria, stock, stock_minimo, precio, ubicacion, sembrada)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      args: [id, demo.id, codigo, nombre, categoria, stock, minimo, precio, ubicacion],
    },
    ...(stock > 0
      ? [
          {
            sql: `INSERT INTO movimientos_stock (id, demo_id, repuesto_id, cantidad, motivo, orden_id, creado_en)
                  VALUES (?, ?, ?, ?, 'Alta del repuesto', NULL, ?)`,
            args: [`ms_${generarId(10)}`, demo.id, id, stock, t],
          },
        ]
      : []),
  ])

  await registrarEvento(demo.id, 'repuesto_creado', `${codigo} · ${nombre} · ${stock} en bodega`)
  await tocarActividad(demo.id)

  return esFormulario ? volver(`?nuevo=${id}#${id}`) : NextResponse.json({ id, codigo, nombre })
}
