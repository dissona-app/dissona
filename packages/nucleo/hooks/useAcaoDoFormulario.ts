'use client';

import type { FormEvent } from 'react';
import { startTransition, useActionState, useCallback } from 'react';

/**
 * `useActionState` **sem** o reset automático do `<form>`.
 *
 * ## O problema
 *
 * No React 19, todo `<form action={fn}>` é resetado depois que a action
 * termina — com sucesso ou com erro. Os campos não controlados voltam ao
 * `defaultValue` (o que está no banco) e os vazios, ao vazio. Num erro de
 * validação, isso apagava tudo o que a pessoa tinha digitado nos **outros**
 * campos: um link inválido no perfil limpava cidade, gêneros e links; uma
 * senha errada no login limpava o e-mail. (Visto em 14/10/2026.)
 *
 * ## A saída
 *
 * O `onSubmit` cancela o envio nativo e despacha a mesma action numa
 * transição. Sem o `<form action>` disparar, o React não reseta nada, e o que a
 * pessoa digitou fica. O `action={enviar}` continua no `<form>`: sem
 * JavaScript, o navegador envia por POST normal, como antes.
 *
 * ```tsx
 * const [estado, enviar, pendente, aoEnviar] = useAcaoDoFormulario(acao, null);
 * <form action={enviar} onSubmit={aoEnviar}>…</form>
 * ```
 *
 * Botões com `formAction` próprio ("Voltar" e "Pular" do wizard) seguem o
 * caminho normal do React: eles navegam, e o reset não tira nada de ninguém.
 *
 * Quem **quer** o formulário limpo depois do sucesso (um convite enviado) chama
 * `formulario.reset()` por conta própria — o padrão aqui é manter.
 */
export function useAcaoDoFormulario<Estado>(
  acao: (anterior: Awaited<Estado>, dados: FormData) => Estado | Promise<Estado>,
  inicial: Awaited<Estado>,
): readonly [
  estado: Awaited<Estado>,
  enviar: (dados: FormData) => void,
  pendente: boolean,
  aoEnviar: (evento: FormEvent<HTMLFormElement>) => void,
] {
  const [estado, enviar, pendente] = useActionState(acao, inicial);

  const aoEnviar = useCallback(
    (evento: FormEvent<HTMLFormElement>) => {
      // Uma validação de cliente que já cancelou o envio manda mais que nós.
      if (evento.defaultPrevented) return;

      const botao = (evento.nativeEvent as SubmitEvent).submitter;
      // `formAction` próprio: é outra action, e não a deste formulário.
      if (botao?.hasAttribute('formaction') === true) return;

      evento.preventDefault();
      // O `submitter` entra no `FormData` com o `name`/`value` do botão, como
      // num envio nativo.
      const dados = new FormData(evento.currentTarget, botao ?? undefined);
      startTransition(() => enviar(dados));
    },
    [enviar],
  );

  return [estado, enviar, pendente, aoEnviar] as const;
}
