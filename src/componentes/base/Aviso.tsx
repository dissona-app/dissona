import type { ReactNode } from 'react';

import estilos from './Aviso.module.css';

export type TomAviso = 'info' | 'sucesso' | 'alerta' | 'erro';

export type PropsAviso = {
  readonly tom?: TomAviso;
  readonly titulo?: string;
  readonly icone?: ReactNode;
  readonly acao?: ReactNode;
  readonly children: ReactNode;
};

const CLASSE_TOM: Record<TomAviso, string | undefined> = {
  info: estilos.info,
  sucesso: estilos.sucesso,
  alerta: estilos.alerta,
  erro: estilos.erro,
};

/**
 * Banner inline.
 *
 * Tom `erro` e `alerta` recebem `role="alert"`, que o leitor de tela anuncia
 * na hora - e o caso de "saldo insuficiente" e de falha de pagamento. Tom
 * `info` e `sucesso` usam `role="status"`, que espera a pausa e nao interrompe
 * o que estiver sendo lido.
 */
export function Aviso({ tom = 'info', titulo, icone, acao, children }: PropsAviso) {
  const urgente = tom === 'erro' || tom === 'alerta';

  return (
    <div
      className={[estilos.base, CLASSE_TOM[tom]].filter(Boolean).join(' ')}
      role={urgente ? 'alert' : 'status'}
    >
      {icone !== undefined ? (
        <span className={estilos.icone} aria-hidden="true">
          {icone}
        </span>
      ) : null}

      <div className={estilos.conteudo}>
        {titulo !== undefined ? <span className={estilos.titulo}>{titulo}</span> : null}
        <span>{children}</span>
      </div>

      {acao !== undefined ? <div className={estilos.acao}>{acao}</div> : null}
    </div>
  );
}
