// Code 128 dibujado a mano.
//
// Es lo que lleva impreso cualquier factura del SRI debajo de la clave de
// acceso, y el público de este demo ve facturas del SRI todos los días: un
// rectángulo decorativo con rayitas al azar se nota. Este se puede leer con el
// lector del celular y devuelve los 49 dígitos.
//
// Sin librería: son 107 patrones y una suma ponderada. Meter una dependencia
// para esto sería pagar peso de paquete por sesenta líneas.

/**
 * Anchos de barra de cada símbolo, del 0 al 106.
 *
 * Cada cadena son seis cifras: barra, espacio, barra, espacio, barra, espacio.
 * Suman siempre 11 módulos, menos la parada final que lleva una barra de más.
 */
const PATRONES = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131',  // 100 a juego B, 101 a juego A, 102 FNC1
  '211412', '211214', '211232',  // 103-105: inicio A, B y C
  '2331112', // 106: parada
]

const INICIO_C = 105
const PARADA = 106

/**
 * Módulos (1 = barra, 0 = espacio) de una cadena de dígitos en Code 128 C.
 *
 * El juego C empaqueta dos dígitos por símbolo, así que una clave de 49 cifras
 * cabe en un ancho razonable. Como 49 es impar, la última va suelta en el juego
 * B —el símbolo 100 cambia de juego— igual que hacen las facturas de verdad.
 */
export function modulosCode128(texto: string): number[] {
  const cifras = texto.replace(/\D/g, '')
  if (!cifras) return []

  const simbolos: number[] = [INICIO_C]
  let i = 0
  while (i + 1 < cifras.length) {
    simbolos.push(Number(cifras.slice(i, i + 2)))
    i += 2
  }
  if (i < cifras.length) {
    simbolos.push(100) // a juego B
    simbolos.push(cifras.charCodeAt(i) - 32) // el dígito suelto
  }

  // Dígito de control: el de inicio pesa 1 y los demás su posición.
  let suma = simbolos[0]
  for (let j = 1; j < simbolos.length; j++) suma += simbolos[j] * j
  simbolos.push(suma % 103)
  simbolos.push(PARADA)

  const modulos: number[] = []
  for (const s of simbolos) {
    let barra = true
    for (const ancho of PATRONES[s]) {
      for (let k = 0; k < Number(ancho); k++) modulos.push(barra ? 1 : 0)
      barra = !barra
    }
  }
  return modulos
}

/**
 * El código como SVG, sin texto: la clave ya va escrita encima en el
 * comprobante y repetirla debajo solo ensucia.
 *
 * Se devuelve el marcado y no un componente para que se pueda calcular en el
 * servidor y viajar dentro del HTML, como el QR.
 */
export function codigoBarrasSvg(texto: string, alto = 44): string {
  const modulos = modulosCode128(texto)
  if (modulos.length === 0) return ''

  // Zona muda: diez módulos a cada lado. Sin ella muchos lectores no enganchan.
  const MUDA = 10
  const ancho = modulos.length + MUDA * 2

  // Se juntan las barras contiguas en un solo rectángulo: menos nodos y, sobre
  // todo, sin las costuras claras que deja el antialias entre rectángulos
  // pegados —y esas costuras sí rompen la lectura.
  const barras: string[] = []
  let j = 0
  while (j < modulos.length) {
    if (modulos[j] === 0) { j++; continue }
    const desde = j
    while (j < modulos.length && modulos[j] === 1) j++
    barras.push(`<rect x="${desde + MUDA}" y="0" width="${j - desde}" height="${alto}"/>`)
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ancho} ${alto}" ` +
    `width="100%" height="${alto}" preserveAspectRatio="none" shape-rendering="crispEdges" ` +
    `role="img" aria-label="Código de barras de la clave de acceso">` +
    `<rect width="${ancho}" height="${alto}" fill="#fff"/>` +
    `<g fill="#14181F">${barras.join('')}</g>` +
    `</svg>`
  )
}
