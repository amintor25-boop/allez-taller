import type { Combustible, Estado, EstadoItem, Prioridad, TipoItem } from './dominio'

// Catálogos de la semilla. Todo en dólares (se convierten a centavos al sembrar)
// y con IVA ya incluido, como se cotiza de verdad en un taller ecuatoriano.

export const MECANICOS = [
  { nombre: 'Jorge Cando', especialidad: 'Motor y diagnóstico' },
  { nombre: 'Wilmer Chicaiza', especialidad: 'Frenos y suspensión' },
  { nombre: 'Édison Guamán', especialidad: 'Electricidad y A/C' },
]

/**
 * Tres maneras distintas de trabajar, y por eso tres respuestas distintas a la
 * pregunta que le importa al dueño: "¿cuál de mis mecánicos me da plata?".
 *
 * Antes el reparto era un azar uniforme y los tres salían iguales —210, 208 y
 * 204 carros; 38, 36 y 34 mil dólares—. El bloque de productividad respondía
 * "los tres igual", que es la respuesta menos interesante posible y la que menos
 * demuestra para qué sirve el sistema.
 *
 * `pesoBarato` es la inclinación por trabajos de menos de 60 dólares; el resto
 * de la escala reparte los caros. Con eso salen tres perfiles reconocibles en
 * cualquier taller: el que despacha mucho y barato, el que hace pocos trabajos
 * grandes, y el intermedio.
 */
export const PERFILES = [
  // Jorge — motor y diagnóstico. Los trabajos grandes. Pocos carros, ticket alto.
  { chico: 0.15, medio: 0.7, grande: 3.2, volumen: 0.75 },
  // Wilmer — frenos y suspensión. El que MÁS carros mueve y el que MENOS factura:
  // muchos aceites, alineaciones y diagnósticos.
  { chico: 3.2, medio: 1.1, grande: 0.5, volumen: 1.55 },
  // Édison — electricidad y A/C. En medio, y por eso la respuesta a "¿cuál me da
  // plata?" no es la obvia: no es el que más carros atiende.
  { chico: 1.0, medio: 2.0, grande: 1.0, volumen: 1.0 },
]

export type SemillaVehiculo = {
  placa: string
  marca: string
  modelo: string
  anio: number
  color: string
  km: number
  cliente: string
  telefono: string
  cedula: string
}

export const VEHICULOS: SemillaVehiculo[] = [
  // ★ El de la reunión.
  { placa: 'PBX-1234', marca: 'Chevrolet', modelo: 'Sail', anio: 2016, color: 'Plateado', km: 128_400, cliente: 'Luis Andrade', telefono: '099 812 4477', cedula: '1712456783' },
  { placa: 'PCA-3391', marca: 'Chevrolet', modelo: 'Aveo', anio: 2014, color: 'Rojo', km: 176_200, cliente: 'Mercedes Yépez', telefono: '098 334 2019', cedula: '1703928471' },
  { placa: 'TAA-5678', marca: 'Kia', modelo: 'Rio', anio: 2019, color: 'Blanco', km: 62_300, cliente: 'Patricio Salazar', telefono: '099 147 8830', cedula: '1719283746' },
  { placa: 'PBH-0472', marca: 'Kia', modelo: 'Sportage', anio: 2021, color: 'Gris', km: 41_800, cliente: 'Gabriela Muñoz', telefono: '098 776 5512', cedula: '1725648390' },
  { placa: 'PDD-8815', marca: 'Hyundai', modelo: 'Tucson', anio: 2018, color: 'Negro', km: 98_600, cliente: 'Fausto Loachamín', telefono: '099 503 6621', cedula: '1714859302' },
  { placa: 'PCS-2260', marca: 'Toyota', modelo: 'Hilux', anio: 2017, color: 'Blanco', km: 154_900, cliente: 'Marco Tulcanaza', telefono: '098 220 4478', cedula: '1708374659' },
  { placa: 'PAY-9034', marca: 'Nissan', modelo: 'Versa', anio: 2020, color: 'Azul', km: 55_100, cliente: 'Verónica Simbaña', telefono: '099 661 2093', cedula: '1721938475' },
  { placa: 'GSA-0912', marca: 'Great Wall', modelo: 'Wingle 5', anio: 2015, color: 'Plateado', km: 189_300, cliente: 'Segundo Quishpe', telefono: '098 449 7731', cedula: '1702857463' },
  { placa: 'PBM-7741', marca: 'Chery', modelo: 'Tiggo 2', anio: 2022, color: 'Blanco', km: 28_400, cliente: 'Ximena Pazmiño', telefono: '099 018 5544', cedula: '1730495867' },
  { placa: 'PCX-5518', marca: 'Chevrolet', modelo: 'Sail', anio: 2018, color: 'Negro', km: 91_700, cliente: 'Ángel Cabascango', telefono: '098 902 3317', cedula: '1716283940' },
  { placa: 'IBA-7730', marca: 'Nissan', modelo: 'Versa', anio: 2016, color: 'Gris', km: 132_500, cliente: 'Rocío Naranjo', telefono: '099 774 1128', cedula: '1709384756' },
  { placa: 'PDA-1163', marca: 'Hyundai', modelo: 'Accent', anio: 2019, color: 'Rojo', km: 74_200, cliente: 'Byron Tipán', telefono: '098 611 9042', cedula: '1723847561' },
  { placa: 'PBK-4407', marca: 'Kia', modelo: 'Rio', anio: 2016, color: 'Plateado', km: 143_000, cliente: 'Nelson Chiluisa', telefono: '099 385 2276', cedula: '1711938475' },
  { placa: 'PCE-6620', marca: 'Chevrolet', modelo: 'Aveo', anio: 2012, color: 'Azul', km: 210_800, cliente: 'Martha Quinatoa', telefono: '098 157 3390', cedula: '1704958372' },
  { placa: 'PAJ-3378', marca: 'Hyundai', modelo: 'Tucson', anio: 2015, color: 'Blanco', km: 167_400, cliente: 'Diego Recalde', telefono: '099 226 8814', cedula: '1713049586' },
]

