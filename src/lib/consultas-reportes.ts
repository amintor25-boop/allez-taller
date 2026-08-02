import { loteLectura } from './db'
import { iniciales } from './dominio'

// Reportes.
//
// Todo sale de las órdenes y las facturas de verdad: si el tablero dice doce
// carros adentro, aquí dice doce. Los indicadores del mes se comparan contra los
// MISMOS DÍAS transcurridos del mes anterior — comparar dos días de agosto
// contra un julio entero daría una caída que no existe.

const DESFASE = 5 * 60 * 60 * 1000

function local(): Date {
  return new Date(Date.now() - DESFASE)
}

function instante(anio: number, mes: number, dia: number): string {
  return new Date(Date.UTC(anio, mes, dia) + DESFASE).toISOString()
}

export type Indicador = {
  etiqueta: string
  valor: string
  variacion: number | null
  detalle?: string
  /** Sin sentido de bueno o malo: se pinta en gris y no en verde ni rojo. */
  neutro?: boolean
}

export type MesBarra = { clave: string; etiqueta: string; nombre: string; total: number; enCurso: boolean }

export type ServicioVendido = { descripcion: string; veces: number; ingreso: number }

export type Mecanico = {
  nombre: string
  siglas: string
  carros: number
  horas: number
  ingreso: number
}

