import { loteLectura } from './db'
import type { Estado, EstadoItem, Prioridad, TipoItem } from './dominio'

// Vista pública de una orden: lo único que necesita la página que abre el dueño
// del carro. Nunca incluye el base64 de las fotos — solo su id, que se sirve
// aparte por /api/foto/[id] con caché.

export type ItemPublico = {
  id: string
  tipo: TipoItem
  descripcion: string
  detalle: string
  precio: number
  estado: EstadoItem
  foto_id: string | null
  foto_ruta: string | null
}

export type OrdenPublica = {
  ordenId: string
  demoId: string
  numero: number
  estado: Estado
  prioridad: Prioridad
  token: string
  presupuestoEnviadoEn: string | null
  respondidoEn: string | null
  respondidoPor: string | null
  taller: string
  telefonoTaller: string | null
  ciudad: string
  placa: string
  marca: string
  modelo: string
  anio: number
  color: string
  cliente: string
  mecanico: string | null
  items: ItemPublico[]
  factura: { numero: string; total: number; emitida_en: string } | null
}

export async function ordenPorToken(token: string): Promise<OrdenPublica | null> {
  const [cabeceras, items, facturas] = await loteLectura([
    {
      sql: `SELECT o.id, o.demo_id, o.numero, o.estado, o.prioridad, o.token_publico,
                   o.presupuesto_enviado_en, o.respondido_en, o.respondido_por,
                   d.taller_nombre, d.telefono, d.ciudad,
                   v.placa, v.marca, v.modelo, v.anio, v.color,
                   c.nombre AS cliente, m.nombre AS mecanico
              FROM ordenes o
              JOIN demos d      ON d.id = o.demo_id
              JOIN vehiculos v  ON v.id = o.vehiculo_id
              JOIN clientes c   ON c.id = o.cliente_id
         LEFT JOIN mecanicos m  ON m.id = o.mecanico_id
             WHERE o.token_publico = ?`,
      args: [token],
    },
    {
      sql: `SELECT i.id, i.tipo, i.descripcion, i.detalle, i.precio, i.estado, i.foto_id,
                   f.ruta_estatica AS foto_ruta
              FROM items i
              JOIN ordenes o ON o.id = i.orden_id
         LEFT JOIN fotos f   ON f.id = i.foto_id
             WHERE o.token_publico = ?
             ORDER BY CASE i.estado WHEN 'propuesto' THEN 0 ELSE 1 END, i.creado_en`,
      args: [token],
    },
    {
      sql: `SELECT f.numero, f.total, f.emitida_en FROM facturas f
              JOIN ordenes o ON o.id = f.orden_id
             WHERE o.token_publico = ?`,
      args: [token],
    },
  ])

  const c = cabeceras[0] as Record<string, any> | undefined
  if (!c) return null

  return {
    ordenId: c.id,
    demoId: c.demo_id,
    numero: c.numero,
    estado: c.estado,
    prioridad: c.prioridad,
    token: c.token_publico,
    presupuestoEnviadoEn: c.presupuesto_enviado_en,
    respondidoEn: c.respondido_en,
    respondidoPor: c.respondido_por,
    taller: c.taller_nombre,
    telefonoTaller: c.telefono,
    ciudad: c.ciudad,
    placa: c.placa,
    marca: c.marca,
    modelo: c.modelo,
    anio: c.anio,
    color: c.color,
    cliente: c.cliente,
    mecanico: c.mecanico ?? null,
    items: items as unknown as ItemPublico[],
    factura: (facturas[0] as any) ?? null,
  }
}

/** Lo que el dueño del carro tiene que decidir: los renglones aún sin respuesta. */
export function propuestos(o: OrdenPublica): ItemPublico[] {
  return o.items.filter((i) => i.estado === 'propuesto')
}

export function totalPropuesto(o: OrdenPublica): number {
  return propuestos(o).reduce((s, i) => s + i.precio, 0)
}

export function totalAprobado(o: OrdenPublica): number {
  return o.items.filter((i) => i.estado !== 'rechazado' && i.estado !== 'propuesto').reduce((s, i) => s + i.precio, 0)
}