export type SemillaItem = {
  tipo: TipoItem
  descripcion: string
  detalle?: string
  precio: number // dólares, IVA incluido
  estado?: EstadoItem
  foto?: string // clave de FOTOS_SEMBRADAS
}

export type SemillaOrden = {
  numero: number
  placa: string
  mecanico: number | null // índice en MECANICOS
  estado: Estado
  prioridad: Prioridad
  combustible: Combustible
  observacion: string
  haceMin: number
  presupuestoHaceMin?: number
  respondidoHaceMin?: number
  items: SemillaItem[]
}

// 12 órdenes: 2 ingresado · 3 diagnóstico · 2 aprobación · 3 reparación · 2 listo.
export const ORDENES: SemillaOrden[] = [
  // ── INGRESADO ──────────────────────────────────────────────────────────────
  {
    numero: 418, placa: 'PBM-7741', mecanico: null, estado: 'ingresado', prioridad: 'baja',
    combustible: '3/4', haceMin: 25,
    observacion: 'Cliente reporta un ruido leve al frenar en bajada.',
    items: [{ tipo: 'servicio', descripcion: 'Cambio de aceite y filtro', precio: 35 }],
  },
  {
    numero: 417, placa: 'PDA-1163', mecanico: null, estado: 'ingresado', prioridad: 'media',
    combustible: '1/2', haceMin: 70,
    observacion: 'El carro se va a la derecha en la Simón Bolívar.',
    items: [
      { tipo: 'servicio', descripcion: 'Alineación y balanceo', precio: 28 },
      { tipo: 'servicio', descripcion: 'Cambio de aceite y filtro', precio: 35 },
    ],
  },

  // ── DIAGNÓSTICO ────────────────────────────────────────────────────────────
  // ★ Esta es la orden de la reunión. Queda en diagnóstico, con un solo servicio
  //   base, para agregarle el hallazgo de las pastillas en vivo.
  {
    numero: 412, placa: 'PBX-1234', mecanico: 0, estado: 'diagnostico', prioridad: 'media',
    combustible: '1/2', haceMin: 120,
    observacion: 'Cliente indica pérdida de fuerza en subida y consumo alto.',
    items: [{ tipo: 'servicio', descripcion: 'ABC de motor', detalle: 'Limpieza de cuerpo de aceleración e inyectores', precio: 65 }],
  },
  {
    numero: 415, placa: 'PCS-2260', mecanico: 1, estado: 'diagnostico', prioridad: 'alta',
    combustible: '1/4', haceMin: 240,
    observacion: 'Testigo de motor encendido desde el lunes.',
    items: [{ tipo: 'servicio', descripcion: 'Diagnóstico electrónico', detalle: 'Lectura de códigos con escáner', precio: 25 }],
  },
  {
    numero: 410, placa: 'IBA-7730', mecanico: 2, estado: 'diagnostico', prioridad: 'baja',
    combustible: 'lleno', haceMin: 26 * 60,
    observacion: 'Golpeteo en la parte delantera al pasar chapas.',
    items: [{ tipo: 'servicio', descripcion: 'Revisión de suspensión', precio: 45 }],
  },

  // ── ESPERA APROBACIÓN ──────────────────────────────────────────────────────
  {
    numero: 408, placa: 'PDD-8815', mecanico: 1, estado: 'aprobacion', prioridad: 'alta',
    combustible: '1/2', haceMin: 30 * 60, presupuestoHaceMin: 3 * 60,
    observacion: 'Rebota mucho en la vía. Se revisó suspensión completa.',
    items: [
      { tipo: 'servicio', descripcion: 'Revisión de suspensión', precio: 45 },
      { tipo: 'hallazgo', descripcion: 'Amortiguadores delanteros', detalle: 'Par delantero, con fuga de aceite visible', precio: 220, estado: 'propuesto', foto: 'amortiguadores' },
    ],
  },
  {
    numero: 405, placa: 'PCE-6620', mecanico: 0, estado: 'aprobacion', prioridad: 'media',
    combustible: '1/4', haceMin: 52 * 60, presupuestoHaceMin: 20 * 60,
    observacion: 'Motor con ruido de cadena en frío.',
    items: [
      { tipo: 'servicio', descripcion: 'ABC de motor', precio: 65 },
      { tipo: 'hallazgo', descripcion: 'Correa de distribución', detalle: 'Cristalizada y con juego en el tensor', precio: 180, estado: 'propuesto', foto: 'correa' },
    ],
  },

  // ── EN REPARACIÓN ──────────────────────────────────────────────────────────
  {
    numero: 403, placa: 'GSA-0912', mecanico: 1, estado: 'reparacion', prioridad: 'alta',
    combustible: '1/4', haceMin: 50 * 60, presupuestoHaceMin: 44 * 60, respondidoHaceMin: 42 * 60,
    observacion: 'Embrague patina en tercera con carga.',
    items: [
      { tipo: 'servicio', descripcion: 'Diagnóstico electrónico', precio: 25 },
      { tipo: 'hallazgo', descripcion: 'Kit de embrague', detalle: 'Disco, prensa y collarín', precio: 340, estado: 'aprobado' },
    ],
  },
  {
    numero: 401, placa: 'PAJ-3378', mecanico: 2, estado: 'reparacion', prioridad: 'media',
    combustible: '1/2', haceMin: 74 * 60, presupuestoHaceMin: 70 * 60, respondidoHaceMin: 69 * 60,
    observacion: 'No enciende en las mañanas. Arranque lento.',
    items: [
      { tipo: 'repuesto', descripcion: 'Cambio de batería', detalle: '12V 65Ah', precio: 95 },
      { tipo: 'hallazgo', descripcion: 'Lavado de inyectores', precio: 70, estado: 'aprobado' },
    ],
  },
  {
    numero: 399, placa: 'PCA-3391', mecanico: 0, estado: 'reparacion', prioridad: 'baja',
    combustible: '3/4', haceMin: 78 * 60, presupuestoHaceMin: 74 * 60, respondidoHaceMin: 73 * 60,
    observacion: 'Mantenimiento de los 175.000 km.',
    items: [
      { tipo: 'servicio', descripcion: 'Cambio de aceite y filtro', precio: 35 },
      { tipo: 'hallazgo', descripcion: 'Cambio de bujías', detalle: 'Juego de 4, iridio', precio: 42, estado: 'aprobado' },
    ],
  },

  // ── LISTO / ENTREGA ────────────────────────────────────────────────────────
  {
    numero: 396, placa: 'TAA-5678', mecanico: 1, estado: 'listo', prioridad: 'baja',
    combustible: '1/2', haceMin: 100 * 60, presupuestoHaceMin: 96 * 60, respondidoHaceMin: 95 * 60,
    observacion: 'Frenos con chirrido al detenerse.',
    items: [
      { tipo: 'repuesto', descripcion: 'Pastillas de freno delanteras', detalle: 'Juego completo', precio: 86 },
      { tipo: 'hallazgo', descripcion: 'Rectificación de discos', precio: 60, estado: 'aprobado' },
    ],
  },
  {
    numero: 394, placa: 'PAY-9034', mecanico: 2, estado: 'listo', prioridad: 'baja',
    combustible: 'lleno', haceMin: 104 * 60,
    observacion: 'Mantenimiento preventivo.',
    items: [
      { tipo: 'servicio', descripcion: 'Cambio de aceite y filtro', precio: 35 },
      { tipo: 'servicio', descripcion: 'Alineación y balanceo', precio: 28 },
    ],
  },
]

