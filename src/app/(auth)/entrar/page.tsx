import type { Metadata } from 'next';
import Link from 'next/link';

import { BotoesSociais } from '@/componentes/autenticacao/BotoesSociais';
import { FormularioDeLogin } from '@/componentes/autenticacao/FormularioDeLogin';
import type { Banner } from '@/componentes/autenticacao/FormularioDeLogin';
import { MolduraDeAutenticacao } from '@/componentes/autenticacao/MolduraDeAutenticacao';
import { MOTIVO_LOGIN, ROTA } from '@/lib/guarda-rota';
import { entrar, entrarComProvedor } from '@/modulos/autenticacao/acoes';
import { ENTRAR } from '@/textos/prototipo';

import estilos from './pagina.module.css';

export const metadata: Metadata = {
  title: 'Entrar · Dissona',
  description: 'Acesse sua conta de artista ou curador.',
};

/**
 * Tela 1 — login de artista e curador.
 *
 * Os três botões sociais estão na tela. O Google e o Facebook estão ligados
 * (TASK-111); o do SoundCloud fica desabilitado, com o motivo no `title` —
 * depende da open-question #9, que hoje é a assinatura Artist Pro paga e o
 * e-mail que a API deles não devolve. Mostrá-lo desabilitado em vez de
 * escondê-lo é a mesma decisão da navegação por release
 * (`navegacao-por-ambiente.ts`): a pessoa entende o que o produto oferece, e
 * não descobre um caminho novo a cada deploy.
 */
export default async function Pagina({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly proximo?: string; readonly motivo?: string }>;
}) {
  const { proximo, motivo } = await searchParams;

  // O middleware ejeta quem foi bloqueado durante a navegação e traz o motivo
  // na URL — é o único canal que ele tem, porque redireciona em vez de devolver
  // um resultado. Sem isto, a pessoa cai aqui sem explicação nenhuma.
  const bannerInicial: Banner | undefined =
    motivo === MOTIVO_LOGIN.BLOQUEADA
      ? bannerBloqueado()
      : motivo === MOTIVO_LOGIN.FALHA_SOCIAL
        ? ENTRAR.bannerSocial
        : undefined;

  return (
    <MolduraDeAutenticacao
      chamada={{ overline: ENTRAR.overline, titulo: ENTRAR.titulo }}
      provas={ENTRAR.provas}
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
                google: ENTRAR.google,
                facebook: ENTRAR.facebook,
                soundcloud: ENTRAR.soundcloud,
              }}
              verbo="Entrar com"
            />
            <div className={estilos.divisor}>
              <span className={estilos.divisorLinha} aria-hidden="true" />
              <span className={estilos.divisorTexto}>{ENTRAR.ou}</span>
              <span className={estilos.divisorLinha} aria-hidden="true" />
            </div>
          </div>
        }
        textos={{
          // Sem `titulo` aqui: a moldura já renderizou o `<h1>` na chamada, e
          // o protótipo não repete o título dentro do card (só o banner vem
          // em seguida) — ver o comentário de `TextosDeLogin.titulo`.
          rotuloEmail: ENTRAR.rotuloEmail,
          placeholderEmail: ENTRAR.placeholderEmail,
          rotuloSenha: ENTRAR.rotuloSenha,
          placeholderSenha: ENTRAR.placeholderSenha,
          esqueciSenha: ENTRAR.esqueciSenha,
          hrefEsqueciSenha: ROTA.RECUPERAR_SENHA,
          mostrarSenha: ENTRAR.mostrarSenha,
          ocultarSenha: ENTRAR.ocultarSenha,
          enviar: ENTRAR.enviar,
          enviando: ENTRAR.enviando,
          erroEmailVazio: ENTRAR.erroEmailVazio,
          erroEmailInvalido: ENTRAR.erroEmailInvalido,
          erroSenhaVazia: ENTRAR.erroSenhaVazia,
          bannerCredenciais: ENTRAR.bannerCredenciais,
          bannerBloqueada: bannerBloqueado(),
        }}
        rodape={
          <p className={estilos.alternativa}>
            {ENTRAR.semConta}
            <Link className={estilos.alternativaLink} href={ROTA.CADASTRAR}>
              {ENTRAR.criarConta}
            </Link>
          </p>
        }
      />
    </MolduraDeAutenticacao>
  );
}

/**
 * O banner de conta bloqueada, com o contato.
 *
 * O protótipo só renderiza o link "Falar com o suporte" no estado `blocked`, e
 * está certo: é o único estado em que tentar de novo não resolve nada.
 */
function bannerBloqueado(): Banner {
  return {
    titulo: ENTRAR.bannerBloqueada.titulo,
    texto: ENTRAR.bannerBloqueada.texto,
    acao: (
      <a className={estilos.contato} href="mailto:suporte@dissona.com.br">
        {ENTRAR.suporte}
      </a>
    ),
  };
}

