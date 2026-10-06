import { redirect } from 'next/navigation';

import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { lerCadastroDoCurador } from '@/modulos/curador/consultas';
import { rotaDoPasso } from '@dissona/nucleo/modulos/curador/servico';

/**
 * `/curador/cadastro` — a retomada.
 *
 * Não é tela: é o ponto para onde a guarda de rota manda o curador com cadastro
 * pendente, e a única coisa que faz é levá-lo ao passo em que ele parou
 * (`passo_cadastro`). É o que sustenta "você pode retomar de onde parou".
 *
 * Sem esta rota, a guarda apontaria para um caminho sem página — que é
 * exatamente o 404 que o produto tinha antes desta fatia.
 */
export default async function Pagina() {
  const estado = await lerCadastroDoCurador();

  if (estado === null) redirect(ROTA.CURADOR_ENTRAR);
  if (estado.concluido) redirect(ROTA.CURADOR_CADASTRO_CLASSIFICACAO);

  redirect(rotaDoPasso(estado.passoSalvo));
}