// ─── Inventario (decorativo, pero tiene que verse lleno y con alertas reales) ──
export const INVENTARIO = [
  { codigo: 'FIL-0142', nombre: 'Filtro de aceite Chevrolet Sail', categoria: 'Filtros', stock: 18, minimo: 6, precio: 9, ubicacion: 'A-2' },
  { codigo: 'FIL-0208', nombre: 'Filtro de aire Kia Rio', categoria: 'Filtros', stock: 4, minimo: 6, precio: 14, ubicacion: 'A-3' },
  { codigo: 'ACE-1000', nombre: 'Aceite 20W-50 mineral (galón)', categoria: 'Lubricantes', stock: 27, minimo: 10, precio: 26, ubicacion: 'B-1' },
  { codigo: 'ACE-1050', nombre: 'Aceite 5W-30 sintético (galón)', categoria: 'Lubricantes', stock: 9, minimo: 8, precio: 42, ubicacion: 'B-1' },
  { codigo: 'FRE-3301', nombre: 'Pastillas de freno delanteras Sail', categoria: 'Frenos', stock: 2, minimo: 4, precio: 38, ubicacion: 'C-4' },
  { codigo: 'FRE-3312', nombre: 'Pastillas de freno Hyundai Tucson', categoria: 'Frenos', stock: 6, minimo: 4, precio: 52, ubicacion: 'C-4' },
  { codigo: 'FRE-3390', nombre: 'Líquido de frenos DOT 4 (litro)', categoria: 'Frenos', stock: 15, minimo: 6, precio: 11, ubicacion: 'C-1' },
  { codigo: 'SUS-5520', nombre: 'Amortiguador delantero Tucson', categoria: 'Suspensión', stock: 3, minimo: 2, precio: 78, ubicacion: 'D-2' },
  { codigo: 'SUS-5541', nombre: 'Rótula inferior Aveo', categoria: 'Suspensión', stock: 7, minimo: 4, precio: 24, ubicacion: 'D-3' },
  { codigo: 'ELE-7710', nombre: 'Batería 12V 65Ah', categoria: 'Eléctrico', stock: 5, minimo: 3, precio: 88, ubicacion: 'E-1' },
  { codigo: 'ELE-7742', nombre: 'Bujía de iridio (unidad)', categoria: 'Eléctrico', stock: 32, minimo: 12, precio: 9, ubicacion: 'E-2' },
  { codigo: 'MOT-9101', nombre: 'Kit de embrague Great Wall', categoria: 'Motor', stock: 1, minimo: 2, precio: 265, ubicacion: 'F-1' },
  { codigo: 'MOT-9134', nombre: 'Correa de distribución Aveo', categoria: 'Motor', stock: 4, minimo: 3, precio: 46, ubicacion: 'F-2' },
  { codigo: 'MOT-9188', nombre: 'Refrigerante concentrado (galón)', categoria: 'Motor', stock: 11, minimo: 5, precio: 18, ubicacion: 'B-2' },
]

