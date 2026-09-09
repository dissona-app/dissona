'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';
import { useId } from 'react';

import estilos from './Campo.module.css';

export type PropsCampo = Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'id'> & {
  readonly rotulo: string;
  /** Texto já traduzido pela View — o serviço devolve código, não mensagem. */
  readonly erro?: string;
  readonly auxiliar?: string;
  readonly denso?: boolean;
  /** Botão à direita, dentro do campo: mostrar senha, limpar, colar. */
  readonly acao?: ReactNode;
  /**
   * Elemento à direita, na linha do rótulo — o "Esqueci minha senha" das
   * telas 1 e 19. Fora do `<label>` de propósito: um link dentro do rótulo
   * seria alcançado pelo clique que deveria focar o campo.
   */
  readonly acessorioDoRotulo?: ReactNode;
};

/**
 * O protótipo associa label e input por aninhamento implícito. Aqui a
 * associação é explícita por `htmlFor`/`id` (design-system.md §4.4): resiste a
 * reposicionamento no layout e é necessária quando os dois não são irmãos.
 */
export function Campo({
  rotulo,
  erro,
  auxiliar,
  denso = false,
  acao,
  acessorioDoRotulo,
  required = false,
  ...resto
}: PropsCampo) {
  const id = useId();
  const idErro = `${id}-erro`;
  const idAuxiliar = `${id}-auxiliar`;

  const descricoes = [
    erro !== undefined ? idErro : null,
    auxiliar !== undefined ? idAuxiliar : null,
  ]
    .filter(Boolean)
    .join(' ');

  const classesEntrada = [
    estilos.entrada,
    denso ? estilos.denso : undefined,
    acao !== undefined ? estilos.comAcao : undefined,
    erro !== undefined ? estilos.invalido : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  const marcacaoDoRotulo = (
    <label
      className={[estilos.rotulo, required ? estilos.rotuloObrigatorio : undefined]
        .filter(Boolean)
        .join(' ')}
      htmlFor={id}
    >
      {rotulo}
    </label>
  );

  return (
    <div className={estilos.envolvente}>
      {acessorioDoRotulo === undefined ? (
        marcacaoDoRotulo
      ) : (
        <div className={estilos.linhaDoRotulo}>
          {marcacaoDoRotulo}
          {acessorioDoRotulo}
        </div>
      )}

      <div className={estilos.caixa}>
        <input
          {...resto}
          id={id}
          className={classesEntrada}
          required={required}
          aria-required={required || undefined}
          aria-invalid={erro !== undefined || undefined}
          aria-describedby={descricoes === '' ? undefined : descricoes}
        />
        {acao !== undefined ? <span className={estilos.acao}>{acao}</span> : null}
      </div>

      {erro !== undefined ? (
        // `role="alert"` para o erro ser anunciado quando a validação o insere.
        <span className={estilos.erro} id={idErro} role="alert">
          {erro}
        </span>
      ) : null}

      {auxiliar !== undefined ? (
        <span className={estilos.auxiliar} id={idAuxiliar}>
          {auxiliar}
        </span>
      ) : null}
    </div>
  );
}
