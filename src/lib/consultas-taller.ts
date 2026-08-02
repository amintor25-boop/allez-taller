import { filas, loteLectura } from './db'
import { ESTADOS, antiguedad, iniciales, type Estado, type Prioridad } from './dominio'

// Consultas de las pantallas internas. Todo filtrado por demo_id, siempre.

export type Tarjeta = {
  id: string
  numero: number
  estado: Estado
  prioridad: Prioridad
  columna: number
  placa: string
  vehiculo: string
  cliente: string
  mecanico: string | null
  siglas: string | null
  servicio: string
  total: number
  antiguedad: string
  token: string
  // Señales que se pintan como distintivo en la tarjeta
  esperandoCliente: boolean
  noAutorizado: boolean
  facturada: boolean
  respondidoPor: string | null
  respondidoEn: string | null
}

/**
 * Todo el tablero en una sola consulta.
 *
 * Los subselects se resuelven dentro del motor: con Turso cada viaje de red cuesta
 * latencia, y el requisito es que nada tarde más de un segundo.
 */
export async function tableroDe(demoId: string): Promise<Tarjeta[]> {
  const r = await filas<any>(
    `SELECT o.id, o.numero, o.estado, o.prioridad, o.orden_columna, o.creada_en, o.token_publico,
            o.respondido_por, o.respondido_en,
            v.placa, v.marca, v.modelo, v.anio,
            c.nombre AS cliente, m.nombre AS mecanico,
            (SELECT i.descripcion FROM items i
              WHERE i.orden_id = o.id AND i.estado <> 'rechazado'
              ORDER BY CASE i.tipo WHEN 'hallazgo' THEN 1 ELSE 0 END, i.creado_en LIMIT 1) AS servicio,
            (SELECT COALESCE(SUM(i.precio), 0) FROM items i
              WHERE i.orden_id = o.id AND i.estado <> 'rechazado' AND i.estado <> 'propuesto') AS total,
            (SELECT COUNT(*) FROM items i WHERE i.orden_id = o.id AND i.estado = 'propuesto') AS propuestos,
            (SELECT COUNT(*) FROM items i WHERE i.orden_id = o.id AND i.estado = 'rechazado') AS rechazados,
            (SELECT COUNT(*) FROM facturas f WHERE f.orden_id = o.id) AS facturas
       FROM ordenes o
       JOIN vehiculos v ON v.id = o.vehiculo_id
       JOIN clientes c  ON c.id = o.cliente_id
  LEFT JOIN mecanicos m ON m.id = o.mecanico_id
      WHERE o.demo_id = ? AND o.archivada = 0
   ORDER BY o.estado, o.orden_columna, o.numero DESC`,
    [demoId],
  )

  // La antigüedad se calcula acá, en el servidor: si la calculara el navegador
  // podría dar un minuto distinto y React se quejaría de hidratación.
  const ahora = Date.now()

  return r.map((o) => ({
    id: o.id,
    numero: o.numero,
    estado: o.estado,
    prioridad: o.prioridad,
    columna: o.orden_columna,
    placa: o.placa,
    vehiculo: `${o.marca} ${o.modelo} · ${o.anio}`,
    cliente: o.cliente,
    mecanico: o.mecanico ?? null,
    siglas: o.mecanico ? iniciales(o.mecanico) : null,
    servicio: o.servicio ?? 'Sin servicios',
    total: o.total,
    antiguedad: antiguedad(o.creada_en, ahora),
    token: o.token_publico,
    esperandoCliente: o.propuestos > 0,
    noAutorizado: o.propuestos === 0 && o.rechazados > 0,
    facturada: o.facturas > 0,
    respondidoPor: o.respondido_por ?? null,
    respondidoEn: o.respondido_en ?? null,
  }))
}

export function porColumnas(tarjetas: Tarjeta[]): Record<Estado, Tarjeta[]> {
  const mapa = Object.fromEntries(ESTADOS.map((e) => [e, [] as Tarjeta[]])) as Record<Estado, Tarjeta[]>
  for (const t of tarjetas) mapa[t.estado]?.push(t)
  return mapa
}

