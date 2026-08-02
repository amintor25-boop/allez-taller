// DDL como constantes de TypeScript, no como archivo .sql suelto: en una función
// serverless de Netlify no hay garantía de poder leer archivos del proyecto.
//
// Regla del proyecto: TODA tabla lleva demo_id. Los datos del taller González
// jamás se cruzan con los del taller Pérez. Las claves únicas son (demo_id, …).

export const ESQUEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS demos (
     id             TEXT PRIMARY KEY,
     slug           TEXT NOT NULL UNIQUE,
     taller_nombre  TEXT NOT NULL,
     telefono       TEXT,
     ciudad         TEXT NOT NULL DEFAULT 'Quito',
     ruc            TEXT NOT NULL,
     creado_en      TEXT NOT NULL,
     sembrado_en    TEXT NOT NULL,
     ultima_actividad TEXT NOT NULL,
     tour_visto     INTEGER NOT NULL DEFAULT 0,
     secuencial     INTEGER NOT NULL DEFAULT 0
   )`,

  `CREATE TABLE IF NOT EXISTS mecanicos (
     id          TEXT PRIMARY KEY,
     demo_id     TEXT NOT NULL,
     nombre      TEXT NOT NULL,
     especialidad TEXT NOT NULL,
     orden       INTEGER NOT NULL DEFAULT 0
   )`,
  `CREATE INDEX IF NOT EXISTS ix_mecanicos_demo ON mecanicos (demo_id)`,

  `CREATE TABLE IF NOT EXISTS clientes (
     id        TEXT PRIMARY KEY,
     demo_id   TEXT NOT NULL,
     nombre    TEXT NOT NULL,
     telefono  TEXT NOT NULL,
     cedula    TEXT NOT NULL,
     correo    TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS ix_clientes_demo ON clientes (demo_id)`,

  `CREATE TABLE IF NOT EXISTS vehiculos (
     id          TEXT PRIMARY KEY,
     demo_id     TEXT NOT NULL,
     cliente_id  TEXT NOT NULL,
     placa       TEXT NOT NULL,
     marca       TEXT NOT NULL,
     modelo      TEXT NOT NULL,
     anio        INTEGER NOT NULL,
     color       TEXT NOT NULL,
     kilometraje INTEGER NOT NULL DEFAULT 0
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ux_vehiculos_placa ON vehiculos (demo_id, placa)`,

  `CREATE TABLE IF NOT EXISTS ordenes (
     id            TEXT PRIMARY KEY,
     demo_id       TEXT NOT NULL,
     numero        INTEGER NOT NULL,
     vehiculo_id   TEXT NOT NULL,
     cliente_id    TEXT NOT NULL,
     mecanico_id   TEXT,
     estado        TEXT NOT NULL,
     prioridad     TEXT NOT NULL DEFAULT 'baja',
     kilometraje   INTEGER NOT NULL DEFAULT 0,
     combustible   TEXT NOT NULL DEFAULT '1/2',
     observacion   TEXT NOT NULL DEFAULT '',
     token_publico TEXT NOT NULL,
     presupuesto_enviado_en TEXT,
     respondido_en TEXT,
     respondido_por TEXT,
     orden_columna INTEGER NOT NULL DEFAULT 0,
     archivada     INTEGER NOT NULL DEFAULT 0,
     creada_en     TEXT NOT NULL,
     actualizada_en TEXT NOT NULL
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ux_ordenes_numero ON ordenes (demo_id, numero)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ux_ordenes_token ON ordenes (token_publico)`,
  `CREATE INDEX IF NOT EXISTS ix_ordenes_tablero ON ordenes (demo_id, archivada, estado, orden_columna)`,
  `CREATE INDEX IF NOT EXISTS ix_ordenes_vehiculo ON ordenes (demo_id, vehiculo_id)`,

  `CREATE TABLE IF NOT EXISTS items (
     id          TEXT PRIMARY KEY,
     demo_id     TEXT NOT NULL,
     orden_id    TEXT NOT NULL,
     tipo        TEXT NOT NULL,
     descripcion TEXT NOT NULL,
     detalle     TEXT NOT NULL DEFAULT '',
     precio      INTEGER NOT NULL,          -- centavos, IVA incluido
     horas       REAL NOT NULL DEFAULT 0,   -- horas de taller que se facturan
     estado      TEXT NOT NULL DEFAULT 'incluido',
     foto_id     TEXT,
     creado_en   TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS ix_items_orden ON items (demo_id, orden_id)`,

  // Las fotos sembradas viven en /public/fotos (ruta_estatica).
  // Las que se suben en vivo se comprimen en el navegador a 150 KB y llegan aquí
  // como base64. Nunca se seleccionan en consultas de lista.
  `CREATE TABLE IF NOT EXISTS fotos (
     id            TEXT PRIMARY KEY,
     demo_id       TEXT NOT NULL,
     orden_id      TEXT,
     mime          TEXT NOT NULL DEFAULT 'image/jpeg',
     datos         TEXT,
     ruta_estatica TEXT,
     creada_en     TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS ix_fotos_demo ON fotos (demo_id)`,

  `CREATE TABLE IF NOT EXISTS facturas (
     id           TEXT PRIMARY KEY,
     demo_id      TEXT NOT NULL,
     orden_id     TEXT NOT NULL,
     numero       TEXT NOT NULL,
     clave_acceso TEXT NOT NULL,
     subtotal     INTEGER NOT NULL,
     iva          INTEGER NOT NULL,
     total        INTEGER NOT NULL,
     estado       TEXT NOT NULL DEFAULT 'autorizada',
     emitida_en   TEXT NOT NULL
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ux_facturas_orden ON facturas (demo_id, orden_id)`,
  `CREATE INDEX IF NOT EXISTS ix_facturas_fecha ON facturas (demo_id, emitida_en DESC)`,

  `CREATE TABLE IF NOT EXISTS movimientos (
     id         TEXT PRIMARY KEY,
     demo_id    TEXT NOT NULL,
     orden_id   TEXT NOT NULL,
     desde      TEXT,
     hasta      TEXT NOT NULL,
     nota       TEXT NOT NULL DEFAULT '',
     creado_en  TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS ix_movimientos_orden ON movimientos (demo_id, orden_id)`,

  `CREATE TABLE IF NOT EXISTS inventario (
     id           TEXT PRIMARY KEY,
     demo_id      TEXT NOT NULL,
     codigo       TEXT NOT NULL,
     nombre       TEXT NOT NULL,
     categoria    TEXT NOT NULL,
     stock        INTEGER NOT NULL,
     stock_minimo INTEGER NOT NULL,
     precio       INTEGER NOT NULL,
     ubicacion    TEXT NOT NULL,
     sembrada     INTEGER NOT NULL DEFAULT 1
   )`,
  `CREATE INDEX IF NOT EXISTS ix_inventario_demo ON inventario (demo_id)`,

  `CREATE TABLE IF NOT EXISTS citas (
     id          TEXT PRIMARY KEY,
     demo_id     TEXT NOT NULL,
     dia         INTEGER NOT NULL,          -- 0 lunes … 5 sábado
     hora        TEXT NOT NULL,
     placa       TEXT NOT NULL,
     cliente     TEXT NOT NULL,
     servicio    TEXT NOT NULL,
     horas       REAL NOT NULL DEFAULT 1,
     mecanico_id TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS ix_citas_demo ON citas (demo_id, dia)`,

  // Cada entrada y cada salida de bodega, con su motivo. Sin esto, un stock que
  // cambia solo al facturar parece un error del sistema en vez de una función.
  `CREATE TABLE IF NOT EXISTS movimientos_stock (
     id          TEXT PRIMARY KEY,
     demo_id     TEXT NOT NULL,
     repuesto_id TEXT NOT NULL,
     cantidad    INTEGER NOT NULL,          -- negativo cuando sale
     motivo      TEXT NOT NULL,
     orden_id    TEXT,
     creado_en   TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS ix_mov_stock ON movimientos_stock (demo_id, repuesto_id, creado_en DESC)`,

  // Registro de uso: con esto se llama al prospecto al día siguiente.
  `CREATE TABLE IF NOT EXISTS eventos (
     id        INTEGER PRIMARY KEY AUTOINCREMENT,
     demo_id   TEXT NOT NULL,
     tipo      TEXT NOT NULL,
     detalle   TEXT NOT NULL DEFAULT '',
     creado_en TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS ix_eventos_demo ON eventos (demo_id, creado_en DESC)`,
]

/**
 * Cambios sobre bases que ya existen. SQLite no tiene `ADD COLUMN IF NOT EXISTS`,
 * así que se ejecutan una por una y se ignora el error de columna repetida.
 */
export const MIGRACIONES: string[] = [
  `ALTER TABLE ordenes ADD COLUMN archivada INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE facturas ADD COLUMN estado TEXT NOT NULL DEFAULT 'autorizada'`,
  `ALTER TABLE items ADD COLUMN horas REAL NOT NULL DEFAULT 0`,
  `ALTER TABLE inventario ADD COLUMN sembrada INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE citas ADD COLUMN horas REAL NOT NULL DEFAULT 1`,
]
