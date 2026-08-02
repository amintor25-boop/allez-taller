'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { dinero } from '@/lib/dominio'
import type { Repuesto } from '@/lib/consultas-decorativas'

// El inventario del taller. Los datos salen de la misma semilla que el tablero:
// las pastillas del Sail que están al límite en el hallazgo son las mismas que
// aquí aparecen con 2 de 4 en bodega.
//
// Lo que el prospecto da de alta sobrevive al reinicio de las 48 horas; lo
// sembrado vuelve a su estado inicial.
//
// Los dos formularios funcionan sin JavaScript: los disparadores son enlaces de
// verdad y el envío es un <form> nativo que la ruta contesta con un redirect.
// Con JavaScript nada de eso navega —se abre en el sitio y se guarda con fetch—,
// pero si el guion no llega a correr la pantalla sigue sirviendo.

/**
 * Las existencias, como barra, con una marca vertical en el mínimo.
 *
 * La escala llega al doble del mínimo: por encima de eso da igual cuánto haya,
 * lo único que se pregunta es si falta. Un repuesto sin mínimo —el prospecto
 * puede dejar el campo vacío al darlo de alta— no tiene nada que comparar, así
 * que no se dibuja nada en vez de dibujar una barra que miente.
 */
function BarraExistencias({ stock, minimo }: { stock: number; minimo: number }) {
  if (minimo <= 0) return null

  const escala = minimo * 2
  const ancho = Math.min(100, (stock / escala) * 100)
  const marca = (minimo / escala) * 100
  const corto = stock < minimo

  return (
    <span
      className="relative mt-1 block h-1 w-full overflow-hidden rounded-full bg-columna"
      aria-hidden
    >
      <span
        className={`absolute inset-y-0 left-0 rounded-full ${corto ? 'bg-media' : 'bg-accion'}`}
        style={{ width: `${Math.max(3, ancho)}%` }}
      />
      <span
        className="absolute inset-y-0 w-px bg-tinta-2"
        style={{ left: `${marca}%` }}
      />
    </span>
  )
}

const CATEGORIAS = ['Filtros', 'Lubricantes', 'Frenos', 'Suspensión', 'Eléctrico', 'Motor', 'Otros']
const MOTIVOS = ['Conteo físico', 'Compra a proveedor', 'Devolución', 'Merma o daño', 'Corrección']

