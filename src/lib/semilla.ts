import { ahora, ejecutar, haceHoras, haceMinutos, lote } from './db'
import {
  CATALOGO_SERVICIOS,
  CITAS,
  INVENTARIO,
  MECANICOS,
  ORDENES,
  VEHICULOS,
  azar,
  generarHistorial,
  semillaDe,
} from './datos-semilla'
import { ESTADOS, centavos, desglosarIva, token } from './dominio'
import { claveDeAcceso, numeroFactura, TIPO_FACTURA, TIPO_NOTA_CREDITO } from './sri'

export type Demo = {
  id: string
  slug: string
  taller_nombre: string
  telefono: string | null
  ciudad: string
  ruc: string
  creado_en: string
  sembrado_en: string
  ultima_actividad: string
  tour_visto: number
  secuencial: number
}

// Fotos que viajan como archivos estáticos en /public/fotos (decisión 6: no hay
// volumen persistente, así que la semilla no guarda binarios en la base).
//
// Es el único lugar del proyecto donde se nombran los archivos.
export const FOTOS_SEMBRADAS = [
  { clave: 'pastillas', archivo: 'pastillas.jpg', alt: 'Pastillas de freno desgastadas' },
  { clave: 'amortiguadores', archivo: 'amortiguadores.jpg', alt: 'Amortiguador delantero con fuga' },
  // Marcador a propósito: la foto que llegó era una banda de accesorios, no una
  // correa de distribución dentada. Mejor un hueco evidente que una pieza que
  // no corresponde: el prospecto es justo quien nota la diferencia.
  { clave: 'correa', archivo: 'correa.svg', alt: 'Falta la foto de la correa de distribución' },
  { clave: 'embrague', archivo: 'embrague.jpg', alt: 'Disco de embrague gastado' },
]

/** Id estable de una foto sembrada, por clave (`pastillas`, `correa`, …). */
export function idFotoSembrada(demoId: string, clave: string): string {
  const f = FOTOS_SEMBRADAS.find((x) => x.clave === clave)
  return f ? idFoto(demoId, f.archivo) : ''
}

/** RUC ficticio pero bien formado, estable para cada taller. */
export function rucFicticio(slug: string): string {
  let h = 0
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const cuerpo = String(h % 10_000_000).padStart(7, '0')
  return `179${cuerpo}001`
}

/** Horas de taller de un servicio, por su nombre. Alimenta la productividad. */
function horasDe(nombre: string): number {
  return CATALOGO_SERVICIOS.find((s) => s.nombre === nombre)?.horas ?? 1
}

const idFoto = (demoId: string, archivo: string) => `${demoId}-f-${archivo.replace(/\W/g, '')}`
const idVehiculo = (demoId: string, placa: string) => `${demoId}-v-${placa.replace('-', '')}`
const idCliente = (demoId: string, placa: string) => `${demoId}-c-${placa.replace('-', '')}`
const idMecanico = (demoId: string, i: number) => `${demoId}-m-${i}`
const idOrden = (demoId: string, numero: number) => `${demoId}-o-${numero}`

/**
 * Siembras en curso, por demo. Sembrar dos veces el mismo demo a la vez rompe:
 * los identificadores de la semilla son deterministas y la segunda tanda choca
 * contra la clave primaria de `fotos`.
 *
 * Pasa de verdad, no en teoría: el layout y la página llaman los dos a
 * `abrirDemo`, Next los renderiza en paralelo y los dos ven vencido el plazo de
 * las 48 horas. Sin esto, el prospecto que abre su enlace al día siguiente se
 * encuentra un 500 — medido con /d/prueba-carrera y el reloj atrasado 49 h.
 *
 * El guard va aquí y no en quien llama porque los caminos son varios: el
 * reinicio automático, el botón de la pantalla de configuración, el alta de un
 * enlace y el script de la terminal.
 */
const sembrando = new Map<string, Promise<void>>()

export function sembrarDemo(demo: Pick<Demo, 'id' | 'taller_nombre'> & { slug?: string }): Promise<void> {
  const enCurso = sembrando.get(demo.id)
  if (enCurso) return enCurso

  const tanda = sembrarDeVerdad(demo).finally(() => sembrando.delete(demo.id))
  sembrando.set(demo.id, tanda)
  return tanda
}

/**
 * Deja el demo exactamente en su estado inicial.
 * Borra todo lo que cuelga del demo_id y vuelve a sembrar. Es lo que usan el
 * botón "Reiniciar demo" y el reinicio automático a las 48 horas.
 */
