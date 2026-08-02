// La placa ecuatoriana dibujada como una placa de verdad, no como texto.
// Es la llave de todo el negocio del taller y lo que cualquier mecánico —y
// cualquier dueño de carro— reconoce al instante. Se usa igual en los dos mundos.

type Tamano = 'sm' | 'md' | 'lg'

const MEDIDAS: Record<Tamano, { caja: string; franja: string; texto: string }> = {
  sm: {
    caja: 'rounded-[4px] border-[1.5px]',
    franja: 'text-[5px] leading-[7px] tracking-[0.2em] py-[1px]',
    texto: 'text-[15px] leading-[19px] px-[7px] pt-[1px] pb-[2px]',
  },
  md: {
    caja: 'rounded-[5px] border-2',
    franja: 'text-[7px] leading-[9px] tracking-[0.24em] py-[2px]',
    texto: 'text-[22px] leading-[27px] px-3 pt-[1px] pb-[3px]',
  },
  lg: {
    caja: 'rounded-[7px] border-[3px]',
    franja: 'text-[10px] leading-[13px] tracking-[0.28em] py-[3px]',
    texto: 'text-[34px] leading-[42px] px-5 pt-[2px] pb-[5px]',
  },
}

export function Placa({
  placa,
  tamano = 'md',
  className = '',
}: {
  placa: string
  tamano?: Tamano
  className?: string
}) {
  const m = MEDIDAS[tamano]
  return (
    <span
      className={`inline-flex flex-col overflow-hidden border-placa-tinta bg-placa-cuerpo align-middle ${m.caja} ${className}`}
      aria-label={`Placa ${placa}`}
    >
      <span
        className={`bg-placa-franja text-center font-cuerpo font-semibold text-white/95 ${m.franja}`}
        aria-hidden
      >
        ECUADOR
      </span>
      <span className={`text-center font-titulo text-placa-tinta ${m.texto}`}>
        {/* El achatado imita la tipografía condensada de una placa real. */}
        <span className="inline-block" style={{ transform: 'scaleX(0.92)', letterSpacing: '-0.01em' }}>
          {placa}
        </span>
      </span>
    </span>
  )
}