export function Inventario({
  slug,
  repuestos,
  abrirAlta = false,
  abrirAjuste = null,
  aviso = null,
}: {
  slug: string
  repuestos: Repuesto[]
  abrirAlta?: boolean
  abrirAjuste?: string | null
  aviso?: string | null
}) {
  const router = useRouter()

  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState<string | null>(null)
  const [alta, setAlta] = useState(abrirAlta)
  const [ajustando, setAjustando] = useState<string | null>(abrirAjuste)

  const categorias = useMemo(
    () => [...new Set(repuestos.map((r) => r.categoria))].sort(),
    [repuestos],
  )
  const bajos = repuestos.filter((r) => r.stock < r.stock_minimo)

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return repuestos.filter(
      (r) =>
        (!categoria || r.categoria === categoria) &&
        (!q || r.nombre.toLowerCase().includes(q) || r.codigo.toLowerCase().includes(q)),
    )
  }, [repuestos, busca, categoria])

  const valorTotal = repuestos.reduce((s, r) => s + r.precio * r.stock, 0)

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-titulo text-pantalla text-tinta">Inventario</h1>
          <p className="mt-1 text-meta text-tinta-2">
            {repuestos.length} repuestos · {dinero(valorTotal)} en bodega
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {bajos.length > 0 && (
            <span className="flex h-11 items-center gap-2 rounded-lg border border-media/40 bg-[#F59E0B14] px-3 text-meta font-semibold text-media">
              <span className="h-1.5 w-1.5 rounded-full bg-media" aria-hidden />
              {bajos.length} bajo el mínimo
            </span>
          )}
          <a
            href="?alta=1"
            onClick={(e) => {
              e.preventDefault()
              setAlta(true)
            }}
            className="presionable flex h-11 items-center gap-1.5 rounded-lg bg-accion px-4 text-cuerpo font-semibold text-white hover:bg-accion-hover"
          >
            <span aria-hidden>+</span> Nuevo repuesto
          </a>
        </div>
      </div>

      {alta && (
        <FormularioAlta
          slug={slug}
          aviso={aviso}
          onCerrar={() => setAlta(false)}
          onListo={() => {
            setAlta(false)
            router.refresh()
          }}
        />
      )}

      {bajos.length > 0 && (
        <section className="mt-5 overflow-hidden rounded-xl border border-media/30 bg-superficie">
          <h2 className="border-b border-borde px-5 py-3 text-etiqueta font-semibold uppercase text-media">
            Hay que pedir
          </h2>
          <ul>
            {bajos.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-borde px-5 py-3 last:border-0"
              >
                <span className="min-w-0 flex-1 text-cuerpo text-tinta">{r.nombre}</span>
                <span className="cifras text-meta text-tinta-3">{r.ubicacion}</span>
                <span className="cifras text-cuerpo font-semibold text-media">
                  {r.stock} de {r.stock_minimo}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar repuesto o código"
          className="h-11 min-w-0 flex-1 rounded-xl border border-borde bg-superficie px-4 text-[15px] text-tinta placeholder:text-tinta-3 sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          <Ficha activa={categoria === null} onClick={() => setCategoria(null)}>
            Todo
          </Ficha>
          {categorias.map((c) => (
            <Ficha key={c} activa={categoria === c} onClick={() => setCategoria(c)}>
              {c}
            </Ficha>
          ))}
        </div>
      </div>

      <section className="mt-4 overflow-hidden rounded-xl border border-borde bg-superficie">
        <div className="hidden grid-cols-[1fr_5rem_7rem_6rem_7rem] items-center gap-4 border-b border-borde px-5 py-3 text-etiqueta font-semibold uppercase text-tinta-2 sm:grid">
          <span>Repuesto</span>
          <span className="text-right">Ubicación</span>
          <span className="text-right">Stock</span>
          <span className="text-right">Precio</span>
          <span className="text-right">Ajustar</span>
        </div>

        {lista.length === 0 ? (
          <p className="px-5 py-8 text-center text-cuerpo text-tinta-2">
            Ningún repuesto coincide con «{busca}».
            <button
              type="button"
              onClick={() => {
                setBusca('')
                setCategoria(null)
              }}
              className="ml-2 font-semibold text-accion-texto underline underline-offset-4"
            >
              Ver todos
            </button>
          </p>
        ) : (
          <ul>
            {lista.map((r) => {
              const bajo = r.stock < r.stock_minimo
              return (
                <li key={r.id} id={r.id} className="border-b border-borde last:border-0 target:bg-columna">
                  <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 sm:grid-cols-[1fr_5rem_7rem_6rem_7rem]">
                    <div className="min-w-0">
                      <p className="truncate text-cuerpo text-tinta">{r.nombre}</p>
                      <p className="cifras text-meta text-tinta-3">
                        {r.codigo} · {r.categoria}
                        {!r.sembrada && <span className="text-accion-texto"> · agregado por usted</span>}
                      </p>
                    </div>
                    <span className="cifras hidden text-right text-meta text-tinta-2 sm:block">
                      {r.ubicacion}
                    </span>
                    {/* El número se queda; debajo va la barra con una marca en
                        el mínimo. La pregunta es "¿qué se me está por acabar?",
                        y hoy hay que restar catorce pares de números para
                        contestarla. Con la marca, lo corto salta solo. */}
                    <span className="text-right">
                      <span
                        className={`cifras block text-cuerpo font-semibold ${
                          bajo ? 'text-media' : 'text-tinta-2'
                        }`}
                      >
                        {r.stock}
                        <span className="text-tinta-3"> / {r.stock_minimo}</span>
                      </span>
                      <BarraExistencias stock={r.stock} minimo={r.stock_minimo} />
                    </span>
                    <span className="cifras hidden text-right text-cuerpo font-semibold text-tinta sm:block">
                      {dinero(r.precio)}
                    </span>
                    <div className="col-span-2 flex justify-end sm:col-span-1">
                      <a
                        href={ajustando === r.id ? '?' : `?ajuste=${r.id}#${r.id}`}
                        onClick={(e) => {
                          e.preventDefault()
                          setAjustando(ajustando === r.id ? null : r.id)
                        }}
                        aria-expanded={ajustando === r.id}
                        className="presionable flex h-11 items-center rounded-lg border border-borde px-3 text-meta font-semibold text-tinta-2 hover:border-borde-fuerte hover:text-tinta"
                      >
                        {ajustando === r.id ? 'Cerrar' : 'Ajustar'}
                      </a>
                    </div>
                  </div>

                  {ajustando === r.id && (
                    <Ajuste
                      slug={slug}
                      repuesto={r}
                      aviso={abrirAjuste === r.id ? aviso : null}
                      onListo={() => {
                        setAjustando(null)
                        router.refresh()
                      }}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}

// ─── Ajustar existencias ─────────────────────────────────────────────────────

function Ajuste({
  slug,
  repuesto,
  aviso,
  onListo,
}: {
  slug: string
  repuesto: Repuesto
  aviso: string | null
  onListo: () => void
}) {
  const [cantidad, setCantidad] = useState(String(repuesto.stock))
  const [motivo, setMotivo] = useState(MOTIVOS[0])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(aviso)
  const conGuion = hidratado()

  const nuevo = Math.max(0, Number(cantidad) || 0)
  const diferencia = nuevo - repuesto.stock

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      const r = await fetch(`/api/d/${slug}/inventario/${repuesto.id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ stock: nuevo, motivo }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'No se pudo ajustar')
      onListo()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo ajustar')
      setGuardando(false)
    }
  }

  return (
    <form
      method="post"
      action={`/api/d/${slug}/inventario/${repuesto.id}`}
      onSubmit={guardar}
      className="border-t border-borde bg-columna px-5 py-4"
    >
      <p className="text-etiqueta font-semibold uppercase text-tinta-2">
        Ajustar existencias · hay {repuesto.stock}
      </p>

      {/*
        Los botones actualizan con la forma de función a propósito. Con
        `setCantidad(String(nuevo + 1))`, dos toques seguidos —lo normal cuando
        alguien cuenta piezas— leen los dos el mismo valor viejo y solo suman
        uno. Medido: de 5 se pasaba a 6, no a 7.
      */}
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Uno menos"
            onClick={() => setCantidad((c) => String(Math.max(0, (Number(c) || 0) - 1)))}
            className="presionable h-11 w-11 rounded-lg border border-borde text-[20px] text-tinta-2 hover:border-borde-fuerte hover:text-tinta"
          >
            −
          </button>
          <input
            name="stock"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            aria-label="Cantidad en bodega"
            className="cifras h-11 w-20 rounded-lg border border-borde bg-superficie text-center text-[17px] font-semibold text-tinta"
          />
          <button
            type="button"
            aria-label="Uno más"
            onClick={() => setCantidad((c) => String(Math.min(9999, (Number(c) || 0) + 1)))}
            className="presionable h-11 w-11 rounded-lg border border-borde text-[20px] text-tinta-2 hover:border-borde-fuerte hover:text-tinta"
          >
            +
          </button>
        </div>

        <select
          name="motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          aria-label="Motivo del ajuste"
          className="h-11 rounded-lg border border-borde bg-superficie px-3 text-meta text-tinta"
        >
          {MOTIVOS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>

        <button
          type="submit"
          disabled={guardando || (conGuion && diferencia === 0)}
          className="presionable h-11 rounded-lg bg-accion px-4 text-cuerpo font-semibold text-white hover:bg-accion-hover disabled:opacity-40"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>

        {diferencia !== 0 && (
          <span
            className={`cifras text-meta font-semibold ${
              diferencia > 0 ? 'text-aprobado' : 'text-media'
            }`}
          >
            {diferencia > 0 ? '+' : ''}
            {diferencia}
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-alta px-3 py-2 text-meta text-tinta">
          {error}
        </p>
      )}

      {repuesto.movimientos.length > 0 && (
        <>
          <p className="mt-4 text-etiqueta font-semibold uppercase text-tinta-2">
            Últimos movimientos
          </p>
          <ul className="mt-2 space-y-1.5">
            {repuesto.movimientos.map((m) => (
              <li key={m.id} className="flex items-baseline gap-3 text-meta">
                <span
                  className={`cifras w-8 shrink-0 font-semibold ${
                    m.cantidad > 0 ? 'text-aprobado' : 'text-media'
                  }`}
                >
                  {m.cantidad > 0 ? '+' : ''}
                  {m.cantidad}
                </span>
                <span className="min-w-0 flex-1 truncate text-tinta-2">{m.motivo}</span>
                <span className="cifras shrink-0 text-tinta-3">{m.cuando}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </form>
  )
}

// ─── Alta de repuesto ────────────────────────────────────────────────────────

function FormularioAlta({
  slug,
  aviso,
  onCerrar,
  onListo,
}: {
  slug: string
  aviso: string | null
  onCerrar: () => void
  onListo: () => void
}) {
  const [c, setC] = useState({
    nombre: '',
    categoria: CATEGORIAS[0],
    codigo: '',
    stock: '',
    minimo: '',
    precio: '',
    ubicacion: '',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(aviso)
  const conGuion = hidratado()

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      const r = await fetch(`/api/d/${slug}/inventario`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...c,
          stock: Number(c.stock) || 0,
          minimo: Number(c.minimo) || 0,
          precio: Number(c.precio) || 0,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'No se pudo guardar')
      onListo()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
      setGuardando(false)
    }
  }

  const listo = c.nombre.trim() !== '' && Number(c.precio) > 0

  return (
    <form
      method="post"
      action={`/api/d/${slug}/inventario`}
      onSubmit={guardar}
      className="entra mt-5 rounded-xl border border-accion bg-superficie p-5"
    >
      <h2 className="font-titulo text-seccion text-tinta">Nuevo repuesto</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre" ancho>
          <input
            name="nombre"
            value={c.nombre}
            onChange={(e) => setC({ ...c, nombre: e.target.value })}
            placeholder="Pastillas de freno delanteras Sail"
            className={entrada}
          />
        </Campo>

        <Campo etiqueta="Categoría">
          <select
            name="categoria"
            value={c.categoria}
            onChange={(e) => setC({ ...c, categoria: e.target.value })}
            className={entrada}
          >
            {CATEGORIAS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Código" ayuda="Si lo deja vacío se genera uno">
          <input
            name="codigo"
            value={c.codigo}
            onChange={(e) => setC({ ...c, codigo: e.target.value.toUpperCase() })}
            placeholder="FRE-3301"
            className={`cifras ${entrada}`}
          />
        </Campo>

        <Campo etiqueta="Cantidad en bodega">
          <input
            name="stock"
            value={c.stock}
            onChange={(e) => setC({ ...c, stock: e.target.value.replace(/\D/g, '').slice(0, 4) })}
            inputMode="numeric"
            placeholder="0"
            className={`cifras ${entrada}`}
          />
        </Campo>

        <Campo etiqueta="Avisar cuando baje de">
          <input
            name="minimo"
            value={c.minimo}
            onChange={(e) => setC({ ...c, minimo: e.target.value.replace(/\D/g, '').slice(0, 4) })}
            inputMode="numeric"
            placeholder="4"
            className={`cifras ${entrada}`}
          />
        </Campo>

        <Campo etiqueta="Precio de venta" ayuda="IVA incluido">
          <input
            name="precio"
            value={c.precio}
            onChange={(e) => setC({ ...c, precio: e.target.value.replace(/[^\d.]/g, '').slice(0, 8) })}
            inputMode="decimal"
            placeholder="86"
            className={`cifras ${entrada}`}
          />
        </Campo>

        <Campo etiqueta="Ubicación en bodega">
          <input
            name="ubicacion"
            value={c.ubicacion}
            onChange={(e) => setC({ ...c, ubicacion: e.target.value.toUpperCase().slice(0, 12) })}
            placeholder="C-4"
            className={`cifras ${entrada}`}
          />
        </Campo>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-alta px-3 py-2 text-meta text-tinta">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={guardando || (conGuion && !listo)}
          className="presionable h-12 rounded-xl bg-accion px-5 text-cuerpo font-semibold text-white hover:bg-accion-hover disabled:opacity-40"
        >
          {guardando ? 'Guardando…' : 'Guardar repuesto'}
        </button>
        <a
          href="?"
          onClick={(e) => {
            e.preventDefault()
            onCerrar()
          }}
          className="flex h-12 items-center rounded-xl px-4 text-cuerpo text-tinta-2 hover:text-tinta"
        >
          Cancelar
        </a>
      </div>
    </form>
  )
}

/**
 * Verdadero solo después de hidratar. Sirve para no apagar un botón que sin
 * JavaScript nunca se volvería a encender: en el servidor no hay forma de saber
 * si el formulario está completo.
 */
function hidratado(): boolean {
  const [listo, setListo] = useState(false)
  useEffect(() => setListo(true), [])
  return listo
}

const entrada =
  'h-12 w-full rounded-xl border border-borde bg-elevada px-4 text-[16px] text-tinta placeholder:text-tinta-3'

function Campo({
  etiqueta,
  ayuda,
  ancho,
  children,
}: {
  etiqueta: string
  ayuda?: string
  ancho?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={ancho ? 'sm:col-span-2' : ''}>
      <p className="mb-2 text-etiqueta font-semibold uppercase text-tinta-2">{etiqueta}</p>
      {children}
      {ayuda && <p className="mt-1.5 text-meta text-tinta-3">{ayuda}</p>}
    </div>
  )
}

function Ficha({
  activa,
  onClick,
  children,
}: {
  activa: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={`presionable h-11 rounded-xl border px-3.5 text-meta font-semibold ${
        activa
          ? 'border-accion bg-accion text-white'
          : 'border-borde bg-superficie text-tinta-2 hover:border-borde-fuerte hover:text-tinta'
      }`}
    >
      {children}
    </button>
  )
}
