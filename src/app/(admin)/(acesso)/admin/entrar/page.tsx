import type { Metadata } from 'next';

import { FormularioDeLogin } from '@/componentes/autenticacao/FormularioDeLogin';
import { MolduraDeAutenticacao } from '@/componentes/autenticacao/MolduraDeAutenticacao';
import { ROTA } from '@/lib/guarda-rota';
import { entrarComoAdmin } from '@/modulos/autenticacao/acoes';
import { ADMIN_ENTRAR } from '@/textos/prototipo';

import estilos from './pagina.module.css';

export const metadata: Metadata = {
  title: 'Acesso restrito · Dissona',
  // A tela existe, mas não é para ser encontrada por busca.
  robots: { index: false, follow: false },
};

/**
 * Tela 19 — login administrativo.
 *
 * Sem login social e sem autocadastro, por decisão de produto (regras §9.1: a
 * equipe nasce por convite). Daí o rodapé "Contas são criadas por convite." em
 * vez de um "Criar conta".
 *
 * Fica em `(admin)/(acesso)`, e não em `(admin)/admin`, para **não** herdar o
 * `Shell` do painel — era o bug que a R0 deixou anotado no `layout.tsx`.
 */
export default async function Pagina({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly proximo?: string }>;
}) {
  const { proximo } = await searchParams;

  return (
    <MolduraDeAutenticacao
      ambiente="admin"
      linksDeRodape={[
        { rotulo: 'Segurança', href: ROTA.PRIVACIDADE },
        { rotulo: 'Privacidade', href: ROTA.PRIVACIDADE },
      ]}
    >
      <FormularioDeLogin
        acao={entrarComoAdmin}
        proximo={proximo}
        icone={<IconeCadeado />}
        textos={{
          overline: ADMIN_ENTRAR.overline,
          titulo: ADMIN_ENTRAR.titulo,
          tituloComoH1: true,
          subtitulo: ADMIN_ENTRAR.subtitulo,
          rotuloEmail: ADMIN_ENTRAR.rotuloEmail,
          placeholderEmail: ADMIN_ENTRAR.placeholderEmail,
          rotuloSenha: ADMIN_ENTRAR.rotuloSenha,
          placeholderSenha: ADMIN_ENTRAR.placeholderSenha,
          esqueciSenha: ADMIN_ENTRAR.esqueciSenha,
          hrefEsqueciSenha: ROTA.ADMIN_RECUPERAR_SENHA,
          mostrarSenha: ADMIN_ENTRAR.mostrarSenha,
          ocultarSenha: ADMIN_ENTRAR.ocultarSenha,
          enviar: ADMIN_ENTRAR.enviar,
          enviando: ADMIN_ENTRAR.enviando,
          erroEmailVazio: ADMIN_ENTRAR.erroEmailVazio,
          erroEmailInvalido: ADMIN_ENTRAR.erroEmailInvalido,
          erroSenhaVazia: ADMIN_ENTRAR.erroSenhaVazia,
          bannerCredenciais: ADMIN_ENTRAR.bannerCredenciais,
          bannerBloqueada: ADMIN_ENTRAR.bannerBloqueada,
          bannerSemAcesso: {
            titulo: ADMIN_ENTRAR.bannerSemAcesso.titulo,
            texto: ADMIN_ENTRAR.bannerSemAcesso.texto,
            acao: (
              <a className={estilos.contato} href="mailto:admin@dissona.com.br">
                {ADMIN_ENTRAR.bannerSemAcesso.acao}
              </a>
            ),
          },
        }}
        rodape={<span className={estilos.nota}>{ADMIN_ENTRAR.rodape}</span>}
      />
    </MolduraDeAutenticacao>
  );
}

function IconeCadeado() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M7 10V7.5a5 5 0 0 1 10 0V10" />
      <path d="M5 10h14v10H5z" />
    </svg>
  );
}
