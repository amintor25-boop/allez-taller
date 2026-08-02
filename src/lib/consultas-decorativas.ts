import { filas, loteLectura } from './db'
import { antiguedad, fechaCorta, hora, iniciales, type Estado } from './dominio'

// Consultas de las pantallas de apoyo.
//
// Estas pantallas no necesitaban lógica real, pero se alimentan de la misma
// semilla que el tablero a propósito: si el inventario dijera que hay 8 juegos de
// pastillas y el tablero acabara de vender el último, el prospecto lo notaría.
// Datos reales cuestan lo mismo y no se contradicen nunca.

// ─── Inventario ──────────────────────────────────────────────────────────────

export type MovimientoStock = { id: string; cantidad: number; motivo: string; cuando: string }

export type Repuesto = {
  id: string
  codigo: string
  nombre: string
  categoria: string
  stock: number
  stock_minimo: number
  precio: number
  ubicacion: string
  /** Falso cuando lo dio de alta el prospecto: eso sobrevive al reinicio. */
  sembrada: boolean
  movimientos: MovimientoStock[]
}

export async function inventarioDe(demoId: string): Promise<Repuesto[]> {
  // Los movimientos vienen en la misma ida a la base y se reparten en memoria:
  // una consulta por repuesto serían quince viajes contra Turso.
  const [piezas, movs] = await loteLectura([
    {
      sql: `SELECT id, codigo, nombre, categoria, stock, stock_minimo, precio, ubicacion, sembrada
              FROM inventario WHERE demo_id = ? ORDER BY categoria, nombre`,
      args: [demoId],
    },
    {
      sql: `SELECT id, repuesto_id, cantidad, motivo, creado_en
              FROM movimientos_stock WHERE demo_id = ? ORDER BY creado_en DESC LIMIT 200`,
      args: [demoId],
    },
  ])

  const porPieza = new Map<string, MovimientoStock[]>()
  for (const m of movs as any[]) {
    const lista = porPieza.get(m.repuesto_id) ?? []
    if (lista.length < 6) {
      lista.push({
        id: m.id,
        cantidad: Number(m.cantidad),
        motivo: m.motivo,
        cuando: `${fechaCorta(m.creado_en)} · ${hora(m.creado_en)}`,
      })
      porPieza.set(m.repuesto_id, lista)
    }
  }

  return (piezas as any[]).map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    categoria: p.categoria,
    stock: Number(p.stock),
    stock_minimo: Number(p.stock_minimo),
    precio: Number(p.precio),
    ubicacion: p.ubicacion,
    sembrada: Number(p.sembrada) === 1,
    movimientos: porPieza.get(p.id) ?? [],
  }))
}

// ─── Agenda ──────────────────────────────────────────────────────────────────

export type Cita = {
  id: string
  vehiculoId: string | null
  dia: number
  hora: string
  placa: string
  cliente: string
  servicio: string
  /** Cuánto dura el trabajo. Es lo que da altura a la cita en el riel. */
  horas: number
  mecanico: string | null
  siglas: string | null
}

export async function agendaDe(demoId: string): Promise<Cita[]> {
  const r = await filas<any>(
    `SELECT c.id, c.dia, c.hora, c.placa, c.cliente, c.servicio, c.horas, m.nombre AS mecanico,
            v.id AS vehiculo_id
       FROM citas c
  LEFT JOIN mecanicos m ON m.id = c.mecanico_id
  LEFT JOIN vehiculos v ON v.demo_id = c.demo_id AND v.placa = c.placa
      WHERE c.demo_id = ? ORDER BY c.dia, c.hora`,
    [demoId],
  )
  return r.map((c) => ({
    ...c,
    vehiculoId: c.vehiculo_id ?? null,
    horas: Number(c.horas) || 1,
    siglas: c.mecanico ? iniciales(c.mecanico) : null,
  }))
}

// ─── Ficha del vehículo ──────────────────────────────────────────────────────

export type PasoHistoria = {
  ordenId: string
  numero: number
  estado: Estado
  archivada: boolean
  fecha: string
  antiguedad: string
  kilometraje: number
  servicios: string
  total: number
  mecanico: string | null
  factura: string | null
}

export type FichaCompleta = {
  id: string
  placa: string
  marca: string
  modelo: string
  anio: number
  color: string
  kilometraje: number
  cliente: string
  telefono: string
  cedula: string
  historia: PasoHistoria[]
  totalGastado: number
}

export async function vehiculoDe(demoId: string, vehiculoId: string): Promise<FichaCompleta | null> {
  const [cab, ordenes] = await loteLectura([
    {
      sql: `SELECT v.*, c.nombre AS cliente, c.telefono, c.cedula
              FROM vehiculos v JOIN clientes c ON c.id = v.cliente_id
             WHERE v.demo_id = ? AND v.id = ?`,
      args: [demoId, vehiculoId],
    },
    {
      sql: `SELECT o.id, o.numero, o.estado, o.archivada, o.creada_en, o.kilometraje,
                   m.nombre AS mecanico,
                   (SELECT GROUP_CONCAT(i.descripcion, ', ') FROM items i
                     WHERE i.orden_id = o.id AND i.estado <> 'rechazado') AS servicios,
                   (SELECT COALESCE(SUM(i.precio), 0) FROM items i
                     WHERE i.orden_id = o.id AND i.estado <> 'rechazado' AND i.estado <> 'propuesto') AS total,
                   (SELECT f.numero FROM facturas f WHERE f.orden_id = o.id) AS factura
              FROM ordenes o LEFT JOIN mecanicos m ON m.id = o.mecanico_id
             WHERE o.demo_id = ? AND o.vehiculo_id = ?
          ORDER BY o.creada_en DESC`,
      args: [demoId, vehiculoId],
    },
  ])

  const v = cab[0] as Record<string, any> | undefined
  if (!v) return null

  const ahora = Date.now()
  const historia: PasoHistoria[] = (ordenes as any[]).map((o) => ({
    ordenId: o.id,
    numero: o.numero,
    estado: o.estado,
    archivada: Boolean(o.archivada),
    fecha: o.creada_en,
    antiguedad: antiguedad(o.creada_en, ahora),
    kilometraje: o.kilometraje,
    servicios: o.servicios ?? 'Sin servicios',
    total: Number(o.total),
    mecanico: o.mecanico ?? null,
    factura: o.factura ?? null,
  }))

  return {
    id: v.id,
    placa: v.placa,
    marca: v.marca,
    modelo: v.modelo,
    anio: v.anio,
    color: v.color,
    kilometraje: v.kilometraje,
    cliente: v.cliente,
    telefono: v.telefono,
    cedula: v.cedula,
    historia,
    totalGastado: historia.reduce((s, h) => s + h.total, 0),
  }
}

/** Para llegar al vehículo desde una orden. */
export async function vehiculoDeOrden(demoId: string, ordenId: string): Promise<string | null> {
  const r = await filas<{ vehiculo_id: string }>(
    `SELECT vehiculo_id FROM ordenes WHERE demo_id = ? AND id = ?`,
    [demoId, ordenId],
  )
  return r[0]?.vehiculo_id ?? null
}