// ─── Detalle de una orden ────────────────────────────────────────────────────

export type ItemOrden = {
  id: string
  tipo: string
  descripcion: string
  detalle: string
  precio: number
  estado: string
  foto_url: string | null
}

export type Movimiento = { desde: string | null; hasta: string; nota: string; creado_en: string }

export type DetalleOrden = {
  id: string
  vehiculoId: string
  numero: number
  estado: Estado
  prioridad: Prioridad
  kilometraje: number
  combustible: string
  observacion: string
  token: string
  creadaEn: string
  presupuestoEnviadoEn: string | null
  respondidoEn: string | null
  respondidoPor: string | null
  placa: string
  marca: string
  modelo: string
  anio: number
  color: string
  cliente: string
  telefonoCliente: string
  cedulaCliente: string
  mecanico: string | null
  fotoIngreso: string | null
  items: ItemOrden[]
  movimientos: Movimiento[]
  factura: { numero: string; clave_acceso: string; subtotal: number; iva: number; total: number; emitida_en: string } | null
}

export async function ordenDe(demoId: string, ordenId: string): Promise<DetalleOrden | null> {
  const [cab, items, movs, facts, ingreso] = await loteLectura([
    {
      sql: `SELECT o.*, v.placa, v.marca, v.modelo, v.anio, v.color,
                   c.nombre AS cliente, c.telefono, c.cedula, m.nombre AS mecanico
              FROM ordenes o
              JOIN vehiculos v ON v.id = o.vehiculo_id
              JOIN clientes c  ON c.id = o.cliente_id
         LEFT JOIN mecanicos m ON m.id = o.mecanico_id
             WHERE o.demo_id = ? AND o.id = ?`,
      args: [demoId, ordenId],
    },
    {
      sql: `SELECT i.id, i.tipo, i.descripcion, i.detalle, i.precio, i.estado,
                   COALESCE(f.ruta_estatica, CASE WHEN i.foto_id IS NULL THEN NULL ELSE '/api/foto/' || i.foto_id END) AS foto_url
              FROM items i
         LEFT JOIN fotos f ON f.id = i.foto_id
             WHERE i.demo_id = ? AND i.orden_id = ?
          ORDER BY CASE i.tipo WHEN 'hallazgo' THEN 1 ELSE 0 END, i.creado_en`,
      args: [demoId, ordenId],
    },
    {
      sql: `SELECT desde, hasta, nota, creado_en FROM movimientos
             WHERE demo_id = ? AND orden_id = ? ORDER BY creado_en`,
      args: [demoId, ordenId],
    },
    {
      sql: `SELECT numero, clave_acceso, subtotal, iva, total, emitida_en FROM facturas
             WHERE demo_id = ? AND orden_id = ?`,
      args: [demoId, ordenId],
    },
    {
      // La foto que se tomó en recepción: cuelga de la orden y no de ningún renglón.
      sql: `SELECT id FROM fotos
             WHERE demo_id = ? AND orden_id = ?
               AND id NOT IN (SELECT foto_id FROM items WHERE foto_id IS NOT NULL)
             LIMIT 1`,
      args: [demoId, ordenId],
    },
  ])

  const o = cab[0] as Record<string, any> | undefined
  if (!o) return null

  return {
    id: o.id,
    vehiculoId: o.vehiculo_id,
    numero: o.numero,
    estado: o.estado,
    prioridad: o.prioridad,
    kilometraje: o.kilometraje,
    combustible: o.combustible,
    observacion: o.observacion,
    token: o.token_publico,
    creadaEn: o.creada_en,
    presupuestoEnviadoEn: o.presupuesto_enviado_en,
    respondidoEn: o.respondido_en,
    respondidoPor: o.respondido_por,
    placa: o.placa,
    marca: o.marca,
    modelo: o.modelo,
    anio: o.anio,
    color: o.color,
    cliente: o.cliente,
    telefonoCliente: o.telefono,
    cedulaCliente: o.cedula,
    mecanico: o.mecanico ?? null,
    fotoIngreso: (ingreso[0] as any)?.id ? `/api/foto/${(ingreso[0] as any).id}` : null,
    items: items as unknown as ItemOrden[],
    movimientos: movs as unknown as Movimiento[],
    factura: (facts[0] as any) ?? null,
  }
}

