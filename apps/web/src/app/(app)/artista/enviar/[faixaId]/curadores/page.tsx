import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SelecaoDeCuradores } from '@/componentes/artista/SelecaoDeCuradores';
import type { CuradorNaLista } from '@/componentes/artista/SelecaoDeCuradores';
import * as claves from '@dissona/nucleo/lib/claves';
import { lerFaixaDoPasso } from '@/modulos/faixa/consultas';
import { confirmarSelecaoDeCuradores } from '@/modulos/selecao/acoes';
import { listarDisponiveis } from '@/modulos/selecao/repositorio';
import { podeReceberEnvio } from '@/modulos/selecao/servico';
import { SERVICO_OBRIGATORIO } from '@/modulos/selecao/tipos';
import { CARTEIRA } from '@dissona/nucleo/textos/prototipo';

export const metadata: Metadata = {
  title: 'Escolher curadores',
  robots: { index: false, follow: false },
};

/** Rótulo humano do serviço opcional. */
const ROTULO_DO_SERVICO: Readonly<Record<string, string>> = {
  playlist: 'Playlist',
  post: 'Post no Instagram',
  materia: 'Matéria',
  outro: 'Outra divulgação',
};

/**
 * Placeholder da seleção de curadores — entre a revisão (passo 3) e a
 * confirmação.
 *
 * A tela real é o módulo 4 e é da R3. Esta existe para a R2 ser testável fim a
 * fim: sem ela não há `envio`, e sem `envio` não há fila, avaliação nem ganho.
 */
export default async function PaginaDaSelecao({
  params,
}: {
  readonly params: Promise<{ readonly faixaId: string }>;
}) {
  const { faixaId } = await params;

  // A faixa tem de estar pronta para a revisão — o mesmo estado que libera o
  // passo 3. Chegar aqui com o wizard incompleto é 404, não tela vazia.
  const estado = await lerFaixaDoPasso(faixaId, 'revisao');
  if (estado.estado !== 'ok') notFound();

  const disponiveis = await listarDisponiveis();

  const curadores: readonly CuradorNaLista[] = disponiveis
    // Sem `feedback` ativo a RPC recusaria com DS012. Filtrar aqui evita
    // oferecer uma escolha que falha só na confirmação.
    .filter(podeReceberEnvio)
    .map((curador) => {
      const base = curador.servicos.find((servico) => servico.tipo === SERVICO_OBRIGATORIO);
      return {
        id: curador.perfilCuradorId,
        nome: curador.nome,
        classe: curador.classe,
        precoBase: `${claves.formatar(base?.precoClaves ?? 0n)} ${CARTEIRA.saldoUnidade}`,
        opcionais: curador.servicos
          .filter((servico) => servico.tipo !== SERVICO_OBRIGATORIO)
          .map((servico) => ({
            tipo: servico.tipo,
            rotulo: ROTULO_DO_SERVICO[servico.tipo] ?? servico.tipo,
            preco: `${claves.formatar(servico.precoClaves)} ${CARTEIRA.saldoUnidade}`,
          })),
      };
    });

  return (
    <SelecaoDeCuradores
      faixaId={faixaId}
      curadores={curadores}
      acao={confirmarSelecaoDeCuradores}
    />
  );
}
