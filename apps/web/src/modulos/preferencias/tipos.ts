import type { Database } from '@dissona/nucleo/lib/supabase/tipos-bd';

/**
 * Preferências de notificação e idioma — telas 7.3 e 17.3.
 *
 * O catálogo de eventos é `evento_notificacao`, semeado com os 42 eventos das
 * cinco releases na `0005`. A preferência do usuário é uma linha em
 * `preferencia_notificacao`; **a ausência da linha é o padrão**, não um estado
 * inválido — por isso a leitura parte do catálogo e sobrepõe o que existir.
 */

export type Canal = Database['public']['Enums']['canal_notificacao'];

export type PreferenciaDeEvento = {
  readonly evento: string;
  readonly titulo: string;
  /**
   * Evento crítico: a preferência é ignorada no envio
   * (`registrar_notificacao`), e a tela mostra os controles travados.
   * "Eventos críticos não são desativáveis" é regra da matriz de notificações.
   */
  readonly critico: boolean;
  /** O canal está ligado para este usuário — já com o padrão aplicado. */
  readonly inApp: boolean;
  readonly email: boolean;
  /** O canal existe para este evento; um que não existe nem aparece. */
  readonly temInApp: boolean;
  readonly temEmail: boolean;
};

/** Uma linha de `evento_notificacao`, como o repositório a devolve. */
export type EventoDoCatalogo = {
  readonly chave: string;
  readonly titulo: string;
  readonly critico: boolean;
  readonly canaisPadrao: readonly Canal[];
};

/** Uma linha de `preferencia_notificacao` — só o que difere do padrão. */
export type EscolhaDeEvento = {
  readonly evento: string;
  readonly inApp: boolean;
  readonly email: boolean;
};

export type Idioma = 'pt-BR' | 'es' | 'en';

export const IDIOMAS: readonly Idioma[] = ['pt-BR', 'es', 'en'];

export function ehIdioma(valor: string): valor is Idioma {
  return (IDIOMAS as readonly string[]).includes(valor);
}

export type Preferencias = {
  readonly eventos: readonly PreferenciaDeEvento[];
  readonly idioma: Idioma;
};
