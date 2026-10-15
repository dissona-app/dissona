'use client';

import Link from 'next/link';

import { Etiqueta } from '@dissona/nucleo/componentes/base/Etiqueta';
import { Tabela } from '@dissona/nucleo/componentes/base/Tabela';
import type { ColunaTabela } from '@dissona/nucleo/componentes/base/Tabela';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { AVALIAR, HISTORICO as TEXTOS } from '@dissona/nucleo/textos/avaliacao';

import { capaDoEnvio } from './capas';
import estilos from './TabelaDaFila.module.css';
import estilosNovos from './TabelaDoHistorico.module.css';

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
  /** "há 2h" — a última edição do rascunho (em andamento). */
  readonly editadoEm?: string;
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

  // Em andamento: as linhas do protótipo aprovado — capa, faixa, o passo com
  // a barra de progresso e o botão de continuar.
  if (emAndamento) {
    if (linhas.length === 0) return <>{vazio}</>;
    return (
      <ul className={estilosNovos.lista}>
        {linhas.map((linha) => {
          const indice = AVALIAR.passos.indexOf(linha.quando as (typeof AVALIAR.passos)[number]);
          const passo = indice === -1 ? 1 : indice + 1;
          const total = AVALIAR.passos.length;
          return (
            <li key={linha.envioId} className={estilosNovos.linha}>
              <span
                className={estilosNovos.capa}
                style={{ backgroundImage: `url('${capaDoEnvio(linha.envioId)}')` }}
                aria-hidden="true"
              />
              <span className={estilosNovos.faixa}>
                <span className={estilosNovos.titulo}>{linha.titulo}</span>
                <span className={estilosNovos.artista}>{linha.artista}</span>
              </span>
              <span className={estilosNovos.progresso}>
                <span className={estilosNovos.progressoTopo}>
                  <span className={estilosNovos.passo}>
                    Passo {passo} de {total} · {linha.quando}
                  </span>
                  <span className={estilosNovos.pct}>{Math.round((passo / total) * 100)}%</span>
                </span>
                <span className={estilosNovos.barras} aria-hidden="true">
                  {AVALIAR.passos.map((rotulo, i) => (
                    <span
                      key={rotulo}
                      className={i < passo ? estilosNovos.barraFeita : estilosNovos.barra}
                    />
                  ))}
                </span>
              </span>
              <span className={estilosNovos.edicao}>
                <span className={estilosNovos.edicaoRotulo}>{TEXTOS.ultimaEdicao}</span>
                <span className={estilosNovos.edicaoValor}>
                  {linha.editadoEm ?? TEXTOS.semValor}
                </span>
              </span>
              <Link
                className={estilosNovos.continuar}
                href={`${ROTA.CURADOR_AVALIAR}/${linha.envioId}`}
              >
                {TEXTOS.continuar}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

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
