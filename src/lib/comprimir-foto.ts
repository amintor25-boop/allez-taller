// Comprime en el navegador antes de subir. No hay volumen persistente: la foto
// viaja como base64 y vive en la base, así que 150 KB es el techo.

const MAX_BYTES = 150_000
const MAX_LADO = 1400

export async function comprimirFoto(
  archivo: File,
): Promise<{ datos: string; mime: string; bytes: number }> {
  const mapa = await createImageBitmap(archivo)
  const escala = Math.min(1, MAX_LADO / Math.max(mapa.width, mapa.height))
  const ancho = Math.round(mapa.width * escala)
  const alto = Math.round(mapa.height * escala)

  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const ctx = lienzo.getContext('2d')
  if (!ctx) throw new Error('No se pudo preparar la imagen')
  ctx.drawImage(mapa, 0, 0, ancho, alto)
  mapa.close()

  // Se baja la calidad hasta entrar en el techo. Con fotos de taller (piezas
  // sobre fondo plano) suele bastar el primer intento.
  let calidad = 0.82
  let url = lienzo.toDataURL('image/jpeg', calidad)
  while (url.length * 0.75 > MAX_BYTES && calidad > 0.32) {
    calidad -= 0.12
    url = lienzo.toDataURL('image/jpeg', calidad)
  }

  const datos = url.slice(url.indexOf(',') + 1)
  return { datos, mime: 'image/jpeg', bytes: Math.round(datos.length * 0.75) }
}
