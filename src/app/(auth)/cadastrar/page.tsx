import type { Metadata } from 'next';

import { BotoesSociais } from '@/componentes/autenticacao/BotoesSociais';
import { FormularioDeCadastro } from '@/componentes/autenticacao/FormularioDeCadastro';
import { MolduraDeAutenticacao } from '@/componentes/autenticacao/MolduraDeAutenticacao';
import { ROTA } from '@/lib/guarda-rota';
import { cadastrar, entrarComProvedor } from '@/modulos/autenticacao/acoes';
import { CADASTRAR } from '@/textos/prototipo';

import estilos from './pagina.module.css';

export const metadata: Metadata = {
  title: 'Criar conta · Dissona',
  description: 'Crie sua conta e comece a enviar suas faixas para curadoria.',
};

/**
 * Tela 1.1 — criar conta.
 *
 * Split-screen: formulário à esquerda, "Como funciona" à direita. O aside não é
 * decoração — é a resposta à pergunta que a pessoa está fazendo no momento em
 * que decide se preenche o formulário, e o protótipo o coloca exatamente aí.
 *
 * Os três botões sociais ficam **abaixo** do formulário, ao contrário do login,
 * que os põe acima. A inversão é do protótipo e faz sentido: no login, entrar
 * com Google é o caminho mais rápido; no cadastro, o formulário é o caminho
 * principal e o social é a alternativa. Seguem desabilitados até a fatia que
 * liga os provedores.
 */
export default function Pagina() {
  return (
    <MolduraDeAutenticacao
      linksDeRodape={[
        { rotulo: 'Termos', href: ROTA.TERMOS },
        { rotulo: 'Privacidade', href: ROTA.PRIVACIDADE },
      ]}
      aside={<ComoFunciona />}
    >
      <FormularioDeCadastro acao={cadastrar} social={<BlocoSocial />} />
    </MolduraDeAutenticacao>
  );
}

function ComoFunciona() {
  return (
    <>
      <div className={estilos.asideCabecalho}>
        <span className={estilos.asideOverline}>{CADASTRAR.comoFunciona.overline}</span>
        {/* `<h2>`: o `<h1>` da página é o "Criar conta" do card. */}
        <h2 className={estilos.asideTitulo}>{CADASTRAR.comoFunciona.titulo}</h2>
      </div>

      <ol className={estilos.passos}>
        {CADASTRAR.comoFunciona.passos.map((passo) => (
          <li key={passo.numero} className={estilos.passo}>
            <span className={estilos.passoNumero} aria-hidden="true">
              {passo.numero}
            </span>
            <span className={estilos.passoTexto}>
              <strong className={estilos.passoTitulo}>{passo.titulo}</strong>
              {passo.texto}
            </span>
          </li>
        ))}
      </ol>

      <p className={estilos.asideNota}>{CADASTRAR.comoFunciona.nota}</p>
    </>
  );
}

/**
 * O social do cadastro fica **abaixo** do formulário, ao contrário do login.
 *
 * A inversão é do protótipo e faz sentido: no login, entrar com Google é o
 * caminho mais rápido; no cadastro, o formulário é o caminho principal e o
 * social é a alternativa. A nota explica o que os provedores fazem — e desde a
 * fatia social ela é verdade com uma ressalva: a confirmação acontece depois de
 * criar, em `/cadastrar/confirmar`, porque um provider nativo não devolve o
 * controle antes disso.
 */
function BlocoSocial() {
  return (
    <div className={estilos.social}>
      <div className={estilos.divisor}>
        <span className={estilos.divisorLinha} aria-hidden="true" />
        <span className={estilos.divisorTexto}>{CADASTRAR.ouSocial}</span>
        <span className={estilos.divisorLinha} aria-hidden="true" />
      </div>

      <BotoesSociais
        acao={entrarComProvedor}
        tamanho="md"
        rotulos={{
          google: CADASTRAR.google,
          facebook: CADASTRAR.facebook,
          soundcloud: CADASTRAR.soundcloud,
        }}
        verbo="Criar conta com"
      />

      <p className={estilos.notaSocial}>{CADASTRAR.notaSocial}</p>
    </div>
  );
}
