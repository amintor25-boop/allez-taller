// Tipos, estados y reglas de negocio. Sin dependencias: se usa en servidor y en cliente.

export const ESTADOS = ['ingresado', 'diagnostico', 'aprobacion', 'reparacion', 'listo'] as const
export type Estado = (typeof ESTADOS)[number]

export const ESTADO_INFO: Record<Estado, { corto: string; largo: string }> = {
  ingresado: { corto: 'Ingresado', largo: 'Ingresado' },
  diagnostico: { corto: 'Diagnóstico', largo: 'En diagnóstico' },
  aprobacion: { corto: 'Aprobación', largo: 'Espera aprobación' },
  reparacion: { corto: 'Reparación', largo: 'En reparación' },
  listo: { corto: 'Listo / Entrega', largo: 'Listo para entrega' },
}

export const PRIORIDADES = ['alta', 'media', 'baja'] as const
export type Prioridad = (typeof PRIORIDADES)[number]

export const PRIORIDAD_INFO: Record<Prioridad, { etiqueta: string; color: string }> = {
  alta: { etiqueta: 'Alta', color: '#EF4444' },
  media: { etiqueta: 'Media', color: '#F59E0B' },
  baja: { etiqueta: 'Normal', color: '#94A3B8' },
}

// Los renglones de una orden. `hallazgo` es lo que se descubre durante el diagnóstico
// y necesita el visto bueno del dueño del carro; el resto entra ya autorizado.
export const TIPOS_ITEM = ['servicio', 'repuesto', 'hallazgo'] as const
export type TipoItem = (typeof TIPOS_ITEM)[number]

export const ESTADOS_ITEM = ['incluido', 'propuesto', 'aprobado', 'rechazado'] as const
export type EstadoItem = (typeof ESTADOS_ITEM)[number]

export const COMBUSTIBLES = ['vacío', '1/4', '1/2', '3/4', 'lleno'] as const
export type Combustible = (typeof COMBUSTIBLES)[number]

// ─────────────────────────────────────────────────────────────────────────────
// Dinero
//
// Todo se guarda en centavos enteros para que nunca aparezca un $85,99 por
// arrastre de coma flotante. Los precios que ve el cliente YA INCLUYEN IVA:
// en un taller ecuatoriano se cotiza el valor final ("las pastillas son 86").
// La factura desglosa hacia atrás.
// ─────────────────────────────────────────────────────────────────────────────

export const TASA_IVA = 0.15

export function desglosarIva(totalCentavos: number) {
  const subtotal = Math.round(totalCentavos / (1 + TASA_IVA))
  // El IVA se obtiene por resta, nunca por multiplicación: así subtotal + iva
  // siempre da exactamente el total, sin descuadres de un centavo.
  return { subtotal, iva: totalCentavos - subtotal, total: totalCentavos }
}

/**
 * Formateo manual, no Intl: el servidor y el navegador pueden traer datos de
 * locale distintos y una diferencia de un carácter rompe la hidratación de React.
 * Ecuador usa dólar con coma decimal y punto de miles: $1.234,56
 */
export function dinero(centavos: number): string {
  const negativo = centavos < 0
  const n = Math.abs(Math.round(centavos))
  const enteros = String(Math.floor(n / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const decimales = String(n % 100).padStart(2, '0')
  return `${negativo ? '\u2212' : ''}$${enteros},${decimales}`
}

export function centavos(dolares: number): number {
  return Math.round(dolares * 100)
}

// ─────────────────────────────────────────────────────────────────────────────
// Placas ecuatorianas: tres letras, guion, cuatro dígitos (PBX-1234).
// ─────────────────────────────────────────────────────────────────────────────

export function normalizarPlaca(entrada: string): string {
  const limpio = entrada
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 7)
  if (limpio.length <= 3) return limpio
  return `${limpio.slice(0, 3)}-${limpio.slice(3)}`
}

export function placaValida(placa: string): boolean {
  return /^[A-Z]{3}-\d{4}$/.test(placa)
}

// ─────────────────────────────────────────────────────────────────────────────
// Fechas: la base guarda ISO en UTC; el taller lee hora de Ecuador.
// ─────────────────────────────────────────────────────────────────────────────

export const ZONA = 'America/Guayaquil'

// Ecuador continental es UTC-5 todo el año, sin horario de verano. Con eso las
// fechas se calculan con aritmética pura y dan idéntico en servidor y navegador.
const DESFASE_EC_MS = -5 * 60 * 60 * 1000

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

function enEcuador(iso: string): Date {
  return new Date(new Date(iso).getTime() + DESFASE_EC_MS)
}

export function hora(iso: string): string {
  const d = enEcuador(iso)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

export function fechaCorta(iso: string): string {
  const d = enEcuador(iso)
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MESES_CORTOS[d.getUTCMonth()]}`
}

export function fechaLarga(iso: string): string {
  const d = enEcuador(iso)
  return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`
}

export function fechaHora(iso: string): string {
  return `${fechaCorta(iso)}, ${hora(iso)}`
}

export function nombreDia(indice: number): string {
  return DIAS[indice] ?? ''
}

/** "2 h en taller", "3 días", "hace 20 min" — el reloj que le importa al jefe de taller. */
export function antiguedad(iso: string, ahora = Date.now()): string {
  const minutos = Math.max(0, Math.floor((ahora - new Date(iso).getTime()) / 60000))
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `${horas} h`
  const dias = Math.floor(horas / 24)
  return dias === 1 ? '1 día' : `${dias} días`
}

// ─────────────────────────────────────────────────────────────────────────────
// Teléfonos. En pantalla se lee como lo lee cualquiera en Ecuador (097 927 9337);
// el enlace tel: se queda con el internacional para que marque desde donde sea.
// ─────────────────────────────────────────────────────────────────────────────

export function telefonoLegible(bruto: string): string {
  const digitos = bruto.replace(/\D/g, '')
  const local = digitos.startsWith('593') ? `0${digitos.slice(3)}` : digitos
  if (local.length === 10 && local.startsWith('09')) {
    return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
  }
  if (local.length === 9 && local.startsWith('0')) {
    return `${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`
  }
  return bruto
}

export function telefonoMarcable(bruto: string): string {
  const digitos = bruto.replace(/\D/g, '')
  if (digitos.startsWith('593')) return `+${digitos}`
  if (digitos.startsWith('0')) return `+593${digitos.slice(1)}`
  return `+${digitos}`
}

export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase()
}

// ─────────────────────────────────────────────────────────────────────────────
// Identificadores
// ─────────────────────────────────────────────────────────────────────────────

// Sin vocales ni caracteres que se confundan al leer un QR en voz alta (0/O, 1/I).
const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

export function token(largo = 5): string {
  const bytes = new Uint8Array(largo)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('')
}

export function slugificar(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}
