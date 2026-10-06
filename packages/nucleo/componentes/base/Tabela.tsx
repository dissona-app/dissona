'use client';

import type { ReactNode } from 'react';

import estilos from './Tabela.module.css';

export type DirecaoOrdem = 'asc' | 'desc';

export type ColunaTabela<L> = {
  readonly chave: string;
  readonly titulo: string;
  readonly celula: (linha: L) => ReactNode;
  /** Alinha à direita e usa numeral tabular — valores, Claves, notas. */
  readonly numerica?: boolean;
  readonly ordenavel?: boolean;
};

export type PropsTabela<L> = {
  readonly legenda: string;
  readonly colunas: readonly ColunaTabela<L>[];
  readonly linhas: readonly L[];
  readonly chaveDaLinha: (linha: L) => string;
  /** Esconde a legenda visualmente, mantendo-a para leitor de tela. */
  readonly legendaOculta?: boolean;
  readonly ordenadaPor?: string;
  readonly direcao?: DirecaoOrdem;
  readonly onOrdenar?: (chave: string) => void;
  /** Mostrado no lugar do corpo quando não há linha nenhuma. */
  readonly vazio?: ReactNode;
};

/**
 * Tabela de dados.
 *
 * `<caption>` sempre presente, mesmo quando oculta: é o que dá nome à tabela
 * para o leitor de tela. `aria-sort` no cabeçalho ordenado é critério de
 * aceite da fila do curador (módulo 13, requirements.md).
 */
export function Tabela<L>({
  legenda,
  colunas,
  linhas,
  chaveDaLinha,
  legendaOculta = false,
  ordenadaPor,
  direcao = 'asc',
  onOrdenar,
  vazio,
}: PropsTabela<L>) {
  if (linhas.length === 0 && vazio !== undefined) {
    return <>{vazio}</>;
  }

  return (
    <div className={estilos.rolagem}>
      <table className={estilos.base}>
        <caption className={legendaOculta ? 'dsn-apenas-leitor' : estilos.legenda}>
          {legenda}
        </caption>

        <thead className={estilos.cabecalho}>
          <tr>
            {colunas.map((coluna) => {
              const ordenada = ordenadaPor === coluna.chave;
              const classes = [
                estilos.colunaTitulo,
                coluna.numerica === true ? estilos.numerica : undefined,
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <th
                  key={coluna.chave}
                  scope="col"
                  className={classes}
                  // `aria-sort` só existe na coluna efetivamente ordenada;
                  // "none" em todas as outras é ruído para o leitor.
                  aria-sort={
                    ordenada ? (direcao === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                >
                  {coluna.ordenavel === true && onOrdenar !== undefined ? (
                    <button
                      type="button"
                      className={estilos.botaoOrdenar}
                      onClick={() => onOrdenar(coluna.chave)}
                    >
                      {coluna.titulo}
                      {ordenada ? (
                        <span className={estilos.seta} aria-hidden="true">
                          {direcao === 'asc' ? '▲' : '▼'}
                        </span>
                      ) : null}
                    </button>
                  ) : (
                    coluna.titulo
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {linhas.map((linha) => (
            <tr key={chaveDaLinha(linha)} className={estilos.linha}>
              {colunas.map((coluna) => (
                <td
                  key={coluna.chave}
                  className={[
                    estilos.celula,
                    coluna.numerica === true ? estilos.numerica : undefined,
                    coluna.numerica === true ? 'dsn-numeral' : undefined,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {coluna.celula(linha)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
