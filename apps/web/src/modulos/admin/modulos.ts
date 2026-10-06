/**
 * Os nomes dos módulos de `permissao_admin`.
 *
 * Arquivo separado de `permissoes.ts` por um motivo mecânico: aquele é
 * `server-only` (ele fala com o banco), e este é **vocabulário** — a matriz de
 * 27.4 é uma tela de cliente e precisa dos nomes das colunas. Um `import
 * 'server-only'` no caminho de um componente `'use client'` quebra o build, e
 * quebrou: a mensagem foi "'server-only' cannot be imported from a Client
 * Component module", com o rastro passando por `modulos/equipe/tipos.ts`.
 *
 * Nada aqui toca o banco. `permissoes.ts` reexporta o que está abaixo, então
 * quem já importava de lá continua funcionando.
 */

/**
 * Módulos de `permissao_admin`, como a `0003` os semeia.
 *
 * A tela 27.4 do protótipo tem quatro chaves (`gestao`, `moderacao`,
 * `financeiro`, `equipe`); a tabela tem seis, com `pacotes` e `configuracao`
 * separados de `financeiro`. A divergência está registrada em
 * `docs/prd/07-pendencias-e-divergencias.md`: a granularidade maior fica, e a
 * tela do protótipo mapeia `pacotes` junto de `financeiro` até o cliente
 * decidir.
 */
export const ModuloAdmin = {
  GESTAO: 'gestao',
  MODERACAO: 'moderacao',
  FINANCEIRO: 'financeiro',
  PACOTES: 'pacotes',
  EQUIPE: 'equipe',
  CONFIGURACAO: 'configuracao',
} as const;

export type ModuloAdmin = (typeof ModuloAdmin)[keyof typeof ModuloAdmin];