// ─── Recepción por placa ─────────────────────────────────────────────────────

export type VisitaHistorial = {
  id: string
  numero: number
  fecha: string
  servicios: string
  total: number
  facturada: boolean
}

export type FichaVehiculo = {
  vehiculoId: string
  placa: string
  marca: string
  modelo: string
  anio: number
  color: string
  kilometraje: number
  cliente: string
  telefono: string
  cedula: string
  ordenAbierta: { id: string; numero: number; estado: Estado } | null
  historial: VisitaHistorial[]
}

export type Coincidencia = { placa: string; marca: string; modelo: string; cliente: string }

/**
 * Busca por placa. Devuelve la ficha completa si hay coincidencia exacta y, si no,
 * las placas que empiezan igual — para que escribir de memoria no termine en nada.
 */
export async function buscarPlaca(
  demoId: string,
  placa: string,
): Promise<{ ficha: FichaVehiculo | null; coincidencias: Coincidencia[] }> {
  const limpia = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase()
  if (limpia.length < 3) return { ficha: null, coincidencias: [] }

  const [exactas, parecidas] = await loteLectura([
    {
      sql: `SELECT v.id, v.placa, v.marca, v.modelo, v.anio, v.color, v.kilometraje,
                   c.nombre AS cliente, c.telefono, c.cedula
              FROM vehiculos v JOIN clientes c ON c.id = v.cliente_id
             WHERE v.demo_id = ? AND REPLACE(v.placa, '-', '') = ?`,
      args: [demoId, limpia],
    },
    {
      sql: `SELECT v.placa, v.marca, v.modelo, c.nombre AS cliente
              FROM vehiculos v JOIN clientes c ON c.id = v.cliente_id
             WHERE v.demo_id = ? AND REPLACE(v.placa, '-', '') LIKE ? || '%'
             ORDER BY v.placa LIMIT 6`,
      args: [demoId, limpia],
    },
  ])

  const v = exactas[0] as Record<string, any> | undefined
  if (!v) return { ficha: null, coincidencias: parecidas as unknown as Coincidencia[] }

  const [abiertas, visitas] = await loteLectura([
    {
      sql: `SELECT id, numero, estado FROM ordenes
             WHERE demo_id = ? AND vehiculo_id = ? AND archivada = 0
             ORDER BY creada_en DESC LIMIT 1`,
      args: [demoId, v.id],
    },
    {
      sql: `SELECT o.id, o.numero, o.creada_en,
                   (SELECT GROUP_CONCAT(i.descripcion, ', ') FROM items i
                     WHERE i.orden_id = o.id AND i.estado <> 'rechazado') AS servicios,
                   (SELECT COALESCE(SUM(i.precio), 0) FROM items i
                     WHERE i.orden_id = o.id AND i.estado <> 'rechazado' AND i.estado <> 'propuesto') AS total,
                   (SELECT COUNT(*) FROM facturas f WHERE f.orden_id = o.id) AS facturas
              FROM ordenes o
             WHERE o.demo_id = ? AND o.vehiculo_id = ? AND o.archivada = 1
             ORDER BY o.creada_en DESC LIMIT 6`,
      args: [demoId, v.id],
    },
  ])

  return {
    ficha: {
      vehiculoId: v.id,
      placa: v.placa,
      marca: v.marca,
      modelo: v.modelo,
      anio: v.anio,
      color: v.color,
      kilometraje: v.kilometraje,
      cliente: v.cliente,
      telefono: v.telefono,
      cedula: v.cedula,
      ordenAbierta: (abiertas[0] as any) ?? null,
      historial: (visitas as any[]).map((h) => ({
        id: h.id,
        numero: h.numero,
        fecha: h.creada_en,
        servicios: h.servicios ?? '',
        total: h.total,
        facturada: h.facturas > 0,
      })),
    },
    coincidencias: parecidas as unknown as Coincidencia[],
  }
}
