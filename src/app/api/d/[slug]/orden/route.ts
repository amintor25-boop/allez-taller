import { NextResponse } from 'next/server'
import { ahora, fila, lote } from '@/lib/db'
import { buscarDemo, registrarEvento, tocarActividad } from '@/lib/demos'
import { COMBUSTIBLES, normalizarPlaca, placaValida, token as generarId } from '@/lib/dominio'

// Crea una orden desde Recepción. Si la placa no existía, da de alta el vehículo
// y su dueño en la misma operación: escribir la placa dos veces sería absurdo.

const MAX_FOTO = 220_000 // caracteres de base64 ≈ 165 KB de imagen

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  let cuerpo: any
  try {
    cuerpo = await req.json()
  } catch {
    return NextResponse.json({ error: 'cuerpo ilegible' }, { status: 400 })
  }

  const demo = await buscarDemo(slug)
  if (!demo) return NextResponse.json({ error: 'demo inexistente' }, { status: 404 })

  const placa = normalizarPlaca(String(cuerpo.placa ?? ''))
  if (!placaValida(placa)) {
    return NextResponse.json({ error: 'La placa debe tener el formato PBX-1234' }, { status: 400 })
  }

  const kilometraje = Math.max(0, Math.round(Number(cuerpo.kilometraje) || 0))
  const combustible = COMBUSTIBLES.includes(cuerpo.combustible) ? cuerpo.combustible : '1/2'
  const observacion = String(cuerpo.observacion ?? '').trim().slice(0, 500)

  const t = ahora()
  const sentencias: { sql: string; args: (string | number | null)[] }[] = []

  // ── Vehículo: el que ya existe, o uno nuevo ───────────────────────────────
  let vehiculo = await fila<{ id: string; cliente_id: string }>(
    `SELECT id, cliente_id FROM vehiculos WHERE demo_id = ? AND placa = ?`,
    [demo.id, placa],
  )

  let vehiculoId: string
  let clienteId: string

  if (vehiculo) {
    vehiculoId = vehiculo.id
    clienteId = vehiculo.cliente_id
    // El kilometraje del vehículo avanza, nunca retrocede por un dedazo.
    sentencias.push({
      sql: `UPDATE vehiculos SET kilometraje = MAX(kilometraje, ?) WHERE demo_id = ? AND id = ?`,
      args: [kilometraje, demo.id, vehiculoId],
    })
  } else {
    const nuevo = cuerpo.vehiculoNuevo ?? {}
    const marca = String(nuevo.marca ?? '').trim()
    const modelo = String(nuevo.modelo ?? '').trim()
    const cliente = String(nuevo.cliente ?? '').trim()
    if (!marca || !modelo || !cliente) {
      return NextResponse.json(
        { error: 'Faltan la marca, el modelo o el nombre del dueño' },
        { status: 400 },
      )
    }
    vehiculoId = `v_${generarId(10)}`
    clienteId = `c_${generarId(10)}`

    sentencias.push({
      sql: `INSERT INTO clientes (id, demo_id, nombre, telefono, cedula, correo)
            VALUES (?, ?, ?, ?, '', NULL)`,
      args: [clienteId, demo.id, cliente, String(nuevo.telefono ?? '').trim()],
    })
    sentencias.push({
      sql: `INSERT INTO vehiculos (id, demo_id, cliente_id, placa, marca, modelo, anio, color, kilometraje)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        vehiculoId, demo.id, clienteId, placa, marca, modelo,
        Math.min(2100, Math.max(1950, Math.round(Number(nuevo.anio) || new Date().getFullYear()))),
        String(nuevo.color ?? '').trim() || 'Sin especificar',
        kilometraje,
      ],
    })
  }

  // Un carro no puede estar dos veces en el taller a la vez.
  const abierta = await fila<{ id: string; numero: number }>(
    `SELECT id, numero FROM ordenes WHERE demo_id = ? AND vehiculo_id = ? AND archivada = 0`,
    [demo.id, vehiculoId],
  )
  if (abierta) {
    return NextResponse.json(
      { error: 'Ese carro ya tiene una orden abierta', ordenId: abierta.id, numero: abierta.numero },
      { status: 409 },
    )
  }

  // ── Foto: llega ya comprimida desde el navegador ──────────────────────────
  let fotoId: string | null = null
  const foto = cuerpo.foto
  if (foto?.datos && typeof foto.datos === 'string') {
    if (foto.datos.length > MAX_FOTO) {
      return NextResponse.json({ error: 'La foto pesa demasiado' }, { status: 413 })
    }
    fotoId = `f_${generarId(10)}`
  }

  // ── La orden ──────────────────────────────────────────────────────────────
  const ultimo = await fila<{ n: number | null }>(
    `SELECT MAX(numero) AS n FROM ordenes WHERE demo_id = ?`,
    [demo.id],
  )
  const numero = (ultimo?.n ?? 400) + 1
  const ordenId = `o_${generarId(12)}`

  const ultimaColumna = await fila<{ n: number | null }>(
    `SELECT MAX(orden_columna) AS n FROM ordenes WHERE demo_id = ? AND estado = 'ingresado'`,
    [demo.id],
  )

  if (fotoId) {
    sentencias.push({
      sql: `INSERT INTO fotos (id, demo_id, orden_id, mime, datos, ruta_estatica, creada_en)
            VALUES (?, ?, ?, ?, ?, NULL, ?)`,
      args: [fotoId, demo.id, ordenId, String(foto.mime ?? 'image/jpeg'), foto.datos, t],
    })
  }

  sentencias.push({
    sql: `INSERT INTO ordenes (id, demo_id, numero, vehiculo_id, cliente_id, mecanico_id, estado, prioridad,
                               kilometraje, combustible, observacion, token_publico,
                               presupuesto_enviado_en, respondido_en, respondido_por,
                               orden_columna, archivada, creada_en, actualizada_en)
          VALUES (?, ?, ?, ?, ?, NULL, 'ingresado', 'baja', ?, ?, ?, ?, NULL, NULL, NULL, ?, 0, ?, ?)`,
    args: [
      ordenId, demo.id, numero, vehiculoId, clienteId,
      kilometraje, combustible, observacion, generarId(6),
      (ultimaColumna?.n ?? 0) + 1, t, t,
    ],
  })

  sentencias.push({
    sql: `INSERT INTO movimientos (id, demo_id, orden_id, desde, hasta, nota, creado_en)
          VALUES (?, ?, ?, NULL, 'ingresado', 'Recibido en recepción', ?)`,
    args: [`mv_${generarId(10)}`, demo.id, ordenId, t],
  })

  await lote(sentencias)

  await registrarEvento(demo.id, 'orden_creada', `Orden #0${numero} · ${placa} recibido en recepción`)
  await tocarActividad(demo.id)

  return NextResponse.json({ ordenId, numero, placa })
}
