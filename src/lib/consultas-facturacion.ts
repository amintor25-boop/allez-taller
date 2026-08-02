import { filas, loteLectura } from './db'
import { numeroFactura } from './sri'

// Facturación: rangos, filtros, búsqueda, orden y paginación.
//
// Los límites de cada rango se calculan en JavaScript y se comparan contra el
// instante guardado. Ecuador es UTC-5 fijo, así que un comprobante emitido a las
// 20:00 del 31 pertenece al 31 y no al 1 del mes siguiente — que es justo lo que
// el contador espera y lo que una comparación ingenua en UTC se lleva por delante.

const DESFASE = 5 * 60 * 60 * 1000

export const POR_PAGINA = 25

export type EstadoFactura = 'autorizada' | 'anulada' | 'nota_credito'

export const ESTADOS_FACTURA: { clave: 'todas' | EstadoFactura; etiqueta: string }[] = [
  { clave: 'todas', etiqueta: 'Todas' },
  { clave: 'autorizada', etiqueta: 'Autorizadas' },
  { clave: 'anulada', etiqueta: 'Anuladas' },
  { clave: 'nota_credito', etiqueta: 'Notas de crédito' },
]

export const RANGOS = [
  { clave: 'hoy', etiqueta: 'Hoy' },
  { clave: 'semana', etiqueta: 'Esta semana' },
  { clave: 'mes', etiqueta: 'Este mes' },
  { clave: 'anio', etiqueta: 'Este año' },
] as const

export type ClaveOrden = 'fecha' | 'cliente' | 'total'

export type Comprobante = {
  id: string
  ordenId: string
  numero: string
  claveAcceso: string
  estado: EstadoFactura
  subtotal: number
  iva: number
  total: number
  emitidaEn: string
  cliente: string
  cedula: string
  placa: string
  vehiculo: string
}

export type Mes = { clave: string; etiqueta: string }

export type Consulta = {
  rango: string
  estado: string
  q: string
  orden: ClaveOrden
  dir: 'asc' | 'desc'
  pagina: number
}

export type Resultado = {
  consulta: Consulta
  etiqueta: string
  etiquetaAnterior: string
  meses: Mes[]
  comprobantes: Comprobante[]
  // Totales de TODO el rango filtrado, no solo de la página
  subtotal: number
  iva: number
  total: number
  emitidos: number
  anulados: number
  ticketPromedio: number
  totalAnterior: number
  variacion: number | null
  comparacionParcial: boolean
  filas: number
  paginas: number
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function etiquetaMes(clave: string): string {
  const [anio, mes] = clave.split('-')
  return `${MESES[Number(mes) - 1] ?? '—'} de ${anio}`
}

/** Ahora, visto con el reloj de Ecuador. */
function ahoraLocal(): Date {
  return new Date(Date.now() - DESFASE)
}

/** Una fecha local (Y/M/D en Ecuador) devuelta como instante real en ISO. */
function aInstante(anio: number, mes: number, dia: number): string {
  return new Date(Date.UTC(anio, mes, dia) + DESFASE).toISOString()
}

type Ventana = {
  desde: string
  hasta: string
  anteriorDesde: string
  anteriorHasta: string
  etiqueta: string
  etiquetaAnterior: string
  /** El período todavía no termina: la comparación va contra los mismos días. */
  parcial?: boolean
}

function ventanaDe(rango: string): Ventana {
  const hoy = ahoraLocal()
  const a = hoy.getUTCFullYear()
  const m = hoy.getUTCMonth()
  const d = hoy.getUTCDate()

  // El mes tiene que ser un mes de verdad: `2099-13` pasaba la expresión regular
  // y Date.UTC lo desbordaba al año siguiente sin avisar, con el rótulo
  // "undefined de 2099" impreso encima.
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(rango)) {
    const [anio, mes] = rango.split('-').map(Number)
    return {
      desde: aInstante(anio, mes - 1, 1),
      hasta: aInstante(anio, mes, 1),
      anteriorDesde: aInstante(anio, mes - 2, 1),
      anteriorHasta: aInstante(anio, mes - 1, 1),
      etiqueta: etiquetaMes(rango),
      etiquetaAnterior: etiquetaMes(
        `${mes === 1 ? anio - 1 : anio}-${String(mes === 1 ? 12 : mes - 1).padStart(2, '0')}`,
      ),
    }
  }

  if (rango === 'hoy') {
    return {
      desde: aInstante(a, m, d),
      hasta: aInstante(a, m, d + 1),
      anteriorDesde: aInstante(a, m, d - 1),
      anteriorHasta: aInstante(a, m, d),
      etiqueta: 'hoy',
      etiquetaAnterior: 'ayer',
    }
  }

  if (rango === 'semana') {
    // La semana del taller empieza el lunes.
    const lunes = d - ((hoy.getUTCDay() + 6) % 7)
    return {
      desde: aInstante(a, m, lunes),
      hasta: aInstante(a, m, lunes + 7),
      anteriorDesde: aInstante(a, m, lunes - 7),
      anteriorHasta: aInstante(a, m, lunes),
      etiqueta: 'esta semana',
      etiquetaAnterior: 'la semana pasada',
    }
  }

  // El período en curso se compara contra los MISMOS DÍAS transcurridos del
  // anterior. Medir dos días de agosto contra un julio completo daría "−81 %",
  // que es cierto y a la vez completamente inútil: lo primero que vería el dueño
  // sería una caída que no existe.
  if (rango === 'anio') {
    return {
      desde: aInstante(a, 0, 1),
      hasta: aInstante(a + 1, 0, 1),
      anteriorDesde: aInstante(a - 1, 0, 1),
      anteriorHasta: aInstante(a - 1, m, d + 1),
      etiqueta: String(a),
      etiquetaAnterior: `${a - 1} a la misma fecha`,
      parcial: true,
    }
  }

  // Por omisión, el mes en curso.
  return {
    desde: aInstante(a, m, 1),
    hasta: aInstante(a, m + 1, 1),
    anteriorDesde: aInstante(a, m - 1, 1),
    anteriorHasta: aInstante(a, m - 1, d + 1),
    parcial: true,
    etiqueta: etiquetaMes(`${a}-${String(m + 1).padStart(2, '0')}`),
    etiquetaAnterior: etiquetaMes(
      `${m === 0 ? a - 1 : a}-${String(m === 0 ? 12 : m).padStart(2, '0')}`,
    ),
  }
}

