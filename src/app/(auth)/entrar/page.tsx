import type { Metadata } from 'next';
import Link from 'next/link';

import { FormularioDeLogin } from '@/componentes/autenticacao/FormularioDeLogin';
import { MolduraDeAutenticacao } from '@/componentes/autenticacao/MolduraDeAutenticacao';
import { ROTA } from '@/lib/guarda-rota';
import { entrar } from '@/modulos/autenticacao/acoes';
import { ENTRAR } from '@/textos/prototipo';

import estilos from './pagina.module.css';

export const metadata: Metadata = {
  title: 'Entrar · Dissona',
  description: 'Acesse sua conta de artista ou curador.',
};

/**
 * Tela 1 — login de artista e curador.
 *
 * Os três botões sociais estão na tela, desabilitados, com o motivo no
 * `title`. Mostrá-los desabilitados em vez de escondê-los é a mesma decisão da
 * navegação por release (`navegacao-por-ambiente.ts`): a pessoa entende o que
 * o produto oferece, e não descobre um caminho novo a cada deploy. O Google e
 * o Facebook entram na fatia 3 (TASK-111); o SoundCloud depende da
 * open-question #9 e fica atrás de flag.
 */
export default async function Pagina({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly proximo?: string }>;
}) {
  const { proximo } = await searchParams;

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
        social={<BlocoSocial />}
        textos={{
          titulo: ENTRAR.titulo,
          // A moldura já renderizou o `<h1>` na chamada. Repetir o nível aqui
          // daria dois `<h1>` na página, e o leitor de tela perderia a
          // estrutura.
          tituloComoH1: false,
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

const PROVEDORES = [
  { rotulo: ENTRAR.google, sigla: 'G', cor: '#4285F4', release: 3 },
  { rotulo: ENTRAR.facebook, sigla: 'f', cor: '#1877F2', release: 3 },
  { rotulo: ENTRAR.soundcloud, sigla: '≈', cor: '#FF5500', release: 3 },
] as const;

function BlocoSocial() {
  return (
    <div className={estilos.social}>
      <div className={estilos.provedores}>
        {PROVEDORES.map((provedor) => (
          <button
            key={provedor.rotulo}
            type="button"
            className={estilos.provedor}
            disabled
            title={`Entrar com ${provedor.rotulo} entra na Release ${provedor.release}`}
          >
            <span className={estilos.provedorSigla} style={{ color: provedor.cor }}>
              {provedor.sigla}
            </span>
            {provedor.rotulo}
          </button>
        ))}
      </div>

      <div className={estilos.divisor}>
        <span className={estilos.divisorLinha} aria-hidden="true" />
        <span className={estilos.divisorTexto}>{ENTRAR.ou}</span>
        <span className={estilos.divisorLinha} aria-hidden="true" />
      </div>
    </div>
  );
}
