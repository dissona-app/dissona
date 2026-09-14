import { redirect } from 'next/navigation';

import { ROTA } from '@/lib/guarda-rota';

/**
 * Homepage pública — módulo 26, R5.
 *
 * Enquanto a home não existe, a raiz leva ao login. O `(auth)` devolve quem já
 * tem sessão ao início do próprio papel, então o redirecionamento serve aos
 * dois casos. A guarda mantém `/` pública para não engolir o `code` do OAuth
 * que cai aqui quando o Site URL diverge da allow-list.
 */
export default function Pagina() {
  redirect(ROTA.ENTRAR);
}
