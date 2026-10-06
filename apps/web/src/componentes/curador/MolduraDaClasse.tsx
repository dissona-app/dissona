import type { ReactNode } from 'react';

import { OndasDeFundo } from '@dissona/nucleo/componentes/autenticacao/OndasDeFundo';

import estilos from './MolduraDaClasse.module.css';

export type TomDaClasse = 'bronze' | 'prata' | 'analise';

export type PropsMolduraDaClasse = {
  /** Pastilha acima do título — "Curador Bronze aprovado", "Em análise". */
  readonly selo: string;
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
  titulo,
  subtitulo,
  texto,
  tom,
  children,
}: PropsMolduraDaClasse) {
  return (
    <div className={estilos.pagina}>
      <OndasDeFundo />

      <main className={estilos.miolo}>
        <div className={estilos.cartao}>
          <span className={CLASSE_DO_TOM[tom]}>{selo}</span>

          <div className={estilos.cabecalho}>
            {/* O Bronze tem um degrau a mais na escala — ver o CSS. */}
            <h1 className={tom === 'bronze' ? tituloBronze : estilos.titulo}>{titulo}</h1>
            {subtitulo === undefined ? null : (
              <span className={estilos.subtitulo}>{subtitulo}</span>
            )}
            <p className={estilos.texto}>{texto}</p>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}

const tituloBronze = `${estilos.titulo ?? ''} ${estilos.tituloBronze ?? ''}`;

const CLASSE_DO_TOM: Record<TomDaClasse, string> = {
  bronze: estilos.seloBronze ?? '',
  prata: estilos.seloPrata ?? '',
  analise: estilos.seloAnalise ?? '',
};