// ─── Agenda de la semana (decorativa) ────────────────────────────────────────
export const CITAS = [
  { dia: 0, hora: '08:00', placa: 'PBH-0472', cliente: 'Gabriela Muñoz', servicio: 'Mantenimiento 40.000 km', mecanico: 0 },
  { dia: 0, hora: '10:30', placa: 'PCX-5518', cliente: 'Ángel Cabascango', servicio: 'Cambio de aceite', mecanico: 2 },
  { dia: 0, hora: '14:00', placa: 'PBK-4407', cliente: 'Nelson Chiluisa', servicio: 'Revisión de frenos', mecanico: 1 },
  { dia: 1, hora: '08:30', placa: 'PDA-1163', cliente: 'Byron Tipán', servicio: 'Alineación y balanceo', mecanico: 1 },
  { dia: 1, hora: '11:00', placa: 'PCE-6620', cliente: 'Martha Quinatoa', servicio: 'Correa de distribución', mecanico: 0 },
  { dia: 1, hora: '15:30', placa: 'PBM-7741', cliente: 'Ximena Pazmiño', servicio: 'Primer mantenimiento', mecanico: 2 },
  { dia: 2, hora: '08:00', placa: 'GSA-0912', cliente: 'Segundo Quishpe', servicio: 'Entrega de embrague', mecanico: 1 },
  { dia: 2, hora: '10:00', placa: 'PAJ-3378', cliente: 'Diego Recalde', servicio: 'Revisión eléctrica', mecanico: 2 },
  { dia: 2, hora: '16:00', placa: 'IBA-7730', cliente: 'Rocío Naranjo', servicio: 'Suspensión delantera', mecanico: 1 },
  { dia: 3, hora: '09:00', placa: 'PCS-2260', cliente: 'Marco Tulcanaza', servicio: 'Escáner y prueba de ruta', mecanico: 0 },
  { dia: 3, hora: '13:30', placa: 'TAA-5678', cliente: 'Patricio Salazar', servicio: 'Entrega de frenos', mecanico: 1 },
  { dia: 4, hora: '08:30', placa: 'PAY-9034', cliente: 'Verónica Simbaña', servicio: 'Mantenimiento 55.000 km', mecanico: 2 },
  { dia: 4, hora: '11:30', placa: 'PBX-1234', cliente: 'Luis Andrade', servicio: 'Prueba de ruta post ABC', mecanico: 0 },
  { dia: 5, hora: '09:00', placa: 'PCA-3391', cliente: 'Mercedes Yépez', servicio: 'Entrega general', mecanico: 0 },
]

