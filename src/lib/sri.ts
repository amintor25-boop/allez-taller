// Clave de acceso del SRI: 49 dígitos.
//
// Está implementada de verdad, con su dígito verificador módulo 11, para que el
// comprobante aguante que un contador lo mire de cerca. El RUC es ficticio y el
// documento lleva su leyenda de demostración: nada de esto tiene validez tributaria.
//
//   ddmmaaaa (8) · tipo comprobante (2) · RUC (13) · ambiente (1)
//   serie (6) · secuencial (9) · código numérico (8) · tipo emisión (1) · verificador (1)

export const TIPO_FACTURA = '01'
export const AMBIENTE_PRUEBAS = '1'
export const EMISION_NORMAL = '1'
export const ESTABLECIMIENTO = '001'
export const PUNTO_EMISION = '001'

/**
 * Dígito verificador módulo 11 sobre los 48 dígitos previos.
 * Pesos 2..7 cíclicos, de derecha a izquierda.
 */
export function digitoVerificador(cuerpo: string): number {
  let suma = 0
  let peso = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * peso
    peso = peso === 7 ? 2 : peso + 1
  }
  const residuo = suma % 11
  const digito = 11 - residuo
  if (digito === 11) return 0
  if (digito === 10) return 1
  return digito
}

/** ddmmaaaa en hora de Ecuador (UTC-5 fijo). */
function fechaClave(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 5 * 60 * 60 * 1000)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}${mm}${d.getUTCFullYear()}`
}

/** Código numérico de 8 dígitos, estable a partir del secuencial y el RUC. */
function codigoNumerico(ruc: string, secuencial: number): string {
  let h = 7
  for (const c of `${ruc}${secuencial}`) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return String(h % 100_000_000).padStart(8, '0')
}

export function claveDeAcceso(opciones: {
  fechaIso: string
  ruc: string
  secuencial: number
}): string {
  const { fechaIso, ruc, secuencial } = opciones
  const cuerpo =
    fechaClave(fechaIso) +
    TIPO_FACTURA +
    ruc.padStart(13, '0') +
    AMBIENTE_PRUEBAS +
    ESTABLECIMIENTO +
    PUNTO_EMISION +
    String(secuencial).padStart(9, '0') +
    codigoNumerico(ruc, secuencial) +
    EMISION_NORMAL

  if (cuerpo.length !== 48) {
    throw new Error(`El cuerpo de la clave debe tener 48 dígitos, tiene ${cuerpo.length}`)
  }
  return cuerpo + digitoVerificador(cuerpo)
}

/** 001-001-000001247 */
export function numeroFactura(secuencial: number): string {
  return `${ESTABLECIMIENTO}-${PUNTO_EMISION}-${String(secuencial).padStart(9, '0')}`
}

/** Se muestra en bloques de 7 para que se pueda leer y cotejar. */
export function claveLegible(clave: string): string {
  return clave.replace(/(.{7})/g, '$1 ').trim()
}
