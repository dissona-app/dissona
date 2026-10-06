'use client';

import Link from 'next/link';

import { Etiqueta } from '@dissona/nucleo/componentes/base/Etiqueta';
import { Tabela } from '@dissona/nucleo/componentes/base/Tabela';
import type { ColunaTabela } from '@dissona/nucleo/componentes/base/Tabela';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { HISTORICO as TEXTOS } from '@dissona/nucleo/textos/avaliacao';

import estilos from './TabelaDaFila.module.css';

/** Uma avaliação do histórico, **já formatada no servidor**. */
export type LinhaDoHistorico = {
  readonly envioId: string;
  readonly titulo: string;
  readonly artista: string;
  /** Em andamento: a etapa do wizard. Entregue: a data da entrega. */
  readonly quando: string;
  readonly nota: string;
  readonly noPrazo: boolean | null;
  readonly valor: string;
};

export type PropsTabelaDoHistorico = {
  readonly tipo: 'em_andamento' | 'entregues';
  readonly linhas: readonly LinhaDoHistorico[];
  readonly vazio: React.ReactNode;
};

/**
 * As duas tabelas de "Notas e feedback".
 *
 * Cliente só porque a `Tabela` recebe funções de célula; a formatação é toda do
 * servidor. Cada linha leva à avaliação do envio: o rascunho retoma na etapa
 * em que parou, e a entregue abre a remuneração congelada.
 */
export function TabelaDoHistorico({ tipo, linhas, vazio }: PropsTabelaDoHistorico) {
  const emAndamento = tipo === 'em_andamento';

  const musica: ColunaTabela<LinhaDoHistorico> = {
    chave: 'musica',
    titulo: TEXTOS.colunas.musica,
    celula: (linha) => (
      <Link className={estilos.musica} href={`${ROTA.CURADOR_AVALIAR}/${linha.envioId}`}>
        <span className={estilos.titulo}>{linha.titulo}</span>
        <span className={estilos.artista}>{linha.artista}</span>
      </Link>
    ),
  };

  const acao: ColunaTabela<LinhaDoHistorico> = {
    chave: 'acao',
    titulo: TEXTOS.colunas.acao,
    celula: (linha) => (
      <Link href={`${ROTA.CURADOR_AVALIAR}/${linha.envioId}`}>
        {emAndamento ? TEXTOS.continuar : TEXTOS.ver}
      </Link>
    ),
  };

  const colunas: readonly ColunaTabela<LinhaDoHistorico>[] = emAndamento
    ? [
        musica,
        { chave: 'etapa', titulo: TEXTOS.colunas.etapa, celula: (linha) => linha.quando },
        acao,
      ]
    : [
        musica,
        { chave: 'entregue', titulo: TEXTOS.colunas.entregue, celula: (linha) => linha.quando },
        { chave: 'nota', titulo: TEXTOS.colunas.nota, numerica: true, celula: (l) => l.nota },
        {
          chave: 'pontualidade',
          titulo: TEXTOS.colunas.pontualidade,
          celula: (linha) =>
            linha.noPrazo === null ? (
              TEXTOS.semValor
            ) : (
              <Etiqueta tom={linha.noPrazo ? 'sucesso' : 'alerta'}>
                {linha.noPrazo ? TEXTOS.noPrazo : TEXTOS.foraDoPrazo}
              </Etiqueta>
            ),
        },
        { chave: 'valor', titulo: TEXTOS.colunas.valor, numerica: true, celula: (l) => l.valor },
        acao,
      ];

  return (
    <Tabela
      legenda={emAndamento ? TEXTOS.emAndamentoTitulo : TEXTOS.entreguesTitulo}
      legendaOculta
      colunas={colunas}
      linhas={linhas}
      chaveDaLinha={(linha) => linha.envioId}
      vazio={vazio}
    />
  );
}