async function sembrarDeVerdad(demo: Pick<Demo, 'id' | 'taller_nombre'> & { slug?: string }): Promise<void> {
  const demoId = demo.id
  const t = ahora()

  // Todo el trabajo del taller vuelve al estado inicial…
  const TABLAS = ['items', 'fotos', 'facturas', 'movimientos',
                  'ordenes', 'vehiculos', 'clientes', 'mecanicos', 'citas']
  const borrados: { sql: string; args: (string | number | null)[] }[] = TABLAS.map((tabla) => ({
    sql: `DELETE FROM ${tabla} WHERE demo_id = ?`,
    args: [demoId],
  }))

  // …pero los repuestos que dio de alta el prospecto se quedan. Solo se borran
  // los sembrados. La regla se explica en una frase: "lo que usted agregó se
  // queda; lo demás vuelve a como estaba".
  // Del historial de bodega se va lo que hizo el taller —las salidas por
  // factura— y lo de las piezas sembradas. Los movimientos de una pieza que se
  // queda se quedan con ella: un repuesto "agregado por usted" sin historia
  // sería una incoherencia a la vista.
  //
  // Este borrado va ANTES que el de `inventario`: la subconsulta necesita ver
  // todavía qué piezas eran sembradas.
  borrados.push({
    sql: `DELETE FROM movimientos_stock
           WHERE demo_id = ?
             AND (orden_id IS NOT NULL
                  OR repuesto_id IN (SELECT id FROM inventario WHERE demo_id = ? AND sembrada = 1))`,
    args: [demoId, demoId],
  })
  borrados.push({ sql: `DELETE FROM inventario WHERE demo_id = ? AND sembrada = 1`, args: [demoId] })

  await lote(borrados)

  const sentencias: { sql: string; args: (string | number | null)[] }[] = []

  // ── Fotos, mecánicos, clientes y vehículos ────────────────────────────────
  for (const f of FOTOS_SEMBRADAS) {
    sentencias.push({
      sql: `INSERT INTO fotos (id, demo_id, orden_id, mime, datos, ruta_estatica, creada_en)
            VALUES (?, ?, NULL, 'image/jpeg', NULL, ?, ?)`,
      args: [idFoto(demoId, f.archivo), demoId, `/fotos/${f.archivo}`, t],
    })
  }

  MECANICOS.forEach((m, i) => {
    sentencias.push({
      sql: `INSERT INTO mecanicos (id, demo_id, nombre, especialidad, orden) VALUES (?, ?, ?, ?, ?)`,
      args: [idMecanico(demoId, i), demoId, m.nombre, m.especialidad, i],
    })
  })

  for (const v of VEHICULOS) {
    sentencias.push({
      sql: `INSERT INTO clientes (id, demo_id, nombre, telefono, cedula, correo) VALUES (?, ?, ?, ?, ?, NULL)`,
      args: [idCliente(demoId, v.placa), demoId, v.cliente, v.telefono, v.cedula],
    })
    sentencias.push({
      sql: `INSERT INTO vehiculos (id, demo_id, cliente_id, placa, marca, modelo, anio, color, kilometraje)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [idVehiculo(demoId, v.placa), demoId, idCliente(demoId, v.placa), v.placa, v.marca, v.modelo, v.anio, v.color, v.km],
    })
  }

  // ── Órdenes, renglones y bitácora de movimientos ──────────────────────────
  // El número que se ve continúa el del historial; el identificador interno
  // sigue derivando de la constante de la semilla para que las direcciones no
  // cambien entre siembras.
  const historial = generarHistorial(semillaDe(demo.slug ?? demo.taller_nombre))
  historial.sort((a, b) => a.entro.localeCompare(b.entro))

  // ── DOS NUMERACIONES, CADA UNA CON SU RELOJ ───────────────────────────────
  //
  // El NÚMERO DE ORDEN crece con la LLEGADA del carro, mezclando histórico y
  // tablero: el más viejo del taller lleva el número más bajo. Antes se asignaba
  // por el orden del array de la semilla y salía al revés —#0640 con cuatro días
  // y #0629 con una hora—, que es justo lo contrario de como funciona un taller.
  //
  // El SECUENCIAL DE FACTURA crece con la EMISIÓN, que es la salida, no la
  // entrada. Ordenar el histórico por entrada no basta porque las visitas duran
  // distinto: una de tres días entra antes y sale después que una de dos horas.
  // Con esa mezcla salían 223 saltos hacia atrás en 628 comprobantes, y el
  // secuencial del SRI es estrictamente incremental. Un contador lo ve enseguida.
  const llegadas = [
    ...historial.map((v, i) => ({ clave: `h${i}`, cuando: v.entro })),
    ...ORDENES.map((o) => ({ clave: `b${o.numero}`, cuando: haceMinutos(o.haceMin) })),
  ].sort((a, b) => a.cuando.localeCompare(b.cuando))
  const numeroDe = new Map(llegadas.map((x, i) => [x.clave, i + 1]))

  const secuencialDe = new Map(
    historial
      .map((v, i) => ({ i, salio: v.salio }))
      .sort((a, b) => a.salio.localeCompare(b.salio))
      .map((x, n) => [x.i, 1000 + n + 1] as const),
  )

  const porColumna: Record<string, number> = {}

  for (const o of ORDENES) {
    const vehiculo = VEHICULOS.find((v) => v.placa === o.placa)
    if (!vehiculo) throw new Error(`La semilla referencia una placa inexistente: ${o.placa}`)

    const ordenId = idOrden(demoId, o.numero)
    const creada = haceMinutos(o.haceMin)
    const columna = (porColumna[o.estado] = (porColumna[o.estado] ?? 0) + 1)

    sentencias.push({
      sql: `INSERT INTO ordenes (id, demo_id, numero, vehiculo_id, cliente_id, mecanico_id, estado, prioridad,
                                 kilometraje, combustible, observacion, token_publico,
                                 presupuesto_enviado_en, respondido_en, respondido_por,
                                 orden_columna, archivada, creada_en, actualizada_en)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      args: [
        ordenId, demoId, numeroDe.get(`b${o.numero}`)!,
        idVehiculo(demoId, o.placa), idCliente(demoId, o.placa),
        o.mecanico === null ? null : idMecanico(demoId, o.mecanico),
        o.estado, o.prioridad, vehiculo.km, o.combustible, o.observacion,
        token(6),
        o.presupuestoHaceMin ? haceMinutos(o.presupuestoHaceMin) : null,
        o.respondidoHaceMin ? haceMinutos(o.respondidoHaceMin) : null,
        o.respondidoHaceMin ? vehiculo.cliente : null,
        columna, creada, creada,
      ],
    })

    o.items.forEach((it, i) => {
      sentencias.push({
        sql: `INSERT INTO items (id, demo_id, orden_id, tipo, descripcion, detalle, precio, horas, estado, foto_id, creado_en)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `${ordenId}-i-${i}`, demoId, ordenId, it.tipo, it.descripcion, it.detalle ?? '',
          centavos(it.precio), horasDe(it.descripcion), it.estado ?? 'incluido',
          it.foto ? idFotoSembrada(demoId, it.foto) : null, creada,
        ],
      })
    })

    // Bitácora: desde "ingresado" hasta el estado actual, repartida en el tiempo
    // que la orden lleva en el taller. Alimenta la línea de tiempo del vehículo.
    const destino = ESTADOS.indexOf(o.estado)
    const paso = o.haceMin / (destino + 1)
    for (let n = 0; n <= destino; n++) {
      sentencias.push({
        sql: `INSERT INTO movimientos (id, demo_id, orden_id, desde, hasta, nota, creado_en)
              VALUES (?, ?, ?, ?, ?, '', ?)`,
        args: [
          `${ordenId}-mv-${n}`, demoId, ordenId,
          n === 0 ? null : ESTADOS[n - 1], ESTADOS[n],
          haceMinutos(Math.round(o.haceMin - paso * n)),
        ],
      })
    }
  }

  // ── Doce meses de historia ────────────────────────────────────────────────
  // Archivadas (no salen en el tablero) y facturadas. Es lo que da cuerpo a
  // facturación y a reportes: sin volumen, esas pantallas parecen maqueta.
  historial.forEach((v, indice) => {
    const numero = numeroDe.get(`h${indice}`)!
    const secuencial = secuencialDe.get(indice)!
    const ordenId = `${demoId}-h-${indice + 1}`
    const { entro, salio } = v
    const vehiculo = VEHICULOS.find((x) => x.placa === v.placa)!

    const bruto =
      v.servicios.reduce((suma, s) => suma + centavos(s.precio), 0) +
      (v.hallazgo?.aprobado ? centavos(v.hallazgo.precio) : 0)
    // Una nota de crédito revierte la venta: se guarda en negativo para que
    // cualquier suma de la columna cuadre sin casos especiales.
    const signo = v.estadoFactura === 'nota_credito' ? -1 : 1
    const { subtotal, iva, total } = desglosarIva(bruto)

    sentencias.push({
      sql: `INSERT INTO ordenes (id, demo_id, numero, vehiculo_id, cliente_id, mecanico_id, estado, prioridad,
                                 kilometraje, combustible, observacion, token_publico,
                                 presupuesto_enviado_en, respondido_en, respondido_por,
                                 orden_columna, archivada, creada_en, actualizada_en)
            VALUES (?, ?, ?, ?, ?, ?, 'listo', 'baja', ?, '1/2', '', ?, NULL, ?, ?, 0, 1, ?, ?)`,
      args: [
        ordenId, demoId, numero,
        idVehiculo(demoId, v.placa), idCliente(demoId, v.placa),
        idMecanico(demoId, v.mecanico),
        v.km, token(6), entro, vehiculo.cliente, entro, salio,
      ],
    })

    v.servicios.forEach((sv, k) => {
      sentencias.push({
        sql: `INSERT INTO items (id, demo_id, orden_id, tipo, descripcion, detalle, precio, horas, estado, foto_id, creado_en)
              VALUES (?, ?, ?, 'servicio', ?, '', ?, ?, 'incluido', NULL, ?)`,
        args: [`${ordenId}-i-${k}`, demoId, ordenId, sv.nombre, centavos(sv.precio), sv.horas, entro],
      })
    })

    if (v.hallazgo) {
      sentencias.push({
        sql: `INSERT INTO items (id, demo_id, orden_id, tipo, descripcion, detalle, precio, horas, estado, foto_id, creado_en)
              VALUES (?, ?, ?, 'hallazgo', ?, '', ?, ?, ?, NULL, ?)`,
        args: [
          `${ordenId}-h`, demoId, ordenId, v.hallazgo.nombre,
          centavos(v.hallazgo.precio), v.hallazgo.horas,
          v.hallazgo.aprobado ? 'aprobado' : 'rechazado', entro,
        ],
      })
    }

    sentencias.push({
      sql: `INSERT INTO facturas (id, demo_id, orden_id, numero, clave_acceso, subtotal, iva, total, estado, emitida_en)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `${ordenId}-f`, demoId, ordenId,
        numeroFactura(secuencial),
        claveDeAcceso({
          fechaIso: salio,
          ruc: rucFicticio(demo.slug ?? ''),
          secuencial,
          tipo: v.estadoFactura === 'nota_credito' ? TIPO_NOTA_CREDITO : TIPO_FACTURA,
        }),
        subtotal * signo, iva * signo, total * signo, v.estadoFactura, salio,
      ],
    })

    sentencias.push({
      sql: `INSERT INTO movimientos (id, demo_id, orden_id, desde, hasta, nota, creado_en)
            VALUES (?, ?, ?, 'reparacion', 'listo', 'Entregado y facturado', ?)`,
      args: [`${ordenId}-mv`, demoId, ordenId, salio],
    })
  })

  // ── Inventario y agenda ───────────────────────────────────────────────────
  // Cada repuesto llega con su historia de bodega: una compra al proveedor, un
  // conteo físico, alguna merma. Sin esto, el panel de ajuste de una pieza
  // sembrada se ve recién nacido justo al lado de una que el prospecto acaba de
  // mover, y la diferencia canta.
  const dado = azar(semillaDe(`${demo.slug ?? demo.taller_nombre}-bodega`))
  const MOTIVOS_BODEGA = ['Compra a proveedor', 'Conteo físico', 'Merma o daño', 'Devolución']

  INVENTARIO.forEach((p, i) => {
    const idPieza = `${demoId}-p-${i}`
    sentencias.push({
      sql: `INSERT INTO inventario (id, demo_id, codigo, nombre, categoria, stock, stock_minimo, precio, ubicacion, sembrada)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [idPieza, demoId, p.codigo, p.nombre, p.categoria, p.stock, p.minimo, centavos(p.precio), p.ubicacion],
    })

    const cuantos = 2 + Math.floor(dado() * 3)
    for (let m = 0; m < cuantos; m++) {
      const motivo = MOTIVOS_BODEGA[Math.floor(dado() * MOTIVOS_BODEGA.length)]
      // La compra entra en bulto y la devolución del cliente vuelve a la percha;
      // el conteo y la merma corrigen de a poco, siempre a la baja.
      const entra = motivo === 'Compra a proveedor' || motivo === 'Devolución'
      const cantidad = entra
        ? (motivo === 'Devolución' ? 1 : 4) + Math.floor(dado() * (motivo === 'Devolución' ? 2 : 9))
        : -(1 + Math.floor(dado() * 3))
      sentencias.push({
        sql: `INSERT INTO movimientos_stock (id, demo_id, repuesto_id, cantidad, motivo, orden_id, creado_en)
              VALUES (?, ?, ?, ?, ?, NULL, ?)`,
        args: [
          `${demoId}-ms-${i}-${m}`,
          demoId,
          idPieza,
          cantidad,
          motivo,
          haceHoras(18 + Math.floor(dado() * 1_400)),
        ],
      })
    }
  })

  CITAS.forEach((c, i) => {
    sentencias.push({
      sql: `INSERT INTO citas (id, demo_id, dia, hora, placa, cliente, servicio, mecanico_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [`${demoId}-ct-${i}`, demoId, c.dia, c.hora, c.placa, c.cliente, c.servicio, idMecanico(demoId, c.mecanico)],
    })
  })

  await lote(sentencias)

  await ejecutar(
    `UPDATE demos SET sembrado_en = ?, ultima_actividad = ?, secuencial = ? WHERE id = ?`,
    [t, t, 1000 + historial.length, demoId],
  )
}
