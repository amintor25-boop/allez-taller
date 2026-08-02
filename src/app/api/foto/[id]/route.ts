import { NextResponse } from 'next/server'
import { fila } from '@/lib/db'

// Sirve una foto por id. Dos orígenes posibles:
//   · ruta_estatica → las 4 sembradas, que viven en /public/fotos
//   · datos         → las que se suben en vivo, comprimidas a 150 KB en el
//                     navegador y guardadas en base64 (no hay volumen persistente)
//
// El contenido de un id nunca cambia, así que se cachea para siempre. Eso además
// evita que cada refresco del tablero gaste una invocación de función.

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const foto = await fila<{ mime: string; datos: string | null; ruta_estatica: string | null }>(
    `SELECT mime, datos, ruta_estatica FROM fotos WHERE id = ?`,
    [id],
  )

  if (!foto) return new NextResponse(null, { status: 404 })

  if (foto.ruta_estatica) {
    return NextResponse.redirect(new URL(foto.ruta_estatica, _req.url), 307)
  }

  if (!foto.datos) return new NextResponse(null, { status: 404 })

  const binario = Buffer.from(foto.datos, 'base64')
  return new NextResponse(new Uint8Array(binario), {
    headers: {
      'content-type': foto.mime,
      'content-length': String(binario.length),
      'cache-control': 'public, max-age=31536000, immutable',
    },
  })
}
