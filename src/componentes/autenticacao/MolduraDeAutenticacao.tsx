import Link from 'next/link';
import type { ReactNode } from 'react';

import { ROTA } from '@/lib/guarda-rota';

import estilos from './MolduraDeAutenticacao.module.css';
import { OndasDeFundo } from './OndasDeFundo';

export type LinkDeRodape = {
  readonly rotulo: string;
  readonly href: string;
};

export type PropsMoldura = {
  /** Chamada acima do card — só a tela 1 (artista/curador) tem. */
  readonly chamada?: { readonly overline: string; readonly titulo: string };
  /** Provas sociais do pé — idem. */
  readonly provas?: readonly string[];
  readonly linksDeRodape: readonly LinkDeRodape[];
  readonly children: ReactNode;
};

const ANO = 2026;

/**
 * Página das telas de autenticação: fundo, marca, card centralizado e rodapé.
 *
 * As telas 1 e 19 são a mesma composição com dois elementos opcionais, então
 * são um componente com dois `props` opcionais — não dois arquivos parecidos.
 * A alternativa apareceu no protótipo, que tem as duas telas escritas por
 * inteiro em arquivos diferentes, e é onde o card do admin ficou com `gap:16px`
 * e o do artista com `gap:14px` sem nenhuma razão.
 *
 * O `gap` unificado é 16px (`--dsn-space-8`), o do admin — o card do artista
 * tem mais elementos e o espaço maior o organiza melhor.
 */
export function MolduraDeAutenticacao({ chamada, provas, linksDeRodape, children }: PropsMoldura) {
  return (
    <div className={estilos.pagina}>
      <OndasDeFundo />

      <main className={estilos.miolo}>
        <Link className={estilos.marca} href={ROTA.HOME}>
          <span className={estilos.marcaIcone} aria-hidden="true" />
          Dissona
        </Link>

        {chamada !== undefined ? (
          <div className={estilos.chamada}>
            <span className={estilos.chamadaOverline}>{chamada.overline}</span>
            {/*
              O `<h1>` da página é o título da chamada quando ela existe; sem
              chamada (tela 19), o `<h1>` é o do card. Um só `<h1>` por página,
              sempre — dois quebra a estrutura para leitor de tela.
            */}
            <h1 className={estilos.chamadaTitulo}>{chamada.titulo}</h1>
          </div>
        ) : null}

        <div className={estilos.card}>{children}</div>

        {provas !== undefined && provas.length > 0 ? (
          <p className={estilos.provas}>
            {provas.map((prova, indice) => (
              <span key={prova}>
                {indice > 0 ? (
                  <span className={estilos.separador} aria-hidden="true">
                    {' · '}
                  </span>
                ) : null}
                {prova}
              </span>
            ))}
          </p>
        ) : null}
      </main>

      <footer className={estilos.rodape}>
        <div className={estilos.rodapeLinha}>
          <span>© {ANO} Dissona</span>
          {linksDeRodape.map((link) => (
            <span key={link.href} className={estilos.rodapeLinha}>
              <span className={estilos.separador} aria-hidden="true">
                ·
              </span>
              <Link href={link.href}>{link.rotulo}</Link>
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}