// ─── Reportes (decorativos, pero coherentes con lo anterior) ─────────────────
export const INGRESOS_MES = [
  { dia: 1, monto: 420 }, { dia: 2, monto: 615 }, { dia: 3, monto: 380 }, { dia: 4, monto: 0 },
  { dia: 5, monto: 745 }, { dia: 6, monto: 520 }, { dia: 7, monto: 690 }, { dia: 8, monto: 835 },
  { dia: 9, monto: 410 }, { dia: 10, monto: 0 }, { dia: 11, monto: 0 }, { dia: 12, monto: 560 },
  { dia: 13, monto: 720 }, { dia: 14, monto: 495 }, { dia: 15, monto: 910 }, { dia: 16, monto: 640 },
  { dia: 17, monto: 0 }, { dia: 18, monto: 385 }, { dia: 19, monto: 770 }, { dia: 20, monto: 545 },
  { dia: 21, monto: 880 }, { dia: 22, monto: 615 }, { dia: 23, monto: 430 }, { dia: 24, monto: 0 },
  { dia: 25, monto: 0 }, { dia: 26, monto: 695 }, { dia: 27, monto: 810 }, { dia: 28, monto: 575 },
  { dia: 29, monto: 640 }, { dia: 30, monto: 925 },
]

// ─── Visitas pasadas ─────────────────────────────────────────────────────────
//
// Órdenes ya entregadas y facturadas. No salen en el tablero (van `archivada`),
// solo en el historial del vehículo. Sin esto, escribir una placa en Recepción
// mostraría un historial vacío, que es justo lo contrario del efecto buscado.
//
// PBH-0472, PCX-5518 y PBK-4407 son los tres vehículos SIN orden abierta: son los
// que sirven para hacer la recepción en vivo delante del prospecto.
export type VisitaPasada = { haceDias: number; km: number; servicios: [string, number][] }