export type Reportes = {
  indicadores: Indicador[]
  meses: MesBarra[]
  servicios: ServicioVendido[]
  mecanicos: Mecanico[]
  desdeDias: number
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function variacion(ahora: number, antes: number): number | null {
  if (antes <= 0) return null
  return Math.round(((ahora - antes) / antes) * 100)
}

const VENTANA_BLOQUES = 30 // días para "lo que más se vende" y productividad

export async function reportesDe(demoId: string): Promise<Reportes> {
  const hoy = local()
  const a = hoy.getUTCFullYear()
  const m = hoy.getUTCMonth()
  const d = hoy.getUTCDate()

  const mesDesde = instante(a, m, 1)
  const mesHasta = instante(a, m + 1, 1)
  const previoDesde = instante(a, m - 1, 1)
  const previoHasta = instante(a, m - 1, d + 1) // mismos días transcurridos
  const bloqueDesde = new Date(Date.now() - VENTANA_BLOQUES * 86_400_000).toISOString()
  const doceMeses = instante(a, m - 11, 1)
  const diasDelMes = new Date(Date.UTC(a, m + 1, 0)).getUTCDate()
  const transcurridos = `${d} de ${diasDelMes} días`
  const claveMesActual = `${a}-${String(m + 1).padStart(2, '0')}`

  // Cuántas órdenes estaban abiertas en un instante dado: creadas antes y
  // entregadas después. Es dato real, no una foto guardada.
  const abiertasEn = () => `
    SELECT COUNT(*) AS n FROM ordenes o
     WHERE o.demo_id = ? AND o.creada_en < ?
       AND (o.archivada = 0
            OR COALESCE((SELECT f.emitida_en FROM facturas f WHERE f.orden_id = o.id), o.actualizada_en) > ?)`

  const [mes, previo, abiertasHoy, abiertasAntes, tiempos, barras, servicios, mecanicos, presupuestos] =
    await loteLectura([
      {
        sql: `SELECT COALESCE(SUM(CASE WHEN estado <> 'anulada' THEN total ELSE 0 END), 0) AS facturado,
                     SUM(CASE WHEN estado <> 'anulada' THEN 1 ELSE 0 END) AS comprobantes
                FROM facturas WHERE demo_id = ? AND emitida_en >= ? AND emitida_en < ?`,
        args: [demoId, mesDesde, mesHasta],
      },
      {
        sql: `SELECT COALESCE(SUM(CASE WHEN estado <> 'anulada' THEN total ELSE 0 END), 0) AS facturado,
                     SUM(CASE WHEN estado <> 'anulada' THEN 1 ELSE 0 END) AS comprobantes
                FROM facturas WHERE demo_id = ? AND emitida_en >= ? AND emitida_en < ?`,
        args: [demoId, previoDesde, previoHasta],
      },
      // OJO: el corte es el instante actual, no `hoy`, que ya viene desplazado
      // cinco horas al reloj de Ecuador y sirve para partir días, no para
      // comparar instantes. Con `hoy` se descartaban las órdenes abiertas en las
      // últimas cinco horas y la tarjeta decía 10 mientras la cabecera de la
      // misma pantalla decía 12.
      { sql: abiertasEn(), args: [demoId, new Date().toISOString(), new Date().toISOString()] },
      { sql: abiertasEn(), args: [demoId, previoHasta, previoHasta] },
      {
        // Horas que el carro pasó en el taller, de ingreso a entrega.
        sql: `SELECT
                AVG(CASE WHEN f.emitida_en >= ?2 AND f.emitida_en < ?3
                         THEN (julianday(f.emitida_en) - julianday(o.creada_en)) * 24 END) AS ahora,
                AVG(CASE WHEN f.emitida_en >= ?4 AND f.emitida_en < ?5
                         THEN (julianday(f.emitida_en) - julianday(o.creada_en)) * 24 END) AS antes
              FROM facturas f JOIN ordenes o ON o.id = f.orden_id
             WHERE f.demo_id = ?1 AND f.estado <> 'anulada'`,
        args: [demoId, mesDesde, mesHasta, previoDesde, previoHasta],
      },
      {
        sql: `SELECT strftime('%Y-%m', datetime(emitida_en, '-5 hours')) AS clave,
                     COALESCE(SUM(CASE WHEN estado <> 'anulada' THEN total ELSE 0 END), 0) AS total
                FROM facturas WHERE demo_id = ? AND emitida_en >= ?
            GROUP BY clave ORDER BY clave`,
        args: [demoId, doceMeses],
      },
      {
        sql: `SELECT i.descripcion, COUNT(*) AS veces, SUM(i.precio) AS ingreso
                FROM items i JOIN ordenes o ON o.id = i.orden_id
               WHERE i.demo_id = ? AND i.estado <> 'rechazado' AND i.estado <> 'propuesto'
                 AND o.creada_en >= ?
            GROUP BY i.descripcion ORDER BY veces DESC, ingreso DESC LIMIT 7`,
        args: [demoId, bloqueDesde],
      },
      {
        sql: `SELECT m.nombre,
                     COUNT(DISTINCT o.id) AS carros,
                     COALESCE(SUM(i.horas), 0) AS horas,
                     COALESCE(SUM(i.precio), 0) AS ingreso
                FROM mecanicos m
           LEFT JOIN ordenes o ON o.mecanico_id = m.id AND o.creada_en >= ?2
           LEFT JOIN items i   ON i.orden_id = o.id AND i.estado <> 'rechazado' AND i.estado <> 'propuesto'
               WHERE m.demo_id = ?1
            GROUP BY m.id ORDER BY ingreso DESC`,
        args: [demoId, bloqueDesde],
      },
      {
        sql: `SELECT
                SUM(CASE WHEN i.estado = 'aprobado'  THEN 1 ELSE 0 END) AS aprobados,
                SUM(CASE WHEN i.estado = 'rechazado' THEN 1 ELSE 0 END) AS rechazados,
                SUM(CASE WHEN i.estado = 'aprobado'  AND o.creada_en < ?2 THEN 1 ELSE 0 END) AS aprobadosAntes,
                SUM(CASE WHEN i.estado = 'rechazado' AND o.creada_en < ?2 THEN 1 ELSE 0 END) AS rechazadosAntes
              FROM items i JOIN ordenes o ON o.id = i.orden_id
             WHERE i.demo_id = ?1 AND i.tipo = 'hallazgo'`,
        args: [demoId, previoHasta],
      },
    ])

  const n = (x: unknown) => Number(x ?? 0)
  const mesR = mes[0] as any
  const prevR = previo[0] as any
  const t = tiempos[0] as any
  const p = presupuestos[0] as any

  const facturado = n(mesR?.facturado)
  const comprobantes = n(mesR?.comprobantes)
  const facturadoPrev = n(prevR?.facturado)
  const comprobantesPrev = n(prevR?.comprobantes)

  const ticket = comprobantes > 0 ? Math.round(facturado / comprobantes) : 0
  const ticketPrev = comprobantesPrev > 0 ? Math.round(facturadoPrev / comprobantesPrev) : 0

  const horasAhora = n(t?.ahora)
  const horasAntes = n(t?.antes)

  const aprobados = n(p?.aprobados)
  const rechazados = n(p?.rechazados)
  const tasa = aprobados + rechazados > 0 ? Math.round((aprobados / (aprobados + rechazados)) * 100) : 0
  const aprobadosA = n(p?.aprobadosAntes)
  const rechazadosA = n(p?.rechazadosAntes)
  const tasaAntes =
    aprobadosA + rechazadosA > 0 ? Math.round((aprobadosA / (aprobadosA + rechazadosA)) * 100) : 0

  return {
    desdeDias: VENTANA_BLOQUES,
    indicadores: [
      {
        etiqueta: 'Facturado del mes',
        valor: dineroLimpio(facturado),
        variacion: variacion(facturado, facturadoPrev),
        // Decir cuántos días van evita que un mes recién empezado parezca una
        // caída del negocio: es el primer número que mira el dueño.
        detalle: transcurridos,
      },
      {
        etiqueta: 'Carros atendidos',
        valor: String(comprobantes),
        variacion: variacion(comprobantes, comprobantesPrev),
        detalle: transcurridos,
      },
      {
        etiqueta: 'Ticket promedio',
        valor: dineroLimpio(ticket),
        variacion: variacion(ticket, ticketPrev),
        detalle: transcurridos,
      },
      {
        etiqueta: 'Órdenes abiertas',
        valor: String(n((abiertasHoy[0] as any)?.n)),
        variacion: variacion(n((abiertasHoy[0] as any)?.n), n((abiertasAntes[0] as any)?.n)),
        detalle: 'ahora mismo en el taller',
        // Más carros adentro no es ni bueno ni malo: es más trabajo y más cola.
        neutro: true,
      },
      {
        etiqueta: 'Tiempo en el taller',
        valor: horasAhora > 0 ? formatoHoras(horasAhora) : '—',
        // Menos tiempo es mejor: se invierte el signo para que verde siga
        // significando "va bien".
        variacion: horasAntes > 0 ? -1 * (variacion(horasAhora, horasAntes) ?? 0) : null,
        detalle: 'de ingreso a entrega',
      },
      {
        etiqueta: 'Presupuestos aprobados',
        valor: `${tasa} %`,
        variacion: tasaAntes > 0 ? tasa - tasaAntes : null,
        // Este indicador SÍ es histórico, a diferencia de los otros cinco: con
        // dos días de mes transcurridos, un "3 sí · 0 no" no dice nada. El
        // detalle lo aclara para que no se lea como si fuera del mes.
        detalle: `${aprobados} sí · ${rechazados} no · histórico`,
      },
    ],
    meses: (barras as any[]).map((b) => {
      const [anio, mm] = String(b.clave).split('-')
      return {
        clave: b.clave,
        etiqueta: MESES_CORTOS[Number(mm) - 1],
        nombre: `${MESES_LARGOS[Number(mm) - 1]} de ${anio}`,
        total: n(b.total),
        enCurso: b.clave === claveMesActual,
      }
    }),
    servicios: (servicios as any[]).map((s) => ({
      descripcion: s.descripcion,
      veces: n(s.veces),
      ingreso: n(s.ingreso),
    })),
    mecanicos: (mecanicos as any[]).map((x) => ({
      nombre: x.nombre,
      siglas: iniciales(x.nombre),
      carros: n(x.carros),
      horas: Math.round(n(x.horas) * 10) / 10,
      ingreso: n(x.ingreso),
    })),
  }
}

function dineroLimpio(centavos: number): string {
  const neg = centavos < 0
  const v = Math.abs(Math.round(centavos))
  const ent = String(Math.floor(v / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${neg ? '−' : ''}$${ent},${String(v % 100).padStart(2, '0')}`
}

/** "1 día 6 h" se lee mejor que "30,2 horas" cuando el carro se queda a dormir. */
function formatoHoras(horas: number): string {
  if (horas < 24) return `${horas.toFixed(1).replace('.', ',')} h`
  const dias = Math.floor(horas / 24)
  const resto = Math.round(horas % 24)
  return resto > 0 ? `${dias} d ${resto} h` : `${dias} d`
}
