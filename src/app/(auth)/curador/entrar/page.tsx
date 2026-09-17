import type { Metadata } from 'next';
import Link from 'next/link';

import { BotoesSociais } from '@/componentes/autenticacao/BotoesSociais';
import { FormularioDeLogin } from '@/componentes/autenticacao/FormularioDeLogin';
import type { Banner } from '@/componentes/autenticacao/FormularioDeLogin';
import { MolduraDeAutenticacao } from '@/componentes/autenticacao/MolduraDeAutenticacao';
import { MOTIVO_LOGIN, ROTA } from '@/lib/guarda-rota';
import { entrar, entrarComProvedor } from '@/modulos/autenticacao/acoes';
import { ENTRAR_CURADOR } from '@/textos/prototipo';

import estilos from './pagina.module.css';

export const metadata: Metadata = {
  title: 'Entrar · Dissona',
  description: 'Acesse sua conta de curador.',
};

/**
 * Tela 1 — login exclusivo do curador.
 *
 * Cópia de `(auth)/entrar/page.tsx` com a copy do ambiente curador
 * (`docs/R2/extraido/Curador.txt`).
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
        ? ENTRAR_CURADOR.bannerSocial
        : undefined;

  return (
    <MolduraDeAutenticacao
      chamada={{ overline: ENTRAR_CURADOR.overline, titulo: ENTRAR_CURADOR.titulo }}
      provas={ENTRAR_CURADOR.provas}
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
                google: ENTRAR_CURADOR.google,
                facebook: ENTRAR_CURADOR.facebook,
                soundcloud: ENTRAR_CURADOR.soundcloud,
              }}
              verbo="Entrar com"
            />
            <div className={estilos.divisor}>
              <span className={estilos.divisorLinha} aria-hidden="true" />
              <span className={estilos.divisorTexto}>{ENTRAR_CURADOR.ou}</span>
              <span className={estilos.divisorLinha} aria-hidden="true" />
            </div>
          </div>
        }
        textos={{
          titulo: ENTRAR_CURADOR.titulo,
          tituloComoH1: false,
          rotuloEmail: ENTRAR_CURADOR.rotuloEmail,
          placeholderEmail: ENTRAR_CURADOR.placeholderEmail,
          rotuloSenha: ENTRAR_CURADOR.rotuloSenha,
          placeholderSenha: ENTRAR_CURADOR.placeholderSenha,
          esqueciSenha: ENTRAR_CURADOR.esqueciSenha,
          hrefEsqueciSenha: ROTA.RECUPERAR_SENHA,
          mostrarSenha: ENTRAR_CURADOR.mostrarSenha,
          ocultarSenha: ENTRAR_CURADOR.ocultarSenha,
          enviar: ENTRAR_CURADOR.enviar,
          enviando: ENTRAR_CURADOR.enviando,
          erroEmailVazio: ENTRAR_CURADOR.erroEmailVazio,
          erroEmailInvalido: ENTRAR_CURADOR.erroEmailInvalido,
          erroSenhaVazia: ENTRAR_CURADOR.erroSenhaVazia,
          bannerCredenciais: ENTRAR_CURADOR.bannerCredenciais,
          bannerBloqueada: bannerBloqueado(),
        }}
        rodape={
          <p className={estilos.alternativa}>
            {ENTRAR_CURADOR.semConta}
            <Link className={estilos.alternativaLink} href={ROTA.CURADOR_CADASTRAR}>
              {ENTRAR_CURADOR.criarConta}
            </Link>
          </p>
        }
      />
    </MolduraDeAutenticacao>
  );
}

function bannerBloqueado(): Banner {
  return {
    titulo: ENTRAR_CURADOR.bannerBloqueada.titulo,
    texto: ENTRAR_CURADOR.bannerBloqueada.texto,
    acao: (
      <a className={estilos.contato} href="mailto:suporte@dissona.com.br">
        {ENTRAR_CURADOR.suporte}
      </a>
    ),
  };
}