const COLUMNAS: Record<ClaveOrden, string> = {
  fecha: 'f.emitida_en',
  cliente: 'c.nombre',
  total: 'f.total',
}

export async function buscarComprobantes(
  demoId: string,
  pedido: Partial<Consulta>,
): Promise<Resultado> {
  const consulta: Consulta = {
    rango: pedido.rango || 'mes',
    estado: ESTADOS_FACTURA.some((e) => e.clave === pedido.estado) ? pedido.estado! : 'todas',
    q: (pedido.q ?? '').trim().slice(0, 40),
    orden: (['fecha', 'cliente', 'total'] as const).includes(pedido.orden as ClaveOrden)
      ? (pedido.orden as ClaveOrden)
      : 'fecha',
    dir: pedido.dir === 'asc' ? 'asc' : 'desc',
    // Entero y acotado. Sin `Math.trunc`, un `?pagina=12.5` acababa como
    // `OFFSET 12.5` dentro del SQL, SQLite lo rechazaba y la pantalla devolvía
    // un 500. Igual con `Infinity` y con `1e400`.
    pagina: Math.max(1, Math.min(10_000, Math.trunc(Number(pedido.pagina)) || 1)),
  }

  const v = ventanaDe(consulta.rango)

  const filtros: string[] = ['f.demo_id = ?', 'f.emitida_en >= ?', 'f.emitida_en < ?']
  const args: (string | number)[] = [demoId, v.desde, v.hasta]

  if (consulta.estado !== 'todas') {
    filtros.push('f.estado = ?')
    args.push(consulta.estado)
  }

  if (consulta.q) {
    // Un solo campo que busca por placa, cliente o número de comprobante.
    //
    // Van tres `?` posicionales y el término repetido tres veces. Mezclar `?`
    // con `?1` numerados hace que `?1` apunte al PRIMER argumento de toda la
    // lista —el demo_id— y la búsqueda no devuelve jamás nada.
    // La placa se compara SIN guion a los dos lados, igual que en Recepción:
    // quien escribe "PBX1234" está buscando el mismo carro que "PBX-1234".
    //
    // Y los comodines del LIKE van escapados: un `%` escrito en el buscador es
    // un texto que se busca, no "todo".
    filtros.push(
      `(REPLACE(UPPER(v.placa), '-', '') LIKE ? ESCAPE '\\'` +
      ` OR UPPER(c.nombre) LIKE ? ESCAPE '\\'` +
      ` OR f.numero LIKE ? ESCAPE '\\')`,
    )
    const escapado = consulta.q.toUpperCase().replace(/[\\%_]/g, (c) => `\\${c}`)
    args.push(`%${escapado.replace(/-/g, '')}%`, `%${escapado}%`, `%${escapado}%`)
  }

  const donde = filtros.join(' AND ')
  const desde = `FROM facturas f
                   JOIN ordenes o   ON o.id = f.orden_id
                   JOIN vehiculos v ON v.id = o.vehiculo_id
                   JOIN clientes c  ON c.id = o.cliente_id
                  WHERE ${donde}`

  const sqlPagina = (nPagina: number) => `SELECT f.id, f.orden_id, f.numero, f.clave_acceso, f.estado,
                   f.subtotal, f.iva, f.total, f.emitida_en,
                   c.nombre AS cliente, c.cedula, v.placa, v.marca, v.modelo, v.anio
            ${desde}
            ORDER BY ${COLUMNAS[consulta.orden]} ${consulta.dir === 'asc' ? 'ASC' : 'DESC'}, f.emitida_en DESC
            LIMIT ${POR_PAGINA} OFFSET ${(nPagina - 1) * POR_PAGINA}`

  const [resumen, pagina, anterior, meses] = await loteLectura([
    {
      sql: `SELECT COUNT(*) AS filas,
                   SUM(CASE WHEN f.estado <> 'anulada' THEN 1 ELSE 0 END) AS emitidos,
                   SUM(CASE WHEN f.estado =  'anulada' THEN 1 ELSE 0 END) AS anulados,
                   COALESCE(SUM(CASE WHEN f.estado <> 'anulada' THEN f.subtotal ELSE 0 END), 0) AS subtotal,
                   COALESCE(SUM(CASE WHEN f.estado <> 'anulada' THEN f.iva      ELSE 0 END), 0) AS iva,
                   COALESCE(SUM(CASE WHEN f.estado <> 'anulada' THEN f.total    ELSE 0 END), 0) AS total
            ${desde}`,
      args,
    },
    { sql: sqlPagina(consulta.pagina), args },
    {
      // El período anterior se mide CON LOS MISMOS FILTROS que la tabla. Si no,
      // cualquier búsqueda o filtro de estado se compara contra el mes anterior
      // entero y sale una caída porcentual inventada.
      // Los mismos JOIN y los mismos filtros que la tabla, cambiando solo la
      // ventana de fechas: los tres primeros argumentos son demo y fechas.
      sql: `SELECT COALESCE(SUM(CASE WHEN f.estado <> 'anulada' THEN f.total ELSE 0 END), 0) AS total
              ${desde}`,
      args: [demoId, v.anteriorDesde, v.anteriorHasta, ...args.slice(3)],
    },
    {
      sql: `SELECT DISTINCT strftime('%Y-%m', datetime(emitida_en, '-5 hours')) AS clave
              FROM facturas WHERE demo_id = ? ORDER BY clave DESC LIMIT 24`,
      args: [demoId],
    },
  ])

  const r = resumen[0] as any
  const total = Number(r?.total ?? 0)
  const totalAnterior = Number((anterior[0] as any)?.total ?? 0)
  const emitidos = Number(r?.emitidos ?? 0)
  const nFilas = Number(r?.filas ?? 0)
  const paginas = Math.max(1, Math.ceil(nFilas / POR_PAGINA))

  // Una página que no existe cae en la última que sí, y se vuelve a pedir. No
  // basta con corregir el número: la consulta ya salió con el desplazamiento
  // malo y la lista vendría vacía, con el mensaje de "no hay comprobantes en
  // este rango" mientras la tarjeta de totales sigue enseñando el mes entero y
  // el contador imprime aritmética imposible: "1001–1000 de 632".
  //
  // El viaje extra solo ocurre cuando alguien pide una página inexistente.
  let comprobantes = pagina as any[]
  if (consulta.pagina > paginas) {
    consulta.pagina = paginas
    comprobantes = await filas(sqlPagina(paginas), args)
  }

  return {
    consulta,
    etiqueta: v.etiqueta,
    etiquetaAnterior: v.etiquetaAnterior,
    meses: (meses as any[]).map((m) => ({ clave: m.clave, etiqueta: etiquetaMes(m.clave) })),
    comprobantes: comprobantes.map((f) => ({
      id: f.id,
      ordenId: f.orden_id,
      numero: f.numero,
      claveAcceso: f.clave_acceso,
      estado: f.estado,
      subtotal: Number(f.subtotal),
      iva: Number(f.iva),
      total: Number(f.total),
      emitidaEn: f.emitida_en,
      cliente: f.cliente,
      cedula: f.cedula,
      placa: f.placa,
      vehiculo: `${f.marca} ${f.modelo} ${f.anio}`,
    })),
    subtotal: Number(r?.subtotal ?? 0),
    iva: Number(r?.iva ?? 0),
    total,
    emitidos,
    anulados: Number(r?.anulados ?? 0),
    ticketPromedio: emitidos > 0 ? Math.round(total / emitidos) : 0,
    totalAnterior,
    variacion: totalAnterior > 0 ? Math.round(((total - totalAnterior) / totalAnterior) * 100) : null,
    comparacionParcial: Boolean(v.parcial),
    filas: nFilas,
    paginas,
  }
}

