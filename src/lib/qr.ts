import QRCode from 'qrcode'

/**
 * QR como SVG, generado en el servidor y embebido en el HTML.
 *
 * Se hace así y no en el navegador por una razón concreta: cuando el modal se
 * abre, el código ya está dibujado. Ninguna petición extra, ningún parpadeo, nada
 * que pueda tardar delante del cliente.
 *
 * Corrección de errores en nivel medio: aguanta un reflejo o un dedo encima sin
 * dejar de leerse, que es lo que va a pasar cuando alguien lo escanee de lado.
 */
export async function qrSvg(texto: string): Promise<string> {
  return QRCode.toString(texto, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    color: { dark: '#0B1226', light: '#FFFFFF' },
  })
}
