import { dinero, telefonoLegible } from './dominio'

// El mensaje que le llega al dueño del carro.
//
// El prospecto lo va a leer de cerca, porque es lo que recibirían sus clientes.
// Por eso está escrito como escribe un taller: saludo por el nombre, el carro por
// su nombre y su placa, el precio final sin rodeos y un teléfono al final.
// Nada de "estimado usuario", "su solicitud" ni "presupuesto n.º".

export type DatosMensaje = {
  taller: string
  cliente: string
  marca: string
  modelo: string
  placa: string
  items: { descripcion: string; precio: number }[]
  url: string
  telefono: string
  fechaIso: string
}

/** Saludo según la hora de Ecuador. Un mensaje que saluda mal se nota. */
function saludo(fechaIso: string): string {
  const h = new Date(new Date(fechaIso).getTime() - 5 * 60 * 60 * 1000).getUTCHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export function mensajeWhatsApp(d: DatosMensaje): string {
  const nombre = d.cliente.split(' ')[0]
  const total = d.items.reduce((s, i) => s + i.precio, 0)
  const varios = d.items.length > 1

  const lineas = [
    `${d.taller} 🔧`,
    '',
    `${saludo(d.fechaIso)}, ${nombre}. Revisamos su ${d.marca} ${d.modelo} ${d.placa} y ` +
      `${varios ? 'encontramos unas cosas' : 'encontramos algo'} que conviene arreglar antes de que salga:`,
    '',
    ...d.items.map((i) => `• ${i.descripcion} — ${dinero(i.precio)}`),
  ]

  if (varios) lineas.push('', `Total: ${dinero(total)}`)

  lineas.push(
    '',
    'Ahí puede ver la foto y darnos el visto bueno:',
    d.url,
    '',
    `Cualquier cosa, nos llama al ${telefonoLegible(d.telefono)}.`,
  )

  return lineas.join('\n')
}

// ─── El comprobante ──────────────────────────────────────────────────────────

export type DatosFactura = {
  taller: string
  cliente: string
  marca: string
  modelo: string
  placa: string
  numero: string
  total: number
  url: string
  telefono: string
  fechaIso: string
}

export function mensajeFactura(d: DatosFactura): string {
  const nombre = d.cliente.split(' ')[0]
  return [
    `${d.taller} 🔧`,
    '',
    `${saludo(d.fechaIso)}, ${nombre}. Su ${d.marca} ${d.modelo} ${d.placa} ya está listo.`,
    '',
    `Factura ${d.numero} — ${dinero(d.total)}`,
    '',
    'Aquí puede ver el detalle:',
    d.url,
    '',
    `Le esperamos. Cualquier cosa, nos llama al ${telefonoLegible(d.telefono)}.`,
  ].join('\n')
}
