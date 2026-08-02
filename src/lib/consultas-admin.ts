import { filas, loteLectura } from './db'
import { HORAS_INACTIVIDAD, SLUG_PRINCIPAL, type TipoEvento } from './demos'
import { antiguedad, fechaHora } from './dominio'

// Lo que /admin necesita saber de cada enlace repartido.
//
// Todo sale de la tabla `eventos`, que se escribe desde las rutas de la API. No
// hay analítica ni cookies: solo lo que pasó dentro del demo.

export type ResumenDemo = {
  slug: string
  nombre: string
  esPrincipal: boolean
  creadoHace: string
  actividadHace: string
  /** Horas que faltan para el reinicio automático. Negativo = ya venció. */
  horasParaReinicio: number
  eventos: number
  aperturas: number
  ultimoDetalle: string | null
  /** Nadie ha entrado nunca: el enlace se generó y sigue sin repartir o sin abrir. */
  sinAbrir: boolean
  /** Entró, miró y no tocó nada. Eso también es información de venta. */
  soloMiro: boolean
}

export type UsoRegistrado = {
  id: number
  slug: string
  taller: string
  tipo: TipoEvento
  detalle: string
  cuando: string
  hace: string
}

/** Etiquetas legibles. El tipo crudo del evento no se enseña en pantalla. */
export const ETIQUETA_EVENTO: Record<TipoEvento, string> = {
  demo_abierto: 'Abrió el demo',
  orden_creada: 'Creó una orden',
  hallazgo_agregado: 'Agregó un hallazgo',
  presupuesto_enviado: 'Envió el presupuesto',
  aprobado: 'El cliente aprobó',
  rechazado: 'El cliente rechazó',
  facturado: 'Facturó',
  orden_movida: 'Movió una tarjeta',
  repuesto_creado: 'Registró un repuesto',
  stock_ajustado: 'Ajustó existencias',
  demo_reiniciado: 'Se reinició',
}

/**
 * Los eventos que cuentan como "el prospecto estuvo aquí". Abrir el demo y el
 * reinicio automático los provoca el sistema, no una persona: si contaran, un
 * enlace que nadie tocó parecería usado.
 */
/** "hace 0 min" no lo dice nadie. */
const recien = (t: string) => (t === '0 min' ? 'un momento' : t)

const DEL_PROSPECTO = (col: string) => `${col} NOT IN ('demo_abierto', 'demo_reiniciado')`

export async function resumenDemos(): Promise<ResumenDemo[]> {
  const [demos, conteos] = await loteLectura([
    {
      sql: `SELECT slug, taller_nombre, creado_en, ultima_actividad FROM demos ORDER BY creado_en DESC`,
      args: [],
    },
    {
      sql: `SELECT d.slug,
                   COUNT(*) AS eventos,
                   SUM(CASE WHEN e.tipo = 'demo_abierto' THEN 1 ELSE 0 END) AS aperturas,
                   SUM(CASE WHEN ${DEL_PROSPECTO('e.tipo')} THEN 1 ELSE 0 END) AS propios
              FROM eventos e JOIN demos d ON d.id = e.demo_id
             GROUP BY d.slug`,
      args: [],
    },
  ])

  const ultimos = await filas<{ slug: string; tipo: TipoEvento; detalle: string }>(
    `SELECT d.slug, e.tipo, e.detalle
       FROM eventos e JOIN demos d ON d.id = e.demo_id
      WHERE e.id IN (SELECT MAX(id) FROM eventos WHERE ${DEL_PROSPECTO('tipo')} GROUP BY demo_id)`,
  )

  const porSlug = new Map((conteos as any[]).map((c) => [c.slug, c]))
  const ultimoPorSlug = new Map(ultimos.map((u) => [u.slug, u]))
  const ahora = Date.now()

  return (demos as any[]).map((d) => {
    const c = porSlug.get(d.slug)
    const u = ultimoPorSlug.get(d.slug)
    const transcurridas = (ahora - new Date(d.ultima_actividad).getTime()) / 3_600_000

    return {
      slug: d.slug,
      nombre: d.taller_nombre,
      esPrincipal: d.slug === SLUG_PRINCIPAL,
      creadoHace: recien(antiguedad(d.creado_en, ahora)),
      actividadHace: recien(antiguedad(d.ultima_actividad, ahora)),
      horasParaReinicio: Math.round(HORAS_INACTIVIDAD - transcurridas),
      eventos: Number(c?.eventos ?? 0),
      aperturas: Number(c?.aperturas ?? 0),
      ultimoDetalle: u ? `${ETIQUETA_EVENTO[u.tipo]}${u.detalle ? ` · ${u.detalle}` : ''}` : null,
      sinAbrir: Number(c?.aperturas ?? 0) === 0,
      soloMiro: Number(c?.aperturas ?? 0) > 0 && Number(c?.propios ?? 0) === 0,
    }
  })
}

export async function registroDeUso(limite = 80): Promise<UsoRegistrado[]> {
  const r = await filas<{
    id: number; slug: string; taller: string; tipo: TipoEvento; detalle: string; creado_en: string
  }>(
    `SELECT e.id, d.slug, d.taller_nombre AS taller, e.tipo, e.detalle, e.creado_en
       FROM eventos e JOIN demos d ON d.id = e.demo_id
      ORDER BY e.creado_en DESC, e.id DESC
      LIMIT ?`,
    [limite],
  )

  const ahora = Date.now()
  return r.map((e) => ({
    id: e.id,
    slug: e.slug,
    taller: e.taller,
    tipo: e.tipo,
    detalle: e.detalle,
    cuando: fechaHora(e.creado_en),
    hace: recien(antiguedad(e.creado_en, ahora)),
  }))
}
