/**
 * Mensagem de última instância — a superfície de erro **geral** dos formulários.
 *
 * ## Por que existe
 *
 * `falha(codigo, campo)` grava a chave `campo`; `falhaDeCampos(codigo, campos)`
 * grava `campos`. A maioria das telas lê só `campos?.[campo]`, e há dezenas de
 * `falha()` nas ações que nunca chegam a campo nenhum — `PAPEL_AUSENTE`,
 * `NAO_AUTORIZADO`, `CONFLITO`, o `SENHA_FRACA` que o Auth julga por conta
 * própria. Quando uma delas volta, a pessoa clica no botão e **nada acontece**:
 * sem mensagem, sem navegação, sem mudança de DOM.
 *
 * A regra que sai daqui, e que também está no `AGENTS.md`: **todo formulário tem
 * superfície de erro geral**. Falha sem mensagem é bug, não detalhe.
 *
 * ## Por que o texto é por código, e não por campo
 *
 * Aqui não se traduz motivo de validação — isso é da tela, que conhece os
 * campos dela. O que se traduz é o código de domínio que **nenhuma** tela
 * pinta: o que sobrou depois que a tela tentou e não achou onde pôr.
 */

import type { FalhaDeAcao } from '@dissona/nucleo/lib/acoes';
import { CodigoErro } from '@dissona/nucleo/lib/erros';

/** O que dizer quando não há nada mais específico a dizer. */
export const ERRO_GERAL = 'Não foi possível concluir agora. Tente de novo.';

/**
 * Os códigos que pedem uma resposta diferente da genérica.
 *
 * Fica de fora tudo que a tela já sabe pintar num campo: o mapa é o que **não**
 * chegou a campo nenhum. Código ausente cai em `ERRO_GERAL`, que é a resposta
 * honesta — "não deu, tente de novo" — e não uma tradução mecânica do enum.
 */
const MENSAGEM_POR_CODIGO: Readonly<Partial<Record<CodigoErro, string>>> = {
  [CodigoErro.NAO_AUTENTICADO]: 'Sua sessão terminou. Entre de novo para continuar.',
  [CodigoErro.NAO_AUTORIZADO]: 'Você não tem permissão para fazer isso.',
  [CodigoErro.NAO_ENCONTRADO]: 'Não encontramos o que você pediu. Recarregue a página.',
  [CodigoErro.ENTRADA_INVALIDA]: 'Confira os dados preenchidos e tente de novo.',
  [CodigoErro.CONFLITO]: 'Esse dado já está em uso. Escolha outro e tente de novo.',
  [CodigoErro.PAPEL_AUSENTE]: 'Sua conta ainda não tem perfil de artista.',
  [CodigoErro.SENHA_FRACA]:
    'Essa senha não foi aceita. Escolha uma senha diferente, com pelo menos 8 caracteres e um número.',
  [CodigoErro.SENHAS_DIFERENTES]: 'As senhas não coincidem.',
  [CodigoErro.REAUTENTICACAO_INVALIDA]: 'A senha atual não confere.',
  [CodigoErro.TOKEN_INVALIDO]: 'O link não é mais válido. Peça outro.',
  [CodigoErro.TOKEN_EXPIRADO]: 'O link expirou. Peça outro.',
  [CodigoErro.EMAIL_JA_CADASTRADO]: 'Esse e-mail já está em uso.',
  [CodigoErro.EMAIL_INVALIDO]: 'Esse endereço de e-mail não foi aceito.',
  [CodigoErro.LIMITE_DE_ENVIO]:
    'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
  [CodigoErro.SALDO_INSUFICIENTE]: 'Seu saldo de Claves não é suficiente.',
  [CodigoErro.PRAZO_EXPIRADO]: 'O prazo para esta ação já passou.',
  [CodigoErro.ARQUIVO_MUITO_GRANDE]: 'O arquivo é maior que o limite aceito.',
  [CodigoErro.FORMATO_NAO_SUPORTADO]: 'Esse formato de arquivo não é aceito.',
  [CodigoErro.CONFIGURACAO_AUSENTE]: ERRO_GERAL,
  [CodigoErro.CONFIGURACAO_INVALIDA]: ERRO_GERAL,
};

/** Texto de última instância para uma falha que não achou campo. */
export function mensagemDaFalha(falha: FalhaDeAcao): string {
  return MENSAGEM_POR_CODIGO[falha.codigo] ?? ERRO_GERAL;
}

/**
 * O texto do aviso geral — ou `undefined` quando a tela já disse algo.
 *
 * `pintados` são as mensagens que a tela colocou nos campos nesta renderização,
 * na ordem que quiser; `jaTratado` é o escape para a tela que já mostra um
 * banner próprio para aquele código (e-mail em uso, limite de envio), e que não
 * deve dizer a mesma coisa duas vezes.
 *
 * Repare que a condição é "a tela **não pintou nada**", e não "a falha não tem
 * `campo`": é a diferença entre cobrir a classe inteira e cobrir metade dela —
 * `falha(SENHA_FRACA, 'senha')` tem `campo`, e some do mesmo jeito numa tela que
 * só lê `campos`.
 */
export function erroGeralDe(
  falha: FalhaDeAcao | null,
  pintados: readonly (string | undefined)[],
  jaTratado = false,
): string | undefined {
  if (falha === null || jaTratado) return undefined;
  if (pintados.some((mensagem) => mensagem !== undefined)) return undefined;
  return mensagemDaFalha(falha);
}
