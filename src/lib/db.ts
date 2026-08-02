import type { Client, InArgs } from '@libsql/client'
import { ESQUEMA, MIGRACIONES } from './esquema'

// En desarrollo: archivo local (`file:./data/allez.db`) mediante el cliente nativo.
// En Netlify: Turso por HTTP mediante @libsql/client/web, que es JavaScript puro
// y no arrastra binarios nativos al paquete de la función.

// Ojo con `??`: una variable presente pero vacía en .env.local ("TURSO_DATABASE_URL=")
// llega como cadena vacía, no como undefined. Con `||` cae al archivo local, que es
// lo que se espera en desarrollo.
const URL_BD = process.env.TURSO_DATABASE_URL?.trim() || 'file:./data/allez.db'
const TOKEN_BD = process.env.TURSO_AUTH_TOKEN?.trim() || undefined

const esRemoto = /^(libsql|https|http|wss|ws):/.test(URL_BD)

let clientePrometido: Promise<Client> | null = null

async function crear(): Promise<Client> {
  const { createClient } = esRemoto
    ? await import('@libsql/client/web')
    : await import('@libsql/client')

  // AVISO: base remota desde una máquina que no es Netlify.
  //
  // `next dev` y `next start` leen .env.local, y ahí viven las credenciales de
  // Turso desde que se publicó. O sea que levantar el servidor en la laptop
  // TOCA LA DEMO DE PRODUCCIÓN: mover una tarjeta aquí la mueve para el
  // prospecto que la esté mirando. Los scripts de terminal no lo hacen —tsx no
  // carga .env.local— así que la trampa es solo esta.
  if (esRemoto && !process.env.NETLIFY) {
    console.warn(
      '\n\x1b[33m  ⚠  Base REMOTA (Turso) desde esta máquina.\x1b[0m\n' +
        '     Lo que toques aquí le pasa al demo publicado.\n' +
        '     Para trabajar contra el archivo local, vacía TURSO_DATABASE_URL en .env.local.\n',
    )
  }

  const cliente = createClient({ url: URL_BD, authToken: TOKEN_BD })

  // El esquema se asegura una sola vez por instancia. Son CREATE IF NOT EXISTS,
  // así que es idempotente y barato.
  await cliente.batch(ESQUEMA, 'write')

  // Las migraciones van sueltas: si la columna ya existe, SQLite protesta y ese
  // error es justamente la señal de que no hay nada que hacer.
  for (const sql of MIGRACIONES) {
    try {
      await cliente.execute(sql)
    } catch (e) {
      if (!/duplicate column|already exists/i.test(String((e as Error)?.message ?? ''))) throw e
    }
  }

  return cliente
}

export function db(): Promise<Client> {
  if (!clientePrometido) {
    clientePrometido = crear().catch((e) => {
      // Si falla, no dejamos la promesa rota cacheada: el siguiente intento reintenta.
      clientePrometido = null
      throw e
    })
  }
  return clientePrometido
}

// ─── Azúcar de consulta ──────────────────────────────────────────────────────

export async function filas<T = Record<string, unknown>>(
  sql: string,
  args: InArgs = [],
): Promise<T[]> {
  const c = await db()
  const r = await c.execute({ sql, args })
  return r.rows as unknown as T[]
}

export async function fila<T = Record<string, unknown>>(
  sql: string,
  args: InArgs = [],
): Promise<T | null> {
  const r = await filas<T>(sql, args)
  return r[0] ?? null
}

export async function ejecutar(sql: string, args: InArgs = []) {
  const c = await db()
  return c.execute({ sql, args })
}

/** Varias sentencias en una sola ida a la red. Importante con Turso: cada
 *  viaje cuesta latencia, y el requisito es responder en menos de 1 segundo.
 *
 *  Se parte en tandas porque la siembra de doce meses son miles de sentencias y
 *  un solo lote de ese tamaño se atraganta contra una base remota. */
const TANDA = 400

export async function lote(sentencias: { sql: string; args?: InArgs }[]) {
  if (sentencias.length === 0) return
  const c = await db()
  for (let i = 0; i < sentencias.length; i += TANDA) {
    await c.batch(
      sentencias.slice(i, i + TANDA).map((s) => ({ sql: s.sql, args: s.args ?? [] })),
      'write',
    )
  }
}

/** Varias lecturas en un solo viaje a la red. Mismo motivo que `lote`. */
export async function loteLectura(sentencias: { sql: string; args?: InArgs }[]) {
  const c = await db()
  const r = await c.batch(
    sentencias.map((s) => ({ sql: s.sql, args: s.args ?? [] })),
    'read',
  )
  return r.map((x) => x.rows as unknown as Record<string, unknown>[])
}

export function ahora(): string {
  return new Date().toISOString()
}

export function haceMinutos(minutos: number): string {
  return new Date(Date.now() - minutos * 60_000).toISOString()
}

export function haceHoras(horas: number): string {
  return haceMinutos(horas * 60)
}
