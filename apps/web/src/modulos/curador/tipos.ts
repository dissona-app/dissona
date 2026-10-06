import type { SituacaoCurador } from '@/lib/papeis';
import type { Database } from '@/lib/supabase/tipos-bd';
import { CURADOR_CADASTRO } from '@/textos/curador';

/**
 * O wizard tem oito passos, e o número deles está no banco: `passo_cadastro`
 * é `smallint` com `check between 1 and 8`. Mudar a contagem aqui sem mudar o
 * `check` produziria um `23514` no meio do cadastro de alguém.
 */
export const TOTAL_DE_PASSOS = 8;

export type PassoDoCadastro = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export function ehPasso(valor: unknown): valor is PassoDoCadastro {
  const numero = typeof valor === 'string' ? Number(valor) : valor;
  return (
    typeof numero === 'number' &&
    Number.isInteger(numero) &&
    numero >= 1 &&
    numero <= TOTAL_DE_PASSOS
  );
}

/**
 * Os passos que o protótipo deixa pular: canais, credenciais e bio.
 *
 * Não é arbitrário — são os três em que o subtítulo ou o status de revisão diz
 * "Opcional", e nenhum deles é exigido por `concluir_cadastro_curador`. Pular
 * credenciais tem consequência clara: sem credencial comprovada, a
 * classificação é Bronze.
 */
export const PASSOS_PULAVEIS: readonly PassoDoCadastro[] = [4, 6, 7];

/**
 * Tempo de atuação: o rótulo da tela e o código do banco são diferentes.
 *
 * O `check perfil_curador_tempo_conhecido` aceita `<1`, `1-3`, `3-5`, `5-10` e
 * `+10`; o protótipo mostra "Até 1 ano", "1 a 3 anos" e assim por diante.
 * Gravar o rótulo estouraria o `check`, e mostrar o código seria feio — então
 * existe um mapa, e ele mora aqui porque é tradução de domínio, não de idioma.
 */
export const TEMPO_DE_ATUACAO = [
  { codigo: '<1', rotulo: CURADOR_CADASTRO.tempos[0] },
  { codigo: '1-3', rotulo: CURADOR_CADASTRO.tempos[1] },
  { codigo: '3-5', rotulo: CURADOR_CADASTRO.tempos[2] },
  { codigo: '5-10', rotulo: CURADOR_CADASTRO.tempos[3] },
  { codigo: '+10', rotulo: CURADOR_CADASTRO.tempos[4] },
] as const;

export type { SituacaoCurador };

export type CodigoDeTempo = (typeof TEMPO_DE_ATUACAO)[number]['codigo'];

export function rotuloDoTempo(codigo: string | null): string | null {
  return TEMPO_DE_ATUACAO.find((item) => item.codigo === codigo)?.rotulo ?? null;
}

export type ClasseCurador = Database['public']['Enums']['classe_curador'];
export type TipoDeMidia = Database['public']['Enums']['tipo_midia'];
export type TipoDeServico = Database['public']['Enums']['tipo_servico'];

/** As seis credenciais do passo 6 — o `check` da `0002c` aceita exatamente estas. */
export const TIPOS_DE_CREDENCIAL = [
  'anos',
  'playlist',
  'canal',
  'imprensa',
  'disco',
  'formacao',
] as const;

export type TipoDeCredencial = (typeof TIPOS_DE_CREDENCIAL)[number];

/** A única credencial que se comprova por upload, e não por link. */
export const CREDENCIAL_POR_ANEXO: TipoDeCredencial = 'formacao';

export type CanalDoCurador = {
  readonly id: string;
  readonly tipo: TipoDeMidia;
  readonly nome: string;
  readonly url: string;
};

export type ServicoDoCurador = {
  readonly tipo: TipoDeServico;
  readonly precoClaves: number;
  readonly ativo: boolean;
};

export type CredencialDoCurador = {
  readonly tipo: TipoDeCredencial;
  readonly url: string | null;
  readonly anexoCaminho: string | null;
  readonly verificavel: boolean;
};

/**
 * O que a tela precisa saber para renderizar qualquer um dos oito passos.
 *
 * Um objeto só, lido de uma vez: o wizard é retomável, e cada passo mostra o
 * que já foi preenchido nos outros — a revisão do passo 8 mostra todos. Ler por
 * passo faria oito consultas para montar uma tela.
 */
export type EstadoDoCadastro = {
  readonly perfilCuradorId: string;
  readonly passoSalvo: PassoDoCadastro;
  /**
   * Classe e situação, **somente leitura**.
   *
   * Estão aqui porque a tela 12.6 as exibe (PRD §12.6: "a classe aparece
   * somente em leitura"), e porque a regra que essa tela precisa comunicar é
   * justamente que alterar mídia não as muda. Nenhuma escrita do curador as
   * toca: o trigger `proibir_autopromocao_de_classe` recusa, e o único caminho
   * é a RPC `concluir_cadastro_curador`.
   */
  readonly classe: ClasseCurador;
  readonly situacaoCurador: SituacaoCurador;
  readonly nome: string;
  readonly email: string;
  readonly fotoCaminho: string | null;
  readonly generos: readonly string[];
  readonly atuacao: readonly string[];
  readonly tempoAtuacao: string | null;
  readonly bio: string | null;
  readonly especialidade: string | null;
  readonly canais: readonly CanalDoCurador[];
  readonly servicos: readonly ServicoDoCurador[];
  readonly credenciais: readonly CredencialDoCurador[];
  /** `configuracao.classe.prata_min_credenciais` — nunca uma constante daqui. */
  readonly minimoParaPrata: number;
  readonly concluido: boolean;
};

/** Quantas credenciais contam para a classe — a mesma conta que a RPC faz. */
export function credenciaisComprovadas(estado: EstadoDoCadastro): number {
  return estado.credenciais.filter((credencial) => credencial.verificavel).length;
}

export function seriaCandidatoAPrata(estado: EstadoDoCadastro): boolean {
  return credenciaisComprovadas(estado) >= estado.minimoParaPrata;
}
