import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { MolduraDaAvaliacao } from '@/componentes/curador/avaliacao/MolduraDaAvaliacao';
import { PassoCompartilhamento } from '@/componentes/curador/avaliacao/PassoCompartilhamento';
import { PassoNotas } from '@/componentes/curador/avaliacao/PassoNotas';
import { PassoOutras } from '@/componentes/curador/avaliacao/PassoOutras';
import { PassoRemuneracao } from '@/componentes/curador/avaliacao/PassoRemuneracao';
import { PassoSubjetiva } from '@/componentes/curador/avaliacao/PassoSubjetiva';
import { ROTA } from '@/lib/guarda-rota';
import {
  concluirAvaliacao,
  salvarEscolhaDeCompartilhamento,
  salvarNotaSubjetiva,
  salvarNotasObjetivas,
  salvarOutrasFormas,
} from '@/modulos/avaliacao/acoes';
import { lerAvaliacao, lerRemuneracao } from '@/modulos/avaliacao/consultas';
import { passoAnterior } from '@/modulos/avaliacao/servico';
import { ehPassoDaAvaliacao } from '@/modulos/avaliacao/tipos';

export const metadata: Metadata = {
  title: 'Avaliação',
  robots: { index: false, follow: false },
};

/**
 * 14 · A avaliação, uma rota por etapa.
 *
 * Uma rota e cinco faces — o mesmo desenho do wizard de envio (3) e do cadastro
 * do curador (12). O endereço por etapa não é estética: o progresso é
 * persistido em `avaliacao.passo_atual`, e sem o passo na URL a retomada e o
 * "Voltar" não teriam para onde apontar.
 *
 * ## Duas guardas que não são a guarda de rota
 *
 * A guarda de `(app)/curador` já exigiu papel e cadastro concluído. Aqui ficam
 * as duas que ela não pode dar:
 *
 *  - **Concluída** manda para a etapa 5. As anteriores não aceitam mais
 *    escrita — o trigger `avaliacao_concluida_e_final` recusa —, e deixar o
 *    formulário aberto ofereceria um botão que só produziria erro.
 *  - **`outras` sem `outros`** manda para a remuneração. A etapa 14.3 só existe
 *    quando a modalidade escolhida é `outros`; alcançá-la por URL, sem isso,
 *    gravaria uma modalidade que a pessoa não escolheu.
 */
export default async function PaginaDoPassoDaAvaliacao({
  params,
}: {
  readonly params: Promise<{ readonly envioId: string; readonly passo: string }>;
}) {
  const { envioId, passo: bruto } = await params;

  // Passo inventado é 404, e não redirecionamento silencioso: a URL está
  // errada, e esconder isso dificultaria descobrir o erro.
  if (!ehPassoDaAvaliacao(bruto)) notFound();

  const raiz = `${ROTA.CURADOR_AVALIAR}/${envioId}`;

  if (bruto === 'remuneracao') {
    const tela = await lerRemuneracao(envioId);
    if (tela === null) notFound();

    const anterior = passoAnterior('remuneracao', tela.avaliacao) ?? 'compartilhamento';

    return (
      <MolduraDaAvaliacao
        titulo={tela.item.titulo}
        artista={tela.item.artista}
        passo="remuneracao"
        concluida={tela.avaliacao.concluida}
      >
        <PassoRemuneracao
          tela={tela}
          voltarPara={`${raiz}/${anterior}`}
          acao={concluirAvaliacao}
        />
      </MolduraDaAvaliacao>
    );
  }

  const tela = await lerAvaliacao(envioId);
  if (tela === null) notFound();

  if (tela.avaliacao.concluida) redirect(`${raiz}/remuneracao`);

  const { item, avaliacao, criterios, regras } = tela;

  if (bruto === 'notas') {
    return (
      <MolduraDaAvaliacao titulo={item.titulo} artista={item.artista} passo="notas">
        <PassoNotas
          envioId={envioId}
          titulo={item.titulo}
          artista={item.artista}
          audioUrl={tela.audioUrl}
          avaliacao={avaliacao}
          criterios={criterios}
          regras={regras}
          acao={salvarNotasObjetivas}
        />
      </MolduraDaAvaliacao>
    );
  }

  if (bruto === 'subjetiva') {
    return (
      <MolduraDaAvaliacao titulo={item.titulo} artista={item.artista} passo="subjetiva">
        <PassoSubjetiva
          envioId={envioId}
          avaliacao={avaliacao}
          criterios={criterios}
          regras={regras}
          voltarPara={`${raiz}/notas`}
          acao={salvarNotaSubjetiva}
        />
      </MolduraDaAvaliacao>
    );
  }

  if (bruto === 'compartilhamento') {
    return (
      <MolduraDaAvaliacao titulo={item.titulo} artista={item.artista} passo="compartilhamento">
        <PassoCompartilhamento
          envioId={envioId}
          avaliacao={avaliacao}
          voltarPara={`${raiz}/subjetiva`}
          acao={salvarEscolhaDeCompartilhamento}
        />
      </MolduraDaAvaliacao>
    );
  }

  // 14.3 — a etapa que o avanço pula nas outras quatro modalidades.
  if (avaliacao.compartilhamento !== null && avaliacao.compartilhamento.modalidade !== 'outros') {
    redirect(`${raiz}/remuneracao`);
  }

  return (
    <MolduraDaAvaliacao titulo={item.titulo} artista={item.artista} passo="outras">
      <PassoOutras
        envioId={envioId}
        avaliacao={avaliacao}
        voltarPara={`${raiz}/compartilhamento`}
        acao={salvarOutrasFormas}
      />
    </MolduraDaAvaliacao>
  );
}
