import estilos from './BarraProgresso.module.css';

export type TomBarra = 'marca' | 'folgado' | 'vencido' | 'sucesso';

export type PropsBarraProgresso = {
  /** Progresso de 0 a 100. Valores fora da faixa sao limitados. */
  readonly percentual: number;
  readonly rotulo: string;
  readonly tom?: TomBarra;
  /** Esconde o rotulo visualmente, mantendo-o para leitor de tela. */
  readonly rotuloOculto?: boolean;
  /** Texto a direita do rotulo - "3 de 8", "43 min restantes". */
  readonly detalhe?: string;
};

const CLASSE_TOM: Record<TomBarra, string | undefined> = {
  marca: estilos.marca,
  folgado: estilos.folgado,
  vencido: estilos.vencido,
  sucesso: estilos.sucesso,
};

export function BarraProgresso({
  percentual,
  rotulo,
  tom = 'marca',
  rotuloOculto = false,
  detalhe,
}: PropsBarraProgresso) {
  const limitado = Math.min(100, Math.max(0, percentual));
  const arredondado = Math.round(limitado);

  return (
    <div className={estilos.envolvente}>
      <div className={rotuloOculto ? 'dsn-apenas-leitor' : estilos.linhaRotulo}>
        <span>{rotulo}</span>
        <span className={estilos.valor}>{detalhe ?? arredondado + '%'}</span>
      </div>

      <div
        className={estilos.trilha}
        role="progressbar"
        aria-label={rotulo}
        aria-valuenow={arredondado}
        aria-valuemin={0}
        aria-valuemax={100}
        /* O texto lido e o detalhe quando ele existe: "3 de 8" diz mais que
         * "38%" em um wizard de cadastro. */
        aria-valuetext={detalhe}
      >
        <div
          className={[estilos.preenchimento, CLASSE_TOM[tom]].filter(Boolean).join(' ')}
          style={{ width: limitado + '%' }}
        />
      </div>
    </div>
  );
}