export const VISITAS_PASADAS: Record<string, VisitaPasada[]> = {
  'PBH-0472': [
    { haceDias: 88, km: 33_400, servicios: [['Cambio de aceite y filtro', 35], ['Alineación y balanceo', 28]] },
    { haceDias: 214, km: 22_900, servicios: [['Mantenimiento de los 20.000 km', 120]] },
    { haceDias: 358, km: 11_200, servicios: [['Primer mantenimiento', 65]] },
  ],
  'PCX-5518': [
    { haceDias: 61, km: 86_300, servicios: [['ABC de motor', 65], ['Cambio de bujías', 42]] },
    { haceDias: 176, km: 74_800, servicios: [['Pastillas de freno delanteras', 86]] },
    { haceDias: 297, km: 63_100, servicios: [['Cambio de aceite y filtro', 35]] },
  ],
  'PBK-4407': [
    { haceDias: 47, km: 138_600, servicios: [['Cambio de amortiguadores', 220]] },
    { haceDias: 152, km: 128_400, servicios: [['Cambio de aceite y filtro', 35], ['Revisión de suspensión', 45]] },
  ],
  'PBX-1234': [
    { haceDias: 119, km: 119_700, servicios: [['Cambio de aceite y filtro', 35]] },
    { haceDias: 268, km: 104_200, servicios: [['Lavado de inyectores', 70], ['Cambio de bujías', 42]] },
  ],
  'TAA-5678': [
    { haceDias: 132, km: 52_800, servicios: [['Cambio de aceite y filtro', 35]] },
  ],
  'PDD-8815': [
    { haceDias: 74, km: 91_500, servicios: [['ABC de motor', 65]] },
    { haceDias: 241, km: 79_300, servicios: [['Cambio de batería', 95]] },
  ],
  'PCS-2260': [
    { haceDias: 93, km: 145_100, servicios: [['Cambio de aceite y filtro', 35], ['Rectificación de discos', 60]] },
  ],
  'GSA-0912': [
    { haceDias: 205, km: 176_400, servicios: [['Correa de distribución', 180]] },
  ],
  'PAY-9034': [
    { haceDias: 168, km: 44_600, servicios: [['Cambio de aceite y filtro', 35]] },
  ],
}

// ─── Lista de precios del taller ─────────────────────────────────────────────
// La misma que usa el formulario de hallazgos. Sale en Configuración porque es
// lo primero que un dueño quiere ver: "¿dónde se cambian mis precios?".
export const CATALOGO_SERVICIOS: { nombre: string; precio: number; horas: number }[] = [
  { nombre: 'Diagnóstico electrónico', precio: 25, horas: 0.5 },
  { nombre: 'Alineación y balanceo', precio: 28, horas: 0.75 },
  { nombre: 'Cambio de refrigerante', precio: 30, horas: 0.75 },
  { nombre: 'Cambio de aceite y filtro', precio: 35, horas: 0.5 },
  { nombre: 'Cambio de bujías', precio: 42, horas: 1 },
  { nombre: 'Revisión de suspensión', precio: 45, horas: 1 },
  { nombre: 'Rectificación de discos', precio: 60, horas: 1.5 },
  { nombre: 'ABC de motor', precio: 65, horas: 2 },
  { nombre: 'Lavado de inyectores', precio: 70, horas: 2 },
  { nombre: 'Pastillas de freno delanteras', precio: 86, horas: 1.5 },
  { nombre: 'Cambio de batería', precio: 95, horas: 0.5 },
  { nombre: 'Correa de distribución', precio: 180, horas: 4 },
  { nombre: 'Cambio de amortiguadores', precio: 220, horas: 3 },
  { nombre: 'Kit de embrague', precio: 340, horas: 6 },
]


// ─── Doce meses de historia ──────────────────────────────────────────────────
//
// Facturación y reportes solo se sostienen con volumen: una tabla con tres filas
// y un gráfico con dos barras se ven como una maqueta. Esto genera entre 45 y 70
// comprobantes por mes durante 12 meses, con tendencia creciente para que la
// comparación contra el mes anterior diga algo de verdad.
//
// Es determinista a partir del nombre del taller: el mismo enlace enseña siempre
// los mismos números, y dos prospectos distintos ven talleres distintos.

export type EstadoFactura = 'autorizada' | 'anulada' | 'nota_credito'

export type VisitaGenerada = {
  placa: string
  entro: string // ISO: cuándo ingresó el carro
  salio: string // ISO: cuándo se entregó y se facturó
  km: number
  mecanico: number
  estadoFactura: EstadoFactura
  servicios: { nombre: string; precio: number; horas: number }[]
  /** Lo que se encontró durante el diagnóstico y hubo que consultarle al dueño.
   *  Sin esto, la tasa de aprobación de presupuestos no tendría de dónde salir. */
  hallazgo: { nombre: string; precio: number; horas: number; aprobado: boolean } | null
}

