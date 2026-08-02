'use client'

import { useState } from 'react'
import { Placa } from '@/components/Placa'
import { dinero, telefonoLegible, telefonoMarcable, type Estado } from '@/lib/dominio'

// LA PÁGINA DEL CLIENTE.
//
// Para quién es: un señor de 55 años parado en la vereda, con sol en la pantalla,
// datos móviles lentos y ninguna gana de entender nada. Si tiene que pensar dos
// segundos qué botón tocar, está mal hecha.
//
// Reglas que gobiernan todo lo de abajo:
//   · cero jerga técnica          · dos botones y nada más que decidir
//   · foto grande, letra grande   · el precio es el final, IVA incluido
//   · siempre hay un teléfono al que llamar
//
// TODO LO ESENCIAL FUNCIONA SIN JAVASCRIPT. Los dos botones son un <form> nativo
// que hace POST y vuelve por redirección. Si el celular es viejo, tiene el JS
// bloqueado o la red se cortó a mitad de la carga, los botones igual responden.
// El JavaScript solo agrega encima: envío sin recargar y reintento automático.

export type ItemVista = {
  id: string
  descripcion: string
  detalle: string
  precio: number
  fotoUrl: string | null
}

export type DatosVista = {
  token: string
  taller: string
  telefono: string
  placa: string
  vehiculo: string
  cliente: string
  mecanico: string | null
  estadoOrden: Estado
  propuestos: ItemVista[]
  yaAprobados: ItemVista[]
  respuesta: 'aprobado' | 'rechazado' | null
  aviso: 'error' | null
  factura: { numero: string; total: number } | null
  // Todo lo que entra en la factura, no solo el hallazgo aprobado.
  facturados: ItemVista[]
}

