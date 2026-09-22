import Link from 'next/link';
import type { ReactNode } from 'react';

import { Marca } from '@/componentes/base/Marca';
import { ROTA } from '@/lib/guarda-rota';

import estilos from './MolduraDeAutenticacao.module.css';
import { OndasDeFundo } from './OndasDeFundo';

export type LinkDeRodape = {
  readonly rotulo: string;
  readonly href: string;
};

/**
 * Ambiente da tela — o eixo real da variação visual entre os três protótipos
 * (`docs/R2/extraido/{Admin,Artista,Curador}.html`). Cada um tem sua própria
 * altura de logotipo, `gap` de card e geometria de chamada; ver
 * `MolduraDeAutenticacao.module.css`. `'artista'` é o padrão porque é a
 * identidade das rotas neutras (`/entrar`, `/cadastrar`, `/recuperar-senha`…):
 * `ENTRAR_ARTISTA` sempre foi um alias de `ENTRAR` (`textos/prototipo.ts`), e
 * essas telas vêm de `Artista.html` no protótipo.
 */
export type AmbienteDeAutenticacao = 'artista' | 'curador' | 'admin';

export type PropsMoldura = {
  readonly ambiente?: AmbienteDeAutenticacao;
  /** Chamada acima do card — só a tela 1 (artista/curador) tem. */
  readonly chamada?: { readonly overline: string; readonly titulo: string; readonly subtitulo?: string };
  /** Provas sociais do pé — idem. */
  readonly provas?: readonly string[];
  readonly linksDeRodape: readonly LinkDeRodape[];
  /**
   * Painel ao lado do card — o "Como funciona" do cadastro (1.1) e o painel de
   * marca do wizard do curador (12).
   *
   * Quando existe, a composição vira split-screen e a largura útil cresce;
   * quando não, o card fica centralizado como nas telas 1 e 19. É a variante
   * que o Design System §3.3 descreve.
   */
  readonly aside?: ReactNode;
  readonly children: ReactNode;
};

const ANO = 2026;

/** Altura da marca por ambiente — literal dos três protótipos (§ ver módulo). */
const ALTURA_DA_MARCA: Record<AmbienteDeAutenticacao, string> = {
  admin: 'clamp(44px, 5.6vh, 60px)',
  artista: 'clamp(28px, 3vw, 36px)',
  curador: '36px',
};

/**
 * A variante split-screen (`aside` presente — tela 1.1) tem sua própria
 * altura de marca, menor que a do login: `clamp(26px,2.6vw,32px)` em
 * `Artista.html`, contra `clamp(28px,3vw,36px)` na tela sem `aside`. É o
 * valor verificado; sem dado equivalente para o wizard do curador (módulo
 * 12) ou para um split do admin — que hoje não existe —, o mesmo literal
 * atende os dois enquanto não houver protótipo próprio para eles.
 */
const ALTURA_DA_MARCA_SPLIT = 'clamp(26px, 2.6vw, 32px)';

const CLASSE_DO_AMBIENTE: Record<AmbienteDeAutenticacao, string | undefined> = {
  admin: estilos.ambienteAdmin,
  artista: estilos.ambienteArtista,
  curador: estilos.ambienteCurador,
};

/**
 * Página das telas de autenticação: fundo, marca, card centralizado e rodapé.
 *
 * As telas 1 (artista/curador) e 19 (admin) são a mesma composição com dois
 * elementos opcionais, então são um componente com `props` — não três
 * arquivos parecidos, que foi como o protótipo os desenhou e é como a
 * divergência de `gap` entre eles passou despercebida por uma release. Cada
 * protótipo (`docs/R2/extraido/{Admin,Artista,Curador}.html`) tem sua própria
 * altura de logotipo, `gap` de card e geometria de chamada — a prop
 * `ambiente` escolhe qual, e os valores são os literais de cada um, não uma
 * média entre eles.
 */
export function MolduraDeAutenticacao({
  ambiente = 'artista',
  chamada,
  provas,
  linksDeRodape,
  aside,
  children,
}: PropsMoldura) {
  return (
    <div className={[estilos.pagina, CLASSE_DO_AMBIENTE[ambiente]].filter(Boolean).join(' ')}>
      <OndasDeFundo />

      <main className={estilos.miolo}>
        <Link className={estilos.marca} href={ROTA.HOME}>
          <Marca
            variante="colorida"
            altura={aside === undefined ? ALTURA_DA_MARCA[ambiente] : ALTURA_DA_MARCA_SPLIT}
          />
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
            {chamada.subtitulo !== undefined ? (
              <p className={estilos.chamadaSubtitulo}>{chamada.subtitulo}</p>
            ) : null}
          </div>
        ) : null}

        {aside === undefined ? (
          <div className={estilos.card}>{children}</div>
        ) : (
          <div className={estilos.split}>
            <div className={estilos.card}>{children}</div>
            <aside className={estilos.painel}>{aside}</aside>
          </div>
        )}

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
