import type { Database } from '@/lib/supabase/tipos-bd';

/**
 * Envio de música — módulo 3.
 *
 * Wizard de 3 passos, e a faixa nasce no passo 1 como `rascunho`. O progresso
 * **não** tem coluna própria, ao contrário de `perfil_curador.passo_cadastro`:
 * aqui ele é derivado do que já foi preenchido (`passoAlcancado`), porque os
 * campos de cada passo são obrigatórios e a presença deles já é a resposta.
 * Uma coluna a mais seria um segundo lugar para a mesma verdade.
 */

export type OrigemFaixa = Database['public']['Enums']['origem_faixa'];
export type SituacaoFaixa = Database['public']['Enums']['situacao_faixa'];

export const PASSOS = ['faixa', 'contexto', 'revisao'] as const;
export type PassoDoEnvio = (typeof PASSOS)[number];

export function ehPassoDoEnvio(valor: string | undefined): valor is PassoDoEnvio {
  return (PASSOS as readonly string[]).includes(valor ?? '');
}

export const TOTAL_DE_PASSOS = PASSOS.length;

/** A faixa em edição, como as telas do wizard a lêem. */
export type FaixaEmEdicao = {
  readonly id: string;
  readonly titulo: string;
  readonly capaCaminho: string | null;
  readonly estilo: string | null;
  readonly genero: string | null;
  readonly contextoCurador: string | null;
  readonly lancada: boolean | null;
  readonly dataLancamento: string | null;
  readonly origem: OrigemFaixa;
  readonly urlSpotify: string | null;
  readonly urlYoutube: string | null;
  readonly arquivoCaminho: string | null;
  readonly duracaoSegundos: number | null;
  readonly situacao: SituacaoFaixa;
};

/** Metadados que a autodetecção por link devolve. Todos opcionais. */
export type MetadadosDetectados = {
  readonly titulo?: string;
  readonly capaUrl?: string;
  readonly duracaoSegundos?: number;
  readonly artista?: string;
};

/**
 * Limites do upload, lidos de `configuracao`.
 *
 * Nunca constantes daqui: `upload.tamanho_max_mb` e `upload.formatos` são
 * número de negócio. O protótipo tem "até 30 MB" no rótulo da dropzone e
 * "até 50 MB" no onboarding — a configuração diz 50, e é ela que vale.
 */
export type LimitesDeUpload = {
  readonly tamanhoMaxMb: number;
  readonly formatos: readonly ('wav' | 'mp3')[];
};
