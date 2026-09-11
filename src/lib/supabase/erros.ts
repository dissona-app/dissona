/**
 * Tradução de erro do Postgres para `CodigoErro` do domínio.
 *
 * As RPCs e triggers das migrations `0005`–`0011` sinalizam por `SQLSTATE` na
 * faixa privada `DSnnn` (`raise ... using errcode = 'DS010'`); policies e
 * constraints sinalizam pelos códigos padrão. Nos dois casos, o que chega ao
 * TypeScript é um objeto do PostgREST com `code`, `message` e `details` — e
 * deixá-lo subir até a View significa mostrar texto do banco ao usuário, em
 * inglês e revelando nome de constraint.
 *
 * Este é o único arquivo que conhece esses códigos. Acima dele só existe
 * `CodigoErro`, e a View traduz para texto (architecture.md §8).
 *
 * Um código desconhecido **não** vira `CONFLITO` genérico: sobe como está. Um
 * erro de banco que ninguém previu é bug, e engolir bug em código de domínio é
 * como uma coluna renomeada passa a aparecer na tela como "conflito".
 *
 * A tabela abaixo foi levantada dos `raise` das migrations, não do plano — e
 * levantá-la encontrou uma colisão real: a `0007b` usara `DS030`, que já era
 * "configuração ausente" em quatro funções. Corrigida na `0007c`. É o motivo
 * de este mapa ser um arquivo só: com os códigos espalhados por módulo, a
 * colisão não teria onde aparecer.
 */

import { CodigoErro, ErroDominio } from '../erros';

/** O formato que `@supabase/supabase-js` devolve em `error`. */
export type ErroPostgres = {
  readonly code?: string;
  readonly message?: string;
  readonly details?: string | null;
  readonly hint?: string | null;
};

/**
 * `DSnnn` → domínio, na numeração que as migrations de fato usam.
 *
 * | Código | Origem no banco |
 * |---|---|
 * | `DS001` | escuta abaixo do mínimo (`enviar_avaliacao`) |
 * | `DS002` | critério obrigatório ausente (`enviar_avaliacao`) |
 * | `DS003` | feedback escrito obrigatório (`enviar_avaliacao`) |
 * | `DS004` | situação de envio/avaliação inválida; estado terminal só por RPC |
 * | `DS005` | avaliação já concluída, e concluída não se reescreve |
 * | `DS010` | saldo insuficiente (`confirmar_selecao_curadores`) |
 * | `DS011` | curador inexistente, não aprovado, ou seleção vazia |
 * | `DS012` | serviço de feedback ausente ou removido |
 * | `DS013` | faixa fora de `aguardando_selecao`, ou conteúdo em curadoria |
 * | `DS014` | pacote excluído não volta (`0007c`) |
 * | `DS015` | cadastro de curador já concluído (`0002c`) |
 * | `DS020` | propriedade: "não é seu" / exige autenticação |
 * | `DS021` | convite inexistente, expirado ou já usado |
 * | `DS022` | em `notificacao`, só `lida_em` muda |
 * | `DS023` | `ganho_curador` não é alterado pelo cliente |
 * | `DS024` | registro inexistente (envio, faixa, pacote, pedido) |
 * | `DS030` | catálogo ou `configuracao` ausente/incompleta |
 */
const POR_CODIGO_DISSONA: Readonly<Record<string, CodigoErro>> = {
  DS001: CodigoErro.ESCUTA_INSUFICIENTE,
  DS002: CodigoErro.CRITERIO_OBRIGATORIO_AUSENTE,
  DS003: CodigoErro.FEEDBACK_OBRIGATORIO,
  DS004: CodigoErro.ENVIO_SITUACAO_INVALIDA,
  DS005: CodigoErro.AVALIACAO_JA_CONCLUIDA,
  DS010: CodigoErro.SALDO_INSUFICIENTE,
  DS011: CodigoErro.CURADOR_INVALIDO,
  DS012: CodigoErro.SERVICO_FEEDBACK_OBRIGATORIO,
  DS013: CodigoErro.FAIXA_SITUACAO_INVALIDA,
  DS014: CodigoErro.PACOTE_EXCLUIDO,
  DS015: CodigoErro.CADASTRO_CURADOR_JA_CONCLUIDO,
  DS020: CodigoErro.NAO_AUTORIZADO,
  DS021: CodigoErro.CONVITE_INVALIDO,
  DS022: CodigoErro.NAO_AUTORIZADO,
  DS023: CodigoErro.NAO_AUTORIZADO,
  DS024: CodigoErro.NAO_ENCONTRADO,
  DS030: CodigoErro.CONFIGURACAO_AUSENTE,
};

/** Códigos padrão do Postgres com leitura de domínio inequívoca. */
const POR_CODIGO_PADRAO: Readonly<Record<string, CodigoErro>> = {
  // insufficient_privilege — policy de `insert` barrou.
  '42501': CodigoErro.NAO_AUTORIZADO,
  '23505': CodigoErro.CONFLITO, // unique_violation
  '23514': CodigoErro.ENTRADA_INVALIDA, // check_violation
  '23503': CodigoErro.NAO_ENCONTRADO, // foreign_key_violation
  '23502': CodigoErro.ENTRADA_INVALIDA, // not_null_violation
  // `.single()` sem linha: ou não existe, ou a RLS escondeu. Os dois casos são
  // "não encontrado" para quem chamou — distinguir vazaria a existência.
  PGRST116: CodigoErro.NAO_ENCONTRADO,
};

function ehErroPostgres(erro: unknown): erro is ErroPostgres {
  return typeof erro === 'object' && erro !== null && 'code' in erro;
}

/**
 * Devolve o `CodigoErro` correspondente, ou `null` quando não há tradução.
 *
 * Separado de `traduzir` para que um chamador possa tratar só o que conhece —
 * é o caso do webhook do Asaas, que precisa distinguir "duplicado, responder
 * 200" de "falhou, responder 500 para o provedor reentregar".
 */
export function traduzirCodigo(erro: unknown): CodigoErro | null {
  if (!ehErroPostgres(erro) || erro.code === undefined) return null;
  return POR_CODIGO_DISSONA[erro.code] ?? POR_CODIGO_PADRAO[erro.code] ?? null;
}

/** Converte para `ErroDominio` quando há tradução; **relança** quando não há. */
export function traduzir(erro: unknown): never {
  const codigo = traduzirCodigo(erro);
  if (codigo === null) throw erro;
  const sqlstate = ehErroPostgres(erro) ? erro.code : undefined;
  throw new ErroDominio(codigo, sqlstate === undefined ? undefined : { sqlstate });
}

/** Açúcar para o padrão `if (error !== null) traduzir(error)`. */
export function estourarSeErro(erro: unknown): void {
  if (erro === null || erro === undefined) return;
  traduzir(erro);
}