/**
 * Un mes entero, sin paginar. Lo usan el cierre imprimible y la exportación a
 * CSV, donde partir en páginas no tendría ningún sentido.
 */
export async function cierreMensual(demoId: string, mes?: string) {
  const clave = /^\d{4}-\d{2}$/.test(mes ?? '') ? mes! : mesActual()
  const primera = await buscarComprobantes(demoId, { rango: clave, estado: 'todas', pagina: 1 })

  const todas = await filas<any>(
    `SELECT f.id, f.orden_id, f.numero, f.clave_acceso, f.estado, f.subtotal, f.iva, f.total, f.emitida_en,
            c.nombre AS cliente, c.cedula, v.placa, v.marca, v.modelo, v.anio
       FROM facturas f
       JOIN ordenes o   ON o.id = f.orden_id
       JOIN vehiculos v ON v.id = o.vehiculo_id
       JOIN clientes c  ON c.id = o.cliente_id
      WHERE f.demo_id = ? AND strftime('%Y-%m', datetime(f.emitida_en, '-5 hours')) = ?
   ORDER BY f.emitida_en DESC`,
    [demoId, clave],
  )

  // ── Rango de secuenciales y saltos ────────────────────────────────────────
  //
  // Es lo primero que revisa un contador de un cierre, porque un secuencial que
  // falta es una sanción del SRI. Que el sistema lo declare solo le ahorra la
  // revisión — y si algún día faltara de verdad, lo dice en vez de esconderlo.
  const secuenciales = todas
    .map((f: any) => Number(String(f.numero).split('-')[2]))
    .filter((n: number) => Number.isFinite(n))
    .sort((a: number, b: number) => a - b)

  const faltantes: number[] = []
  for (let i = 1; i < secuenciales.length; i++) {
    for (let n = secuenciales[i - 1] + 1; n < secuenciales[i]; n++) faltantes.push(n)
  }

  // ── Cuadre ────────────────────────────────────────────────────────────────
  //
  // El resumen excluía las anuladas en silencio mientras la tabla las enseñaba
  // tachadas: los dos bloques no cuadraban a la vista, que es exactamente lo que
  // un contador señala con el dedo. Aquí la resta va escrita.
  const cuenta = (e: string) => todas.filter((f: any) => f.estado === e).length
  const suma = (e: string) =>
    todas.filter((f: any) => f.estado === e).reduce((s: number, f: any) => s + Number(f.total), 0)

  return {
    mes: clave,
    etiqueta: etiquetaMes(clave),
    secuencialDesde: secuenciales.length ? numeroFactura(secuenciales[0]) : null,
    secuencialHasta: secuenciales.length ? numeroFactura(secuenciales[secuenciales.length - 1]) : null,
    faltantes: faltantes.map((n) => numeroFactura(n)),
    cuadre: {
      autorizadas: cuenta('autorizada'),
      totalAutorizadas: suma('autorizada'),
      anuladas: cuenta('anulada'),
      totalAnuladas: suma('anulada'),
      notas: cuenta('nota_credito'),
      totalNotas: suma('nota_credito'),
    },
    subtotal: primera.subtotal,
    iva: primera.iva,
    total: primera.total,
    emitidos: primera.emitidos,
    anulados: primera.anulados,
    ticketPromedio: primera.ticketPromedio,
    totalAnterior: primera.totalAnterior,
    variacion: primera.variacion,
    comprobantes: todas.map((f): Comprobante => ({
      id: f.id,
      ordenId: f.orden_id,
      numero: f.numero,
      claveAcceso: f.clave_acceso,
      estado: f.estado as EstadoFactura,
      subtotal: Number(f.subtotal),
      iva: Number(f.iva),
      total: Number(f.total),
      emitidaEn: f.emitida_en,
      cliente: f.cliente,
      cedula: f.cedula,
      placa: f.placa,
      vehiculo: `${f.marca} ${f.modelo} ${f.anio}`,
    })),
  }
}

/** Mes en curso en Ecuador, en formato AAAA-MM. */
export function mesActual(): string {
  const d = ahoraLocal()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}
