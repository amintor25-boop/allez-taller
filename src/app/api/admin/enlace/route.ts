import { NextResponse } from 'next/server'
import { crearDemo } from '@/lib/demos'
import { slugificar } from '@/lib/dominio'

// Genera un enlace de demostración para un prospecto.
//
// Cada enlace es una copia aislada: su propio taller, sus propios clientes, su
// propio inventario. Nada de lo que haga uno se ve desde otro.
//
// Como el resto del proyecto, funciona sin JavaScript: es un <form> nativo y la
// respuesta es un redirect 303 a /admin con el enlace nuevo señalado.

export async function POST(req: Request) {
  const esFormulario = !(req.headers.get('content-type') ?? '').includes('application/json')
  const volver = (parametros = '') =>
    NextResponse.redirect(new URL(`/admin${parametros}`, req.url), 303)
  const falla = (mensaje: string, estado: number) =>
    esFormulario
      ? volver(`?error=${encodeURIComponent(mensaje)}`)
      : NextResponse.json({ error: mensaje }, { status: estado })

  let cuerpo: any
  try {
    cuerpo = esFormulario ? Object.fromEntries(await req.formData()) : await req.json()
  } catch {
    return falla('No se entendió el formulario', 400)
  }

  const nombre = String(cuerpo.nombre ?? '').trim().slice(0, 60)
  if (!nombre) return falla('Falta el nombre del taller', 400)

  // La dirección se puede escribir a mano; si no, sale del nombre.
  const pedido = slugificar(String(cuerpo.slug ?? '')) || undefined

  // Sembrar doce meses de historial toma un momento: el enlace nace completo,
  // no vacío esperando a que alguien lo llene.
  const demo = await crearDemo(nombre, pedido)

  return esFormulario
    ? volver(`?nuevo=${demo.slug}`)
    : NextResponse.json({ slug: demo.slug, nombre: demo.taller_nombre })
}