const ESTADO_EN_CRISTIANO: Record<Estado, string> = {
  ingresado: 'Ya lo recibimos. Entra a revisión en un momento.',
  diagnostico: 'Lo estamos revisando.',
  aprobacion: 'Estamos preparando el presupuesto.',
  reparacion: 'Ya están trabajando en él.',
  listo: 'Está listo. Puede pasar a retirarlo.',
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function VistaCliente({ datos }: { datos: DatosVista }) {
  const [respuesta, setRespuesta] = useState(datos.respuesta)
  const [enviando, setEnviando] = useState<'aprobado' | 'rechazado' | null>(null)
  const [sinRed, setSinRed] = useState(false)
  const [seRindio, setSeRindio] = useState(datos.aviso === 'error')

  const total = datos.propuestos.reduce((s, i) => s + i.precio, 0)
  // Tras recargar, lo que se aprobó ya no está en `propuestos`: se cayó a `yaAprobados`.
  const autorizados = datos.propuestos.length > 0 ? datos.propuestos : datos.yaAprobados
  const fotoPrincipal = datos.propuestos.find((i) => i.fotoUrl)?.fotoUrl ?? null

  // Mejora progresiva: si esto corre, es que hay JavaScript. Se toma el control
  // del formulario para no recargar y para poder reintentar solo.
  async function alEnviar(e: React.FormEvent<HTMLFormElement>) {
    const boton = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const cual = boton?.value
    if (cual !== 'aprobado' && cual !== 'rechazado') return // sin submitter, que siga el envío nativo
    e.preventDefault()

    setEnviando(cual)
    setSeRindio(false)

    for (let intento = 0; intento < 40; intento++) {
      try {
        const corte = new AbortController()
        const reloj = setTimeout(() => corte.abort(), 8000)
        const r = await fetch(`/api/o/${datos.token}/responder`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ respuesta: cual }),
          signal: corte.signal,
        })
        clearTimeout(reloj)

        // 409 = alguien ya respondió esta orden. No es un error: es el resultado.
        if (r.ok || r.status === 409) {
          const datosR = await r.json()
          setRespuesta(datosR.respuesta ?? cual)
          setSinRed(false)
          setEnviando(null)
          return
        }
        if (r.status >= 400 && r.status < 500) throw new Error('peticion')
        throw new Error('servidor')
      } catch {
        setSinRed(true)
        await espera(Math.min(8000, 1200 * 2 ** intento))
      }
    }

    // Cuarenta intentos. Antes que dejarlo mirando una pantalla que gira,
    // se le da el teléfono: la decisión no se pierde, se toma por llamada.
    setSinRed(false)
    setEnviando(null)
    setSeRindio(true)
  }

  const decidiendo = respuesta === null && datos.propuestos.length > 0

  return (
    <main className="mx-auto w-full max-w-[440px] px-5 pb-24 pt-9">
      {/* ── Cabecera: taller, placa, vehículo ─────────────────────────────── */}
      <p className="text-center text-cli-etiqueta font-semibold uppercase text-cli-tinta-2">
        {datos.taller}
      </p>

      <div className="mt-5 flex justify-center">
        <Placa placa={datos.placa} tamano="lg" />
      </div>

      <p className="mt-4 text-center text-cli-cuerpo text-cli-tinta-2">{datos.vehiculo}</p>

      {/* Cuando ya se facturó, eso es lo único que le interesa al dueño del carro. */}
      {datos.factura && (
        <section className="entra mt-9 rounded-[20px] border border-cli-borde bg-cli-tarjeta p-6 text-center">
          <p className="text-cli-etiqueta font-semibold uppercase text-cli-tinta-2">
            Su carro está listo
          </p>
          <p className="cifras mt-4 font-titulo text-cli-precio">{dinero(datos.factura.total)}</p>
          <p className="cifras mt-1 text-[15px] text-cli-tinta-2">
            Factura {datos.factura.numero}
          </p>
          <p className="mt-5 text-cli-cuerpo text-cli-tinta-2">
            Puede pasar a retirarlo cuando guste.
          </p>
        </section>
      )}

      {decidiendo && (
        <>
          {fotoPrincipal && (
            <img
              src={fotoPrincipal}
              alt="Lo que encontramos en su vehículo"
              width={1000}
              height={1000}
              // Es el contenido que decide: que empiece a bajar antes que nada más.
              fetchPriority="high"
              decoding="async"
              className="mt-8 aspect-[4/3] w-full rounded-[20px] border border-cli-borde bg-white object-contain"
            />
          )}

          <h1 className="mt-8 font-titulo text-cli-titulo">
            Encontramos algo
            <br />
            en su carro
          </h1>

          <p className="mt-4 text-cli-cuerpo text-cli-tinta-2">
            {datos.mecanico ? `${datos.mecanico} revisó su vehículo` : 'Revisamos su vehículo'} y
            recomienda arreglar esto antes de que salga del taller.
          </p>

          {datos.propuestos.map((item) => (
            <article
              key={item.id}
              className="mt-6 rounded-[20px] border border-cli-borde bg-cli-tarjeta p-6"
            >
              <h2 className="font-titulo text-[22px] leading-7">{item.descripcion}</h2>
              {item.detalle && (
                <p className="mt-2 text-cli-cuerpo text-cli-tinta-2">{item.detalle}</p>
              )}
              <p className="cifras mt-6 text-right font-titulo text-cli-precio">
                {dinero(item.precio)}
              </p>
              <p className="text-right text-[14px] text-cli-tinta-2">IVA incluido</p>
            </article>
          ))}

          {datos.propuestos.length > 1 && (
            <div className="mt-4 flex items-baseline justify-between rounded-[20px] bg-[#F3F0E9] px-6 py-5">
              <span className="text-cli-etiqueta font-semibold uppercase text-cli-tinta-2">
                Total
              </span>
              <span className="cifras font-titulo text-[32px] leading-9">{dinero(total)}</span>
            </div>
          )}

          <h2 className="mt-10 text-center font-titulo text-[24px]">¿Lo hacemos?</h2>

          <form method="post" action={`/api/o/${datos.token}/responder`} onSubmit={alEnviar}>
            <button
              type="submit"
              name="respuesta"
              value="aprobado"
              disabled={enviando !== null}
              className="presionable mt-5 h-16 w-full rounded-2xl bg-cli-si text-cli-boton font-semibold text-white hover:bg-cli-si-hover disabled:opacity-60"
            >
              {enviando === 'aprobado' ? 'Enviando…' : 'Sí, háganlo'}
            </button>

            <button
              type="submit"
              name="respuesta"
              value="rechazado"
              disabled={enviando !== null}
              className="presionable mt-3 h-16 w-full rounded-2xl border-2 border-cli-no-borde bg-white text-cli-boton font-semibold text-cli-tinta disabled:opacity-60"
            >
              {enviando === 'rechazado' ? 'Enviando…' : 'Todavía no'}
            </button>
          </form>

          {seRindio && (
            <p
              role="alert"
              className="mt-6 rounded-2xl bg-cli-aviso px-5 py-4 text-center text-cli-cuerpo"
            >
              No pudimos guardar su respuesta. Llame al taller y se la tomamos por teléfono.
            </p>
          )}
        </>
      )}

      {respuesta === 'aprobado' && !datos.factura && (
        <section className="entra mt-12 text-center">
          <CheckAprobado />
          <h1 className="mt-6 font-titulo text-cli-titulo">Listo</h1>
          {datos.estadoOrden === 'listo' ? (
            <>
              <p className="mt-4 text-cli-cuerpo text-cli-tinta-2">
                Su carro ya está listo.
              </p>
              <p className="mt-2 text-cli-cuerpo text-cli-tinta-2">
                Puede pasar a retirarlo cuando guste.
              </p>
            </>
          ) : (
            <>
              <p className="mt-4 text-cli-cuerpo text-cli-tinta-2">
                Ya avisamos al taller. Empiezan de una.
              </p>
              <p className="mt-2 text-cli-cuerpo text-cli-tinta-2">
                Le escribimos cuando su carro esté listo.
              </p>
            </>
          )}

          {autorizados.length > 0 && (
            <div className="mt-9 rounded-[20px] border border-cli-borde bg-cli-tarjeta px-6 py-5 text-left">
              <p className="text-cli-etiqueta font-semibold uppercase text-cli-tinta-2">
                Autorizó
              </p>
              {autorizados.map((i) => (
                <div key={i.id} className="mt-3 flex items-baseline justify-between gap-4">
                  <span className="text-cli-cuerpo">{i.descripcion}</span>
                  <span className="cifras shrink-0 font-titulo text-[19px]">
                    {dinero(i.precio)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {datos.factura && datos.facturados.length > 0 && (
        <section className="entra mt-6 rounded-[20px] border border-cli-borde bg-cli-tarjeta px-6 py-5">
          <p className="text-cli-etiqueta font-semibold uppercase text-cli-tinta-2">Se le hizo</p>
          {datos.facturados.map((i) => (
            <div key={i.id} className="mt-3 flex items-baseline justify-between gap-4">
              <span className="text-cli-cuerpo">{i.descripcion}</span>
              <span className="cifras shrink-0 font-titulo text-[19px]">{dinero(i.precio)}</span>
            </div>
          ))}
        </section>
      )}

      {respuesta === 'rechazado' && (
        <section className="entra mt-12 text-center">
          <h1 className="font-titulo text-cli-titulo">Entendido</h1>
          <p className="mt-4 text-cli-cuerpo text-cli-tinta-2">
            Le avisamos al taller que por ahora no.
          </p>
          <p className="mt-2 text-cli-cuerpo text-cli-tinta-2">
            Si cambia de idea, llámenos y lo hacemos.
          </p>
        </section>
      )}

      {respuesta === null && datos.propuestos.length === 0 && (
        <section className="mt-12 text-center">
          <h1 className="font-titulo text-cli-titulo">Su carro está en el taller</h1>
          <p className="mt-4 text-cli-cuerpo text-cli-tinta-2">
            {ESTADO_EN_CRISTIANO[datos.estadoOrden]}
          </p>
          <p className="mt-2 text-cli-cuerpo text-cli-tinta-2">
            Le avisamos apenas tengamos novedades.
          </p>
        </section>
      )}

      <Telefono numero={datos.telefono} destacado={seRindio} />

      {sinRed && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-0 border-t border-[#F0D9A8] bg-cli-aviso px-5 py-4 text-center text-cli-cuerpo"
        >
          Sin conexión. Reintentando…
        </div>
      )}
    </main>
  )
}

function Telefono({ numero, destacado }: { numero: string; destacado: boolean }) {
  return (
    <div className="mt-12 text-center">
      <p className="text-cli-cuerpo text-cli-tinta-2">¿Tiene alguna duda?</p>
      <a
        href={`tel:${telefonoMarcable(numero)}`}
        className={
          destacado
            ? 'presionable mt-4 flex h-16 w-full items-center justify-center rounded-2xl bg-[#2563EB] text-cli-boton font-semibold text-white'
            : 'presionable mt-3 inline-flex h-12 items-center gap-2 rounded-xl px-4 text-cli-boton font-semibold text-[#2563EB]'
        }
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.3.2 2.5.57 3.6a1 1 0 0 1-.25 1l-2.2 2.2Z"
            fill="currentColor"
          />
        </svg>
        Llamar al taller
      </a>
      {!destacado && (
        <p className="cifras mt-1 text-[15px] text-cli-tinta-2">{telefonoLegible(numero)}</p>
      )}
    </div>
  )
}

function CheckAprobado() {
  return (
    <svg
      width="88"
      height="88"
      viewBox="0 0 88 88"
      className="mx-auto"
      role="img"
      aria-label="Aprobado"
    >
      <circle cx="44" cy="44" r="42" fill="#EAF7EF" />
      <path
        d="M28 45.5 39 56l21-24"
        fill="none"
        stroke="#16A34A"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="traza-check"
        pathLength={48}
      />
    </svg>
  )
}
