import type { ReactNode } from 'react';

import { OrbitaDeFundo } from '@dissona/nucleo/componentes/autenticacao/OrbitaDeFundo';
import { Marca } from '@dissona/nucleo/componentes/base/Marca';

import estilos from './MolduraDaClasse.module.css';

export type TomDaClasse = 'bronze' | 'prata' | 'analise';

export type PropsMolduraDaClasse = {
  /**
   * Pastilha acima do título — "Curador Bronze aprovado", "Em análise". A
   * classificação não tem: a medalha e o título já dizem a classe.
   */
  readonly selo?: string;
  /** A marca no topo do cartão — medalha da classe ou o relógio da análise. */
  readonly icone: 'bronze' | 'prata' | 'bronzeAprovado' | 'analise';
  /** Largura do cartão no protótipo aprovado (520, 560 ou 480). */
  readonly largura: number;
  readonly titulo: string;
  readonly subtitulo?: string;
  readonly texto: string;
  readonly tom: TomDaClasse;
  readonly children: ReactNode;
};

/**
 * Moldura das três telas de 12.4 e 12.5 — classificação, Bronze e em análise.
 *
 * Uma composição para as três porque elas são a mesma tela com conteúdo
 * diferente: selo, título, parágrafo e um bloco embaixo. O protótipo as escreve
 * inteiras, uma a uma, e é onde o padding e o gap divergem entre elas sem
 * motivo.
 *
 * Tela cheia, como o wizard, e pelo mesmo motivo: nesta altura o curador pode
 * não ter acesso ao painel — o candidato a Prata fica em `prata_em_analise`, e
 * a guarda de rota o mantém fora dele.
 */
export function MolduraDaClasse({
  selo,
  icone,
  largura,
  titulo,
  subtitulo,
  texto,
  tom,
  children,
}: PropsMolduraDaClasse) {
  return (
    <div className={estilos.pagina}>
      {/* Classificação, Bronze e Em análise: o fundo escuro com a órbita
          centrada do protótipo aprovado. */}
      <OrbitaDeFundo centro="50%" />

      {/* Protótipo aprovado: a marca centrada numa faixa de 78px no topo. */}
      <header className={estilos.topo}>
        <Marca variante="branca" altura="46px" />
      </header>

      <main className={estilos.miolo}>
        <div className={estilos.cartao} style={{ maxWidth: largura }}>
          <IconeDaClasse icone={icone} />
          {selo === undefined ? null : <span className={CLASSE_DO_TOM[tom]}>{selo}</span>}

          <div className={estilos.cabecalho}>
            {/* O Bronze tem um degrau a mais na escala — ver o CSS. */}
            <h1
              className={
                icone === 'bronzeAprovado'
                  ? tituloBronze
                  : icone === 'analise'
                    ? estilos.titulo
                    : `${estilos.titulo ?? ''} ${estilos.tituloDaMedalha ?? ''}`
              }
            >
              {titulo}
            </h1>
            {subtitulo === undefined ? null : (
              <span className={estilos.subtitulo}>{subtitulo}</span>
            )}
            <p
              className={
                icone === 'bronzeAprovado'
                  ? `${estilos.texto ?? ''} ${estilos.textoBronze ?? ''}`
                  : estilos.texto
              }
            >
              {texto}
            </p>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}

/** Medalha com o glifo de ondas (bronze/prata) ou o relógio da análise. */
function IconeDaClasse({ icone }: { readonly icone: PropsMolduraDaClasse['icone'] }) {
  if (icone === 'analise') {
    return (
      <span className={estilos.relogio} aria-hidden="true">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className={[estilos.medalha, icone === 'prata' ? estilos.medalhaPrata : undefined]
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      >
        <path d="M5 15V9" />
        <path d="M9.7 19V5" />
        <path d="M14.3 17.5v-11" />
        <path d="M19 14v-4" />
      </svg>
      {icone === 'bronzeAprovado' ? (
        <span className={estilos.aprovada}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
      ) : null}
    </span>
  );
}

const tituloBronze = `${estilos.titulo ?? ''} ${estilos.tituloBronze ?? ''}`;

const CLASSE_DO_TOM: Record<TomDaClasse, string> = {
  bronze: estilos.seloBronze ?? '',
  prata: estilos.seloPrata ?? '',
  analise: estilos.seloAnalise ?? '',
};
