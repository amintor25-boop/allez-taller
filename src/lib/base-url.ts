import { headers } from 'next/headers'
import { baseFijada } from './entorno'

/**
 * La dirección a la que apunta el QR.
 *
 * Prioridad:
 *   1. NEXT_PUBLIC_BASE_URL, si está puesta. Es la que manda en producción.
 *   2. La cabecera Host de la propia petición.
 *
 * El punto 2 importa para la reunión: si el tablero se abre desde la IP de la red
 * local (http://192.168.2.152:3000), el QR sale con esa misma IP y el celular del
 * prospecto llega. Con "localhost" no llegaría nunca — y eso se descubriría con el
 * cliente delante.
 */
export async function baseUrl(): Promise<string> {
  const fijada = baseFijada()
  if (fijada) return fijada.replace(/\/+$/, '')

  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const protocolo = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${protocolo}://${host}`
}

export async function urlPublicaOrden(token: string): Promise<string> {
  return `${await baseUrl()}/o/${token}`
}
