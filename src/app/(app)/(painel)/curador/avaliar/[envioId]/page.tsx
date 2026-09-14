import { notFound, redirect } from 'next/navigation';

import { ROTA } from '@/lib/guarda-rota';
import { lerAvaliacao } from '@/modulos/avaliacao/consultas';
import { passoDoNumero } from '@/modulos/avaliacao/tipos';

/**
 * A retomada — `/curador/avaliar/<envioId>` sem passo.
 *
 * É o endereço que "Iniciar avaliação" (13.1) abre, e é para onde volta quem
 * usou "Salvar e sair". Quem decide o destino é `avaliacao.passo_atual`, a
 * coluna que cada etapa grava: sem ela, retomar significaria recomeçar pelas
 * notas com a faixa toda para ouvir de novo.
 *
 * Concluída, o destino é sempre a etapa 5, que é a única que tem o que mostrar
 * — o ganho gravado.
 */
export default async function PaginaDaAvaliacao({
  params,
}: {
  readonly params: Promise<{ readonly envioId: string }>;
}) {
  const { envioId } = await params;

  const tela = await lerAvaliacao(envioId);
  // `null` também cobre "o envio é de outro curador": a view `fila_do_curador`
  // o esconde, e distinguir os dois casos revelaria que ele existe.
  if (tela === null) notFound();

  const passo = tela.avaliacao.concluida
    ? 'remuneracao'
    : passoDoNumero(tela.avaliacao.passoAtual);

  redirect(`${ROTA.CURADOR_AVALIAR}/${envioId}/${passo}`);
}
