/**
 * Contexto de sessão: papéis, situação da conta, estado do curador, onboarding,
 * último ambiente e aceite de termos.
 *
 * Uma consulta, não sete. O `middleware.ts` roda em `gru1` e o banco está em
 * `us-west-2` — cada ida custa ~120 ms (architecture.md §9), e a guarda de rota
 * precisa de todas em toda navegação. A RPC `ler_contexto_sessao`
 * (migrations `0002`, `0002b` e `0002d`) devolve tudo de uma vez.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './supabase/tipos-bd';

export const Papel = {
  ARTISTA: 'artista',
  CURADOR: 'curador',
  ADMIN: 'admin',
} as const;

export type Papel = (typeof Papel)[keyof typeof Papel];

/**
 * `as const satisfies` nos dois registros abaixo: o `satisfies` é o que faz o
 * `typecheck` falhar se o enum do banco mudar e o registro não acompanhar.
 * Um `as const` sozinho deixaria os dois divergirem em silêncio, e a divergência
 * apareceria como uma comparação que nunca é verdadeira.
 */
export const SituacaoConta = {
  ATIVA: 'ativa',
  BLOQUEADA: 'bloqueada',
  DESATIVADA: 'desativada',
  EXCLUIDA: 'excluida',
} as const satisfies Record<string, Database['public']['Enums']['situacao_conta']>;

export type SituacaoConta = (typeof SituacaoConta)[keyof typeof SituacaoConta];

export const SituacaoCurador = {
  RASCUNHO: 'rascunho',
  BRONZE_APROVADO: 'bronze_aprovado',
  PRATA_EM_ANALISE: 'prata_em_analise',
  PRATA_APROVADO: 'prata_aprovado',
  PRATA_RECUSADO: 'prata_recusado',
} as const satisfies Record<string, Database['public']['Enums']['situacao_curador']>;

export type SituacaoCurador = (typeof SituacaoCurador)[keyof typeof SituacaoCurador];

export type LeituraDePapeis =
  | { readonly estado: 'sem_sessao' }
  | {
      readonly estado: 'ok';
      readonly papeis: readonly Papel[];
      /** `perfil_curador.cadastro_concluido_em is not null` — guarda da rota do curador. */
      readonly cadastroCuradorConcluido: boolean;
      readonly situacao: SituacaoConta;
      /** `null` para quem não tem `perfil_curador`. */
      readonly situacaoCurador: SituacaoCurador | null;
      /** RF-007 — o tour aparece uma vez, e reabre só sob pedido. */
      readonly onboardingVisto: boolean;
      /** RF-008 — `null` antes do primeiro login com papel definido. */
      readonly ultimoAmbiente: Papel | null;
      /**
       * RF-010 — o aceite de Termos e da Política de privacidade.
       *
       * Sempre verdadeiro para conta criada por e-mail, onde o aceite é
       * obrigatório. **Falso** para conta criada por login social: o provedor
       * devolve nome e e-mail, e ninguém aceitou nada. É a guarda de rota que
       * fecha esse caso.
       */
      readonly aceiteTermos: boolean;
    };

/** Aceita qualquer cliente tipado — o do servidor e o do middleware. */
type Cliente = SupabaseClient<Database>;

function ehPapel(valor: unknown): valor is Papel {
  return typeof valor === 'string' && Object.values<string>(Papel).includes(valor);
}

function ehSituacaoConta(valor: unknown): valor is SituacaoConta {
  return typeof valor === 'string' && Object.values<string>(SituacaoConta).includes(valor);
}

function ehSituacaoCurador(valor: unknown): valor is SituacaoCurador {
  return typeof valor === 'string' && Object.values<string>(SituacaoCurador).includes(valor);
}

export async function lerContextoSessao(
  supabase: Cliente,
  usuarioId: string | null,
): Promise<LeituraDePapeis> {
  if (usuarioId === null) return { estado: 'sem_sessao' };

  const { data, error } = await supabase.rpc('ler_contexto_sessao').single();

  if (error !== null) throw error;

  // Os tipos gerados **mentem sobre nulidade** aqui, e não é bug do gerador:
  // ele não tem como saber que uma coluna de `returns table` pode vir nula.
  // `situacao` e `ultimo_ambiente` vêm de um `left join` que existe justamente
  // para a função devolver uma linha quando não há `perfil`. Confiar no tipo
  // gerado seria confiar num `not null` que o banco não promete.
  return {
    estado: 'ok',
    papeis: (data.papeis ?? []).filter(ehPapel),
    cadastroCuradorConcluido: data.cadastro_curador_concluido ?? false,
    // Sem linha de `perfil` a conta é tratada como ativa. É um estado que não
    // deveria existir — o trigger cria o perfil no mesmo instante da conta —,
    // e trancar a pessoa fora por causa dele seria pior que deixá-la entrar.
    situacao: ehSituacaoConta(data.situacao) ? data.situacao : SituacaoConta.ATIVA,
    situacaoCurador: ehSituacaoCurador(data.situacao_curador) ? data.situacao_curador : null,
    onboardingVisto: data.onboarding_visto ?? false,
    ultimoAmbiente: ehPapel(data.ultimo_ambiente) ? data.ultimo_ambiente : null,
    aceiteTermos: data.aceite_termos ?? false,
  };
}

export function temPapel(leitura: LeituraDePapeis, papel: Papel): boolean {
  return leitura.estado === 'ok' && leitura.papeis.includes(papel);
}

/**
 * A conta pode navegar?
 *
 * `bloqueada` e `excluida` não. `desativada` **sim**: a exclusão é reversível
 * por 30 dias "entrando de novo" (regras §10), e é o próprio login que reverte
 * — barrar aqui tornaria a reversão impossível.
 */
export function contaAtiva(leitura: LeituraDePapeis): boolean {
  if (leitura.estado !== 'ok') return false;
  return leitura.situacao === SituacaoConta.ATIVA || leitura.situacao === SituacaoConta.DESATIVADA;
}
