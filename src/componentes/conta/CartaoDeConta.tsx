import type { ReactNode } from 'react';

import estilos from './CartaoDeConta.module.css';

export type VarianteCartaoDeConta = 'padrao' | 'destaque' | 'perigo';

export type PropsCartaoDeConta = {
  readonly overline: string;
  readonly titulo: string;
  /** Valor em destaque no lugar do título — o e-mail da conta, por exemplo. */
  readonly valor?: string;
  readonly nota: string;
  /** Botão ou link à direita. */
  readonly acao?: ReactNode;
  /** Conteúdo abaixo da linha principal — o aviso de sucesso, por exemplo. */
  readonly children?: ReactNode;
  readonly variante?: VarianteCartaoDeConta;
};

const CLASSE_VARIANTE: Record<VarianteCartaoDeConta, string | undefined> = {
  padrao: undefined,
  destaque: estilos.destaque,
  perigo: estilos.perigo,
};

/**
 * O card de seção das telas de Conta — overline, título, nota e uma ação à
 * direita.
 *
 * Existe porque o protótipo repete essa mesma caixa **nove vezes** entre os
 * três ambientes, mudando apenas o texto e a cor: e-mail, cobrança,
 * recebimento, papéis, senha, encerrar conta, dados pessoais, equipe. Escrever
 * o layout em cada uma delas era o caminho para nove versões ligeiramente
 * diferentes do mesmo card.
 *
 * `variante` cobre as três molduras que o Design System §2.4.1 registra: a
 * padrão, a de destaque (`#F6F3FB`, o card de papéis) e a de erro (`#EBD2CD` /
 * `#FDF8F7`, o de encerrar conta).
 *
 * Sem `<h2>`: o título aqui é rótulo de um controle, não cabeçalho de seção — a
 * página já tem a sua hierarquia, e nove `<h2>` numa aba a achatariam.
 */
export function CartaoDeConta({
  overline,
  titulo,
  valor,
  nota,
  acao,
  children,
  variante = 'padrao',
}: PropsCartaoDeConta) {
  return (
    <section
      className={[estilos.base, CLASSE_VARIANTE[variante]].filter(Boolean).join(' ')}
      aria-label={titulo}
    >
      <div className={estilos.linha}>
        <div className={estilos.textos}>
          <span className={estilos.overline}>{overline}</span>
          <span className={estilos.titulo}>{valor ?? titulo}</span>
          <span className={estilos.nota}>{nota}</span>
        </div>

        {acao !== undefined ? <div className={estilos.acao}>{acao}</div> : null}
      </div>

      {children}
    </section>
  );
}
