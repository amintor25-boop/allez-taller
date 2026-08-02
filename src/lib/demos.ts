import { ahora, ejecutar, fila, filas } from './db'
import { slugificar, token } from './dominio'
import { rucFicticio, sembrarDemo, type Demo } from './semilla'
import { restaurarDemo } from './restauracion'

export type { Demo }

/** Slug del demo de bolsillo: el que se proyecta en la reunión. `/` redirige aquí. */
export const SLUG_PRINCIPAL = 'san-rafael'
export const NOMBRE_PRINCIPAL = 'Taller San Rafael'

/** Sin actividad por este tiempo, el enlace vuelve solo a su estado inicial. */
export const HORAS_INACTIVIDAD = 48

export type TipoEvento =
  | 'demo_abierto'
  | 'orden_creada'
  | 'hallazgo_agregado'
  | 'presupuesto_enviado'
  | 'aprobado'
  | 'rechazado'
  | 'facturado'
  | 'orden_movida'
  | 'repuesto_creado'
  | 'stock_ajustado'
  | 'demo_reiniciado'

/**
 * Busca por slug NORMALIZADO.
 *
 * `crearDemo` guarda siempre la forma normalizada, así que comparar la cadena
 * cruda de la URL dejaba fuera cualquier variante: una mayúscula, un guion de
 * más, un guion al final. Y como `abrirDemo` crea lo que no encuentra, cada
 * carga de página fabricaba un demo entero: medido, tres visitas a
 * /d/Taller-Prueba-Mayus dejaron taller-prueba-mayus, -2 y -3, con sus doce
 * meses de historial cada uno. Contra Turso serían 3.226 sentencias por visita.
 */
export async function buscarDemo(slug: string): Promise<Demo | null> {
  const limpio = slugificar(slug)
  if (!limpio) return null
  return fila<Demo>(`SELECT * FROM demos WHERE slug = ?`, [limpio])
}

export async function listarDemos(): Promise<Demo[]> {
  return filas<Demo>(`SELECT * FROM demos ORDER BY creado_en DESC`)
}

function titular(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(' ')
}

/** Un demo con `sembrado_en` vacío está naciendo: la semilla todavía no acabó. */
export function estaListo(demo: Demo): boolean {
  return Boolean(demo.sembrado_en)
}

/**
 * Crea la FILA del demo. No siembra: eso lo decide quien llama.
 */
async function crearFila(nombreTaller: string, slugPedido?: string): Promise<Demo> {
  const nombre = nombreTaller.trim() || 'Taller sin nombre'
  const base = slugificar(slugPedido || nombre) || `taller-${token(4).toLowerCase()}`

  // Si el slug ya existe se le agrega un sufijo, nunca se pisa un demo ajeno.
  let slug = base
  for (let i = 2; await buscarDemo(slug); i++) slug = `${base}-${i}`

  const t = ahora()
  const id = `d_${token(10).toLowerCase()}`

  // `sembrado_en` nace vacío y lo pone la semilla al terminar. Mientras esté
  // vacío, el demo está a medio hacer y las pantallas lo saben.
  await ejecutar(
    `INSERT INTO demos (id, slug, taller_nombre, telefono, ciudad, ruc, creado_en, sembrado_en, ultima_actividad, tour_visto, secuencial)
     VALUES (?, ?, ?, ?, 'Quito', ?, ?, '', ?, 0, 1247)`,
    [id, slug, nombre, process.env.NEXT_PUBLIC_TELEFONO_TALLER ?? null, rucFicticio(slug), t, t],
  )

  return (await buscarDemo(slug))!
}

/**
 * Crea el demo Y LO SIEMBRA, esperando a que termine.
 *
 * Es lo que hace /admin: ahí el que espera es quien reparte los enlaces, no el
 * prospecto, y da igual que tarde unos segundos contra Turso.
 */
export async function crearDemo(nombreTaller: string, slugPedido?: string): Promise<Demo> {
  const demo = await crearFila(nombreTaller, slugPedido)
  await sembrarDemo(demo)
  return (await buscarDemo(demo.slug))!
}

/**
 * Crea el demo y arranca la semilla POR DETRÁS.
 *
 * Para el enlace que alguien teclea a mano. La petición devuelve enseguida con
 * `sembrado_en` vacío; el layout enseña "preparando el taller" y en cuanto la
 * semilla acaba, la siguiente carga trae el taller lleno.
 */
async function crearDemoSinEsperar(nombreTaller: string, slugPedido?: string): Promise<Demo> {
  const demo = await crearFila(nombreTaller, slugPedido)
  // A propósito sin `await`: `sembrarDemo` ya se protege de correr dos veces
  // para el mismo demo, así que dos pestañas a la vez no lo duplican.
  void sembrarDemo(demo).catch(() => {})
  return demo
}

/**
 * Crea un demo que todavía no existe, una sola vez aunque lo pidan a la vez.
 *
 * EL LAYOUT Y LA PÁGINA LLAMAN LOS DOS A `abrirDemo`, y Next los renderiza en
 * paralelo. Con un enlace nuevo los dos veían que no existía, los dos lo creaban
 * y el segundo reventaba contra el índice único del slug: la primera visita a un
 * enlace recién repartido devolvía un 500. Medido con /d/taller-inventado.
 *
 * El mapa de promesas resuelve el caso real —las dos llamadas ocurren dentro del
 * mismo render, en el mismo proceso—. El `catch` cubre lo demás: si otra
 * instancia ganó la carrera, se lee lo que dejó en vez de fallar.
 */
