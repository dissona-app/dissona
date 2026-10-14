import type { Metadata } from 'next';

import { FormularioDeLogin } from '@dissona/nucleo/componentes/autenticacao/FormularioDeLogin';
import { MolduraDeAutenticacao } from '@dissona/nucleo/componentes/autenticacao/MolduraDeAutenticacao';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { linksLegais, rota } from '@/lib/rotas';
import { entrarComoAdmin } from '@/acoes/autenticacao';
import { ADMIN_ENTRAR } from '@dissona/nucleo/textos/prototipo';

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
      chamada={{
        overline: ADMIN_ENTRAR.overline,
        titulo: ADMIN_ENTRAR.titulo,
        linhas: ['Acesso', '', 'restrito.'],
      }}
      tituloDoCard="Entrar"
      linksDeRodape={linksLegais()}
    >
      <FormularioDeLogin
        acao={entrarComoAdmin}
        proximo={proximo}
        textos={{
          rotuloEmail: ADMIN_ENTRAR.rotuloEmail,
          placeholderEmail: ADMIN_ENTRAR.placeholderEmail,
          rotuloSenha: ADMIN_ENTRAR.rotuloSenha,
          placeholderSenha: ADMIN_ENTRAR.placeholderSenha,
          esqueciSenha: ADMIN_ENTRAR.esqueciSenha,
          hrefEsqueciSenha: rota(ROTA.ADMIN_RECUPERAR_SENHA),
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
