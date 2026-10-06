'use client';

import { useActionState } from 'react';

import type { FalhaDeAcao, ResultadoDeAcao } from '@dissona/nucleo/lib/acoes';

export type EstadoDoPasso = {
  /** Passar direto para `<form action>`. */
  readonly enviar: (dados: FormData) => void;
  readonly pendente: boolean;
  /**
   * O código do motivo da falha, quando houve — `genero_obrigatorio`,
   * `canal_sem_nome`. A tela traduz.
   */
  readonly motivo: string | undefined;
  /** Um motivo por campo, para os passos com mais de um campo (3 e 7). */
  readonly motivos: Readonly<Record<string, string>>;
  /**
   * A falha crua, para a tela montar a **superfície de erro geral**.
   *
   * `motivo` sai de `detalhes.motivo` e `motivos` de `campos` — e muita
   * `falha()` das ações não traz nem um nem outro: o anexo recusado do passo 6
   * volta como `falha(FORMATO_NAO_SUPORTADO, 'arquivo')`, sem detalhes. Sem
   * esta chave, o passo não avançava e não dizia por quê.
   */
  readonly falha: FalhaDeAcao | null;
};

/**
 * O encanamento comum dos oito passos do wizard.
 *
 * Um hook, e não um componente com *render prop*: as páginas dos passos são
 * Server Components, e uma função como `children` não atravessa a fronteira do
 * servidor — ela não é serializável. Um hook fica inteiro do lado do cliente,
 * onde os campos já estão.
 *
 * Ele não decide nada: só desembrulha o `ResultadoDeAcao` em "o que deu errado"
 * e devolve o `action` e o `pending`. A tradução para texto continua sendo da
 * View, e a validação continua sendo do servidor.
 */
export function usePasso(acao: (dados: FormData) => Promise<ResultadoDeAcao>): EstadoDoPasso {
  const [resultado, enviar, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acao(dados),
    null,
  );

  const falhou = resultado !== null && !resultado.ok;
  const doDetalhe = falhou ? resultado.detalhes?.['motivo'] : undefined;

  return {
    enviar,
    pendente,
    motivo: typeof doDetalhe === 'string' ? doDetalhe : undefined,
    motivos: falhou ? (resultado.campos ?? {}) : {},
    falha: falhou ? resultado : null,
  };
}
