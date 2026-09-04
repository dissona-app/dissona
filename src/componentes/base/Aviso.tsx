import type { ReactNode } from 'react';

import estilos from './Aviso.module.css';

export type TomAviso = 'info' | 'sucesso' | 'alerta' | 'erro';

export type PropsAviso = {
  readonly tom?: TomAviso;
  readonly titulo?: string;
  readonly icone?: ReactNode;
  readonly acao?: ReactNode;
  /**
   * Aviso que ja esta na pagina ao carregar, e nao apareceu em resposta a uma
   * acao. Renderiza sem live region.
   */
  readonly estatico?: boolean;
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
 *
 * `estatico` remove a live region. Aviso que ja nasce na pagina nao deve ser
 * live region nenhuma: `role="alert"` interromperia a leitura para anunciar
 * algo que o leitor vai encontrar sozinho ao percorrer o conteudo, e
 * `role="status"` gastaria a fila de anuncios com texto permanente. Live
 * region e para o que MUDA.
 */
export function Aviso({
  tom = 'info',
  titulo,
  icone,
  acao,
  estatico = false,
  children,
}: PropsAviso) {
  const urgente = tom === 'erro' || tom === 'alerta';
  const papel = estatico ? undefined : urgente ? 'alert' : 'status';

  return (
    <div className={[estilos.base, CLASSE_TOM[tom]].filter(Boolean).join(' ')} role={papel}>
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
