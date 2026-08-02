// El color de la pintura, como disco.
//
// Sirve para UNA cosa: que el jefe de taller encuentre un carro en el tablero
// sin leer. En un taller nadie dice "la orden 0631", dice "el plateado" o "la
// blanca de cajón". El disco es el atajo; la palabra que va al lado, en la misma
// línea del vehículo, es la prueba — así "Otro" y "Verde" se resuelven solos y
// no hace falta ninguna leyenda.
//
// LOS TONOS SON DE PINTURA DE CARRO, no de paleta de diseño. Un plateado que se
// parezca al gris no sirve de nada, y ese es justo el par que hay que poder
// distinguir de un vistazo.
//
// Va DENTRO de la línea del vehículo a propósito. En la zona de distintivos el
// color ya significa otra cosa —la franja del borde es prioridad, el ámbar es
// "esperando cliente", el verde es "aprobado"— y meter ahí un verde de pintura
// rompería el sistema.

const PINTURAS: Record<string, { relleno: string; borde: string }> = {
  Blanco: { relleno: '#F4F5F7', borde: '#C7CBD1' },
  Negro: { relleno: '#15171B', borde: '#4A5160' },
  Gris: { relleno: '#6B7280', borde: '#8A93A1' },
  // El plateado lleva un brillo metálico plano para que NO se confunda con el
  // gris: son los dos que más se parecen y los que más hay que separar.
  Plateado: { relleno: '#C3C8CF', borde: '#E3E7EC' },
  Rojo: { relleno: '#C2261F', borde: '#E4564C' },
  Azul: { relleno: '#1E40AF', borde: '#4C74E0' },
  Verde: { relleno: '#166534', borde: '#3E8F5E' },
}

export function DiscoPintura({ color }: { color: string }) {
  const p = PINTURAS[color] ?? { relleno: '#3A4256', borde: '#66708A' }
  const metalico = color === 'Plateado'

  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      className="mr-1.5 inline-block shrink-0 align-[-1px]"
      aria-hidden
    >
      {metalico && (
        <defs>
          <linearGradient id="pintura-plateado" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E8EBEF" />
            <stop offset="55%" stopColor="#B9BFC7" />
            <stop offset="100%" stopColor="#D5DAE0" />
          </linearGradient>
        </defs>
      )}
      <circle
        cx="5"
        cy="5"
        r="4"
        fill={metalico ? 'url(#pintura-plateado)' : p.relleno}
        stroke={p.borde}
        strokeWidth="1"
      />
    </svg>
  )
}