const naciendo = new Map<string, Promise<Demo>>()

async function nacerUnaVez(slug: string, nombre: string): Promise<Demo> {
  const enCurso = naciendo.get(slug)
  if (enCurso) return enCurso

  const parto = crearDemoSinEsperar(nombre, slug)
    .catch(async (e) => {
      const yaEsta = await buscarDemo(slug)
      if (yaEsta) return yaEsta
      throw e
    })
    .finally(() => naciendo.delete(slug))

  naciendo.set(slug, parto)
  return parto
}

function vencido(demo: Demo): boolean {
  const transcurrido = Date.now() - new Date(demo.ultima_actividad).getTime()
  return transcurrido > HORAS_INACTIVIDAD * 3_600_000
}

/**
 * Hueco a partir del cual volver a entrar cuenta como una visita nueva.
 *
 * Sin cookies ni analítica no hay forma de saber si es la misma persona: lo
 * único observable es cuánto tiempo pasó sin que nadie tocara este enlace. Media
 * hora separa "el prospecto volvió al día siguiente" de "hizo clic en Reportes".
 */
const MINUTOS_VISITA = 30

/**
 * Marca actividad y, si venía de un silencio largo, anota la visita.
 *
 * El UPDATE lleva la condición dentro: gana el primero que llega y los demás no
 * afectan ninguna fila. Así dos pestañas abiertas a la vez —o el prefetch de
 * Next junto a la navegación de verdad— no escriben dos veces "abrió el demo".
 */
async function anotarVisita(demo: Demo): Promise<void> {
  const t = ahora()
  const corte = new Date(Date.now() - MINUTOS_VISITA * 60_000).toISOString()

  const r = await ejecutar(
    `UPDATE demos SET ultima_actividad = ? WHERE id = ? AND ultima_actividad < ?`,
    [t, demo.id, corte],
  )
  if (Number(r.rowsAffected ?? 0) > 0) {
    await registrarEvento(demo.id, 'demo_abierto', 'Entró al tablero')
    return
  }

  // Visita en curso: basta con correr el reloj de las 48 horas, y solo si el
  // valor guardado ya tiene su tiempo. Escribir en cada render sería un viaje a
  // la red por cada clic de navegación.
  if (Date.now() - new Date(demo.ultima_actividad).getTime() > 60_000) {
    await ejecutar(`UPDATE demos SET ultima_actividad = ? WHERE id = ?`, [t, demo.id])
  }
}

/**
 * Punto de entrada de todo enlace de demo.
 *
 * - Si el slug no existe, lo crea sembrado. Ningún enlace muere en un 404.
 * - Si lleva más de 48 h sin actividad, lo devuelve a su estado inicial antes
 *   de pintar nada. Así el prospecto siempre lo encuentra ordenado.
 */
export async function abrirDemo(slug: string): Promise<Demo> {
  let demo = await buscarDemo(slug)

  if (!demo) {
    // Un enlace que nadie generó pero que alguien tecleó. La fila se crea ya; la
    // semilla —3.226 sentencias— arranca DETRÁS y la pantalla no la espera. El
    // layout ve `sembrado_en` vacío y enseña "preparando el taller".
    const nombre = slug === SLUG_PRINCIPAL ? NOMBRE_PRINCIPAL : `Taller ${titular(slug).replace(/^Taller\s+/i, '')}`
    const nuevo = await nacerUnaVez(slugificar(slug), nombre)
    await registrarEvento(nuevo.id, 'demo_abierto', 'Entró al tablero')
    return nuevo
  }

  if (vencido(demo)) {
    // RESTAURAR, NO RESEMBRAR. Son unas decenas de sentencias en un solo viaje
    // en vez de 3.226 en nueve. Esto corre dentro de la petición del prospecto,
    // en su primera visita al día siguiente: es el peor sitio posible para una
    // espera larga, y el momento que no se puede perder.
    await restaurarDemo(demo)
    await registrarEvento(demo.id, 'demo_reiniciado', `Reinicio automático tras ${HORAS_INACTIVIDAD} h sin actividad`)
    demo = (await buscarDemo(slug))!
  }

  await anotarVisita(demo)

  return demo
}

/** El botón de la pantalla de configuración. Mismo resultado, mismo camino. */
export async function reiniciarDemo(demo: Demo): Promise<void> {
  await restaurarDemo(demo)
  await registrarEvento(demo.id, 'demo_reiniciado', 'Reinicio manual desde el tablero')
}

export async function tocarActividad(demoId: string): Promise<void> {
  await ejecutar(`UPDATE demos SET ultima_actividad = ? WHERE id = ?`, [ahora(), demoId])
}

export async function registrarEvento(demoId: string, tipo: TipoEvento, detalle = ''): Promise<void> {
  await ejecutar(
    `INSERT INTO eventos (demo_id, tipo, detalle, creado_en) VALUES (?, ?, ?, ?)`,
    [demoId, tipo, detalle, ahora()],
  )
}

export type Evento = { id: number; demo_id: string; tipo: TipoEvento; detalle: string; creado_en: string }

export async function eventosDe(demoId: string, limite = 100): Promise<Evento[]> {
  return filas<Evento>(
    `SELECT * FROM eventos WHERE demo_id = ? ORDER BY creado_en DESC, id DESC LIMIT ?`,
    [demoId, limite],
  )
}
