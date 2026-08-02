import { NoExiste } from '@/components/taller/NoExiste'

// Red de seguridad del segmento. Las páginas devuelven <NoExiste/> directamente
// —así llega en el HTML—, pero una ruta que no case con ninguna cae aquí.

export default function NoEncontradoEnElTaller() {
  return <NoExiste que="Lo que buscaba" />
}
