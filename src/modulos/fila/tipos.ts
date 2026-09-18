import type { Claves } from '@/lib/claves';
import type { Database } from '@/lib/supabase/tipos-bd';

/**
 * Fila de avaliações — módulo 13.
 *
 * A leitura vem de `fila_do_curador` (migration `0006d`), e não de um embed em
 * `envio`: o nome do artista mora em `perfil`, que é privado, e um
 * `perfil!inner(...)` devolveria fila vazia sem erro.
 */

export type SituacaoEnvio = Database['public']['Enums']['situacao_envio'];
export type TipoServico = Database['public']['Enums']['tipo_servico'];

export type ItemDaFila = {
  readonly envioId: string;
  readonly faixaId: string;
  readonly titulo: string;
  readonly artista: string;
  readonly genero: string | null;
  readonly situacao: SituacaoEnvio;
  readonly prazoEm: Date;
  readonly devolucaoEm: Date;
  readonly enviadoEm: Date;
  readonly totalClaves: Claves;
  readonly duracaoSegundos: number | null;
  readonly contextoCurador: string | null;
  readonly arquivoCaminho: string | null;
  /**
   * Os serviços contratados naquele envio, na ordem do enum.
   *
   * A coluna "Serviço" da fila os lista — *"Feedback + Playlist"* —, e por isso
   * eles vêm junto da lista, e não só no detalhe (13.1). Não estão em
   * `fila_do_curador`: a view é uma linha por envio, e `servico_envio` é N.
   */
  readonly servicos: readonly TipoServico[];
};

export type ServicoContratado = {
  readonly tipo: TipoServico;
  readonly precoClaves: Claves;
};

/**
 * Status como a **tela** os nomeia — três, e não os seis de `situacao_envio`.
 *
 * O protótipo mostra "Nova", "Em escuta" e "Atrasada". "Atrasada" não é um
 * valor do enum: é `recebeu|ouviu|avaliando` com o prazo vencido, o que faz
 * dela um derivado do relógio e não do banco.
 */
export const STATUS_DA_FILA = ['todas', 'nova', 'em_escuta', 'atrasada'] as const;
export type StatusDaFila = (typeof STATUS_DA_FILA)[number];

export function ehStatusDaFila(valor: string | undefined): valor is StatusDaFila {
  return (STATUS_DA_FILA as readonly string[]).includes(valor ?? '');
}

/** As três colunas ordenáveis do protótipo. */
export const ORDENS = ['musica', 'prazo', 'status'] as const;
export type OrdemDaFila = (typeof ORDENS)[number];

export function ehOrdemDaFila(valor: string | undefined): valor is OrdemDaFila {
  return (ORDENS as readonly string[]).includes(valor ?? '');
}

export type Direcao = 'asc' | 'desc';
