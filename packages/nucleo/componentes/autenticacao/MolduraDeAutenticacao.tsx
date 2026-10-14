import Link from 'next/link';
import type { ReactNode } from 'react';

import { Marca } from '@dissona/nucleo/componentes/base/Marca';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';

import estilos from './MolduraDeAutenticacao.module.css';
import { OrbitaDeFundo } from './OrbitaDeFundo';

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
  readonly chamada?: {
    readonly overline: string;
    readonly titulo: string;
    readonly subtitulo?: string;
    /**
     * O título do herói em duas linhas, com o fim da segunda em laranja —
     * protótipo aprovado: "Leitura real / da **sua música.**". Sem isto, o
     * `titulo` sai inteiro numa linha branca.
     */
    readonly linhas?: readonly [string, string, string];
  };
  /** Título do cartão de login ("Entrar"), em Anton. Só no login. */
  readonly tituloDoCard?: string;
  /** Provas sociais do pé — idem. */
  /**
   * As provas sociais do pé do herói. O protótipo aprovado as traz
   * **desligadas** (`mostrarProvas: false`), então a moldura não as desenha;
   * a prop fica para quando o cliente quiser ligá-las.
   */
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
  /**
   * `dentro` (padrão): o painel escuro vai dentro do cartão branco — cadastro.
   * `fora`: cartão e painel lado a lado sobre a órbita — onboarding.
   */
  readonly asideFora?: boolean;
  readonly children: ReactNode;
};

const ANO = 2026;

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
  linksDeRodape,
  aside,
  asideFora = false,
  tituloDoCard,
  children,
}: PropsMoldura) {
  // Login: herói à esquerda, órbita à direita, cartão encostado à direita.
  // Demais telas: marca no topo, órbita centrada, cartão no meio.
  const ehLogin = chamada !== undefined;
  return (
    <div
      className={[estilos.pagina, ehLogin ? estilos.login : undefined, CLASSE_DO_AMBIENTE[ambiente]]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={estilos.faixaDeCores} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <OrbitaDeFundo centro={ehLogin ? '76%' : '50%'} />

      {ehLogin ? (
        <main className={estilos.mioloLogin}>
          <div className={estilos.heroi}>
            <Link className={estilos.marca} href={ROTA.HOME}>
              <Marca variante="branca" altura="clamp(52px, 6.4vh, 80px)" />
            </Link>
            <div className={estilos.chamada}>
              <span className={estilos.chamadaOverline}>{chamada.overline}</span>
              <h1 className={estilos.chamadaTitulo}>
                {chamada.linhas === undefined ? (
                  chamada.titulo
                ) : (
                  <>
                    <span className={estilos.linha}>{chamada.linhas[0]}</span>
                    <span className={estilos.linha}>
                      {chamada.linhas[1]}
                      <span className={estilos.destaque}>{chamada.linhas[2]}</span>
                    </span>
                  </>
                )}
              </h1>
              {chamada.subtitulo !== undefined ? (
                <p className={estilos.chamadaSubtitulo}>{chamada.subtitulo}</p>
              ) : null}
            </div>
          </div>

          <div className={estilos.cardLogin}>
            {tituloDoCard !== undefined ? (
              <h2 className={estilos.cardTitulo}>{tituloDoCard}</h2>
            ) : null}
            {children}
          </div>
        </main>
      ) : (
        <main className={estilos.miolo}>
          <div className={estilos.topo}>
            <Link className={estilos.marca} href={ROTA.HOME}>
              {/* Com o painel ao lado o cartão é mais alto, e o protótipo
                  aprovado desce o logotipo para 38px. */}
              <Marca
                variante="branca"
                altura={aside === undefined ? 'clamp(36px, 3.8vw, 46px)' : 'clamp(30px, 3vw, 38px)'}
              />
            </Link>
          </div>

          {aside === undefined ? (
            <div className={estilos.card}>{children}</div>
          ) : (
            <div className={asideFora ? estilos.splitFora : estilos.split}>
              <div className={estilos.card}>{children}</div>
              <aside className={estilos.painel}>{aside}</aside>
            </div>
          )}
        </main>
      )}

      <footer className={estilos.rodape}>
        <div className={estilos.rodapeLinha}>
          <span>© {ANO} Dissona</span>
          {linksDeRodape.map((link) => (
            // Rótulo, e não href: "Segurança" e "Privacidade" do admin apontam
            // para a mesma rota.
            <span key={link.rotulo} className={estilos.rodapeLinha}>
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
