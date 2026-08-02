// Las variables que el servidor lee EN EJECUCIÓN.
//
// Ninguna lleva el prefijo NEXT_PUBLIC_ a propósito: ese prefijo hace que Next
// INCRUSTE el valor dentro del paquete al compilar, y a partir de ahí cambiarlo
// en el panel de Netlify no sirve de nada hasta que se vuelva a desplegar.
//
// Con el teléfono eso era una trampa cara: es el número que suena cuando el
// socio o el contador del prospecto toca "Llamar al taller", o sea la captación.
// Cambiarlo y que siguiera sonando el viejo, sin ningún aviso, es justo la clase
// de fallo que no se ve hasta que alguien se queja.
//
// Se leen los nombres antiguos como respaldo para que nada se caiga a medio
// migrar, pero los buenos son estos.

export function telefonoTaller(): string {
  return (
    process.env.TELEFONO_TALLER?.trim() ||
    process.env.NEXT_PUBLIC_TELEFONO_TALLER?.trim() ||
    '+593979279337'
  )
}

/** Vacía a propósito: la resuelve la cabecera de la petición. Ver base-url.ts. */
export function baseFijada(): string {
  return process.env.BASE_URL?.trim() || process.env.NEXT_PUBLIC_BASE_URL?.trim() || ''
}
