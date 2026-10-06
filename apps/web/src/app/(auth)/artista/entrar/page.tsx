import type { Metadata } from 'next';
import Link from 'next/link';

import { BotoesSociais } from '@/componentes/autenticacao/BotoesSociais';
import { FormularioDeLogin } from '@/componentes/autenticacao/FormularioDeLogin';
import type { Banner } from '@/componentes/autenticacao/FormularioDeLogin';
import { MolduraDeAutenticacao } from '@/componentes/autenticacao/MolduraDeAutenticacao';
import { MOTIVO_LOGIN, ROTA } from '@/lib/guarda-rota';
import { entrar, entrarComProvedor } from '@/modulos/autenticacao/acoes';
import { ENTRAR_ARTISTA } from '@/textos/prototipo';

import estilos from './pagina.module.css';

export const metadata: Metadata = {
  title: 'Entrar · Dissona',
  description: 'Acesse sua conta de artista.',
};

/**
 * Tela 1 — login exclusivo do artista.
 *
 * Cópia de `(auth)/entrar/page.tsx` com a copy do ambiente artista — a mesma
 * `ENTRAR` de sempre, só que sob nome próprio (`ENTRAR_ARTISTA`) para não
 * ambiguar com a rota neutra `/entrar`, que continua existindo sem mudança.
 */
export default async function Pagina({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly proximo?: string; readonly motivo?: string }>;
}) {
  const { proximo, motivo } = await searchParams;

  const bannerInicial: Banner | undefined =
    motivo === MOTIVO_LOGIN.BLOQUEADA
      ? bannerBloqueado()
      : motivo === MOTIVO_LOGIN.FALHA_SOCIAL
        ? ENTRAR_ARTISTA.bannerSocial
        : undefined;

  return (
    <MolduraDeAutenticacao
      ambiente="artista"
      chamada={{ overline: ENTRAR_ARTISTA.overline, titulo: ENTRAR_ARTISTA.titulo }}
      provas={ENTRAR_ARTISTA.provas}
      linksDeRodape={[
        { rotulo: 'Termos', href: ROTA.TERMOS },
        { rotulo: 'Privacidade', href: ROTA.PRIVACIDADE },
      ]}
    >
      <FormularioDeLogin
        acao={entrar}
        proximo={proximo}
        bannerInicial={bannerInicial}
        social={
          <div className={estilos.social}>
            <BotoesSociais
              acao={entrarComProvedor}
              proximo={proximo}
              rotulos={{
                google: ENTRAR_ARTISTA.google,
                facebook: ENTRAR_ARTISTA.facebook,
                soundcloud: ENTRAR_ARTISTA.soundcloud,
              }}
              verbo="Entrar com"
            />
            <div className={estilos.divisor}>
              <span className={estilos.divisorLinha} aria-hidden="true" />
              <span className={estilos.divisorTexto}>{ENTRAR_ARTISTA.ou}</span>
              <span className={estilos.divisorLinha} aria-hidden="true" />
            </div>
          </div>
        }
        textos={{
          // Sem `titulo`: a moldura já mostrou o `<h1>` na chamada.
          rotuloEmail: ENTRAR_ARTISTA.rotuloEmail,
          placeholderEmail: ENTRAR_ARTISTA.placeholderEmail,
          rotuloSenha: ENTRAR_ARTISTA.rotuloSenha,
          placeholderSenha: ENTRAR_ARTISTA.placeholderSenha,
          esqueciSenha: ENTRAR_ARTISTA.esqueciSenha,
          hrefEsqueciSenha: ROTA.RECUPERAR_SENHA,
          mostrarSenha: ENTRAR_ARTISTA.mostrarSenha,
          ocultarSenha: ENTRAR_ARTISTA.ocultarSenha,
          enviar: ENTRAR_ARTISTA.enviar,
          enviando: ENTRAR_ARTISTA.enviando,
          erroEmailVazio: ENTRAR_ARTISTA.erroEmailVazio,
          erroEmailInvalido: ENTRAR_ARTISTA.erroEmailInvalido,
          erroSenhaVazia: ENTRAR_ARTISTA.erroSenhaVazia,
          bannerCredenciais: ENTRAR_ARTISTA.bannerCredenciais,
          bannerBloqueada: bannerBloqueado(),
        }}
        rodape={
          <p className={estilos.alternativa}>
            {ENTRAR_ARTISTA.semConta}
            <Link className={estilos.alternativaLink} href={ROTA.ARTISTA_CADASTRAR}>
              {ENTRAR_ARTISTA.criarConta}
            </Link>
          </p>
        }
      />
    </MolduraDeAutenticacao>
  );
}

function bannerBloqueado(): Banner {
  return {
    titulo: ENTRAR_ARTISTA.bannerBloqueada.titulo,
    texto: ENTRAR_ARTISTA.bannerBloqueada.texto,
    acao: (
      <a className={estilos.contato} href="mailto:suporte@dissona.com.br">
        {ENTRAR_ARTISTA.suporte}
      </a>
    ),
  };
}
