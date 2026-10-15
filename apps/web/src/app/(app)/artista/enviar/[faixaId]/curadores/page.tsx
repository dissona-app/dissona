import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { MolduraDoEnvio } from '@/componentes/artista/MolduraDoEnvio';
import { SelecaoDeCuradores } from '@/componentes/artista/SelecaoDeCuradores';
import * as claves from '@dissona/nucleo/lib/claves';
import { lerSaldoDisponivel } from '@/modulos/claves/consultas';
import { lerFaixaDoPasso } from '@/modulos/faixa/consultas';
import { lerCuradoresParaSelecao } from '@/modulos/selecao/consultas';
import { lerSelecaoDaUrl } from '@/modulos/selecao/tipos';
import { CARTEIRA } from '@dissona/nucleo/textos/prototipo';

export const metadata: Metadata = {
  title: 'Escolher curador',
  robots: { index: false, follow: false },
};

/**
 * 4.3 · Escolher curador — passo 3 de 4, entre o contexto e a revisão (ordem
 * do protótipo aprovado).
 *
 * Nada sai da carteira aqui: a escolha segue na URL para a revisão, e é lá que
 * o "Enviar para curadoria" chama `confirmar_selecao_curadores`.
 */
export default async function PaginaDaSelecao({
  params,
  searchParams,
}: {
  readonly params: Promise<{ readonly faixaId: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { faixaId } = await params;

  // A faixa tem de ter passado pelo contexto — o mesmo estado que libera a
  // revisão. Chegar aqui com o wizard incompleto é 404, não tela vazia.
  const estado = await lerFaixaDoPasso(faixaId, 'revisao');
  if (estado.estado !== 'ok') notFound();

  const [curadores, saldo, busca] = await Promise.all([
    lerCuradoresParaSelecao(),
    lerSaldoDisponivel(),
    searchParams,
  ]);

  return (
    <MolduraDoEnvio passo="curadores">
      <SelecaoDeCuradores
        faixaId={faixaId}
        tituloDaFaixa={estado.faixa.titulo}
        saldo={saldo === null ? null : `${claves.formatar(saldo)} ${CARTEIRA.saldoUnidade}`}
        curadores={curadores}
        inicial={lerSelecaoDaUrl(busca)}
      />
    </MolduraDoEnvio>
  );
}
