import { redirect } from 'next/navigation'
import { SLUG_PRINCIPAL } from '@/lib/demos'

// La raíz lleva al demo de bolsillo: el que se proyecta en la reunión.
export default function Raiz() {
  redirect(`/d/${SLUG_PRINCIPAL}`)
}