/** Generador reproducible. Mismo taller, mismos números, siempre. */
export function azar(semilla: number) {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * A quién le toca el trabajo, según lo que cuesta.
 *
 * No es un sorteo plano: cada mecánico tira más de un tipo de trabajo. Un
 * trabajo barato pesa por `pesoBarato`, uno caro por lo contrario, y el
 * `volumen` inclina cuántos carros pasan por cada uno.
 */
function elegirMecanico(r: () => number, mayorTrabajo: number): number {
  // La banda mira el trabajo MÁS GRANDE de la visita, no la suma: con la suma,
  // casi ninguna visita bajaba de 60 —van de uno a tres servicios— y los tres
  // perfiles volvían a parecerse. Y con dos bandas el de los trabajos grandes
  // acababa primero en carros Y en plata, que es la historia aburrida.
  const banda = mayorTrabajo >= 150 ? 'grande' : mayorTrabajo >= 60 ? 'medio' : 'chico'
  const pesos = PERFILES.map((p) => p[banda] * p.volumen)
  const total = pesos.reduce((a, b) => a + b, 0)
  let corte = r() * total
  for (let i = 0; i < pesos.length; i++) {
    corte -= pesos[i]
    if (corte <= 0) return i
  }
  return pesos.length - 1
}

/** Un instante visto con el reloj de Ecuador, que es UTC-5 fijo todo el año. */
function enEcuador(d: Date): Date {
  return new Date(d.getTime() - 5 * 3_600_000)
}

export function semillaDe(texto: string): number {
  let h = 2166136261
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return h >>> 0
}

/**
 * Doce meses de comprobantes, agrupados por mes CALENDARIO —no por bloques de
 * treinta días— porque el cierre contable se lee por mes y cualquier otra cosa
 * daría cifras que no cuadran con lo que el dueño espera.
 *
 * Entre 46 y 70 al mes, con tendencia creciente para que la comparación contra
 * el mes anterior sea casi siempre positiva y diga algo. El mes en curso se
 * prorratea por los días transcurridos: si no, el taller parecería haberse caído.
 */
export function generarHistorial(semilla: number): VisitaGenerada[] {
  const r = azar(semilla)
  const visitas: VisitaGenerada[] = []
  const hoy = new Date()

  for (let atras = 11; atras >= 0; atras--) {
    const anio = hoy.getUTCFullYear()
    const mes = hoy.getUTCMonth() - atras
    const diasDelMes = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate()
    const enCurso = atras === 0
    const diasHabiles = enCurso ? hoy.getUTCDate() : diasDelMes

    const tendencia = 46 + Math.round((11 - atras) * 2.1)
    const objetivo = Math.max(46, Math.min(70, tendencia + Math.round((r() - 0.5) * 7)))
    const cuantas = enCurso ? Math.max(3, Math.round((objetivo * diasHabiles) / diasDelMes)) : objetivo

    for (let n = 0; n < cuantas; n++) {
      // Día del mes; los domingos casi no se abre, así que se vuelve a sortear.
      let dia = 1 + Math.floor(r() * diasHabiles)
      for (let intento = 0; intento < 3; intento++) {
        if (new Date(Date.UTC(anio, mes, dia)).getUTCDay() !== 0) break
        dia = 1 + Math.floor(r() * diasHabiles)
      }

      const cuantos = r() < 0.55 ? 1 : r() < 0.88 ? 2 : 3
      const elegidos = new Set<number>()
      while (elegidos.size < cuantos) elegidos.add(Math.floor(r() * CATALOGO_SERVICIOS.length))
      const servicios = [...elegidos].map((i) => CATALOGO_SERVICIOS[i])

      const horas = servicios.reduce((a, sv) => a + sv.horas, 0)
      // Con granularidad de hora, decenas de visitas caían en el mismo instante
      // exacto: el orden entre ellas quedaba al azar y 646 órdenes con minuto
      // repetido se ven inventadas. Los minutos las separan.
      const entro = new Date(
        Date.UTC(anio, mes, dia, 13 + Math.floor(r() * 4), Math.floor(r() * 60), Math.floor(r() * 60)),
      ) // 08–11 en Ecuador
      // Los días que el carro pasa adentro son días LABORABLES: el taller no
      // abre en domingo, así que un carro que entra el viernes y necesita dos
      // días sale el martes. Modelarlo así es lo único que da cero facturas
      // dominicales sin amontonarlas en otro día.
      const enTaller = Math.max(0, Math.round(horas / 4 + r() * 1.6))
      let salio = new Date(entro.getTime())
      for (let dia = 0; dia < enTaller; dia++) {
        salio = new Date(salio.getTime() + 86_400_000)
        if (enEcuador(salio).getUTCDay() === 0) salio = new Date(salio.getTime() + 86_400_000)
      }
      salio = new Date(salio.getTime() + (4 + r() * 5) * 3_600_000)
      // Sumar las horas puede empujar la entrega al domingo por la madrugada.
      if (enEcuador(salio).getUTCDay() === 0) salio = new Date(salio.getTime() + 26 * 3_600_000)

      // Si la entrega cae en el futuro se retrocede una cantidad distinta cada
      // vez: recortarlas todas contra "ahora" dejaba media docena de facturas
      // con el mismo minuto, y eso se ve inventado a la primera mirada.
      // Si la entrega cae en el futuro se retrocede, y si al retroceder cae en
      // domingo se retrocede un día más. El domingo se esquivaba al elegir la
      // ENTRADA pero no al calcular la SALIDA, y la factura se emite a la salida:
      // salían 95 comprobantes dominicales, más que un lunes.
      if (salio > hoy) {
        salio = new Date(hoy.getTime() - (1 + r() * 9) * 3_600_000)
        if (enEcuador(salio).getUTCDay() === 0) salio = new Date(salio.getTime() - 24 * 3_600_000)
      }

      // EL CARRO SE ELIGE DESPUÉS DE SABER CUÁNDO SALIÓ, y solo entre los que no
      // estaban adentro en esa fecha.
      //
      // Un vehículo que hoy sigue en el tablero no puede tener una factura
      // posterior a su ingreso: sería un carro entregado y cobrado mientras está
      // en la bahía. Salían cuatro casos así —PAJ-3378 en reparación con dos
      // facturas de hoy— y es de las cosas que un dueño de taller ve enseguida.
      const disponibles = VEHICULOS.filter((v) => {
        const dentro = ORDENES.find((o) => o.placa === v.placa)
        return !dentro || salio.getTime() < hoy.getTime() - dentro.haceMin * 60_000
      })
      const vehiculo = disponibles[Math.floor(r() * disponibles.length)]

      // El carro tenía menos kilómetros cuanto más atrás se mire.
      const diasAtras = Math.max(0, (hoy.getTime() - entro.getTime()) / 86_400_000)
      const km = Math.max(1200, vehiculo.km - Math.round(diasAtras * (25 + r() * 45)))

      const sorteo = r()
      const estadoFactura: EstadoFactura =
        sorteo > 0.965 ? 'anulada' : sorteo > 0.94 ? 'nota_credito' : 'autorizada'

      // Cuatro de cada diez visitas destapan algo que hay que consultar; de esas,
      // la gran mayoría se aprueba.
      const hayHallazgo = r() < 0.4
      const extra = CATALOGO_SERVICIOS[Math.floor(r() * CATALOGO_SERVICIOS.length)]
      const hallazgo = hayHallazgo
        ? { nombre: extra.nombre, precio: extra.precio, horas: extra.horas, aprobado: r() < 0.82 }
        : null

      visitas.push({
        placa: vehiculo.placa,
        hallazgo,
        entro: entro.toISOString(),
        salio: salio.toISOString(),
        km,
        // Lo que va a costar la visita decide a quién le toca. Se calcula aquí
        // igual que en la siembra: servicios más el hallazgo si lo aprobaron.
        // Quién hace el trabajo lo decide el trabajo más grande de la visita,
        // que es como se reparte en un taller de verdad.
        mecanico: elegirMecanico(
          r,
          Math.max(...servicios.map((sv) => sv.precio), hallazgo?.aprobado ? hallazgo.precio : 0),
        ),
        estadoFactura,
        servicios,
      })
    }
  }

  return visitas
}
