import type { Metadata } from 'next';

import { BotoesSociais } from '@/componentes/autenticacao/BotoesSociais';
import { FormularioDeCadastro } from '@/componentes/autenticacao/FormularioDeCadastro';
import { MolduraDeAutenticacao } from '@dissona/nucleo/componentes/autenticacao/MolduraDeAutenticacao';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { cadastrar, entrarComProvedor } from '@/modulos/autenticacao/acoes';
import { CADASTRAR_ARTISTA } from '@dissona/nucleo/textos/prototipo';

import estilos from './pagina.module.css';

export const metadata: Metadata = {
  title: 'Criar conta · Dissona',
  description: 'Crie sua conta de artista e comece a enviar suas faixas para curadoria.',
};

/**
 * Tela 1.1 — criar conta, exclusiva do artista.
 *
 * Cópia de `(auth)/cadastrar/page.tsx`: o papel vai como hidden input para a
 * mesma Server Action `cadastrar`, que grava "artista" assim que a sessão
 * existir — sem passar por `/selecao-de-perfil`.
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
      <FormularioDeCadastro
        acao={cadastrar}
        textos={CADASTRAR_ARTISTA}
        hrefEntrar={ROTA.ARTISTA_ENTRAR}
        papel="artista"
        social={<BlocoSocial />}
      />
    </MolduraDeAutenticacao>
  );
}

function ComoFunciona() {
  return (
    <>
      <div className={estilos.asideCabecalho}>
        <span className={estilos.asideOverline}>{CADASTRAR_ARTISTA.comoFunciona.overline}</span>
        <h2 className={estilos.asideTitulo}>{CADASTRAR_ARTISTA.comoFunciona.titulo}</h2>
      </div>

      <ol className={estilos.passos}>
        {CADASTRAR_ARTISTA.comoFunciona.passos.map((passo) => (
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

      <p className={estilos.asideNota}>{CADASTRAR_ARTISTA.comoFunciona.nota}</p>
    </>
  );
}

function BlocoSocial() {
  return (
    <div className={estilos.social}>
      <div className={estilos.divisor}>
        <span className={estilos.divisorLinha} aria-hidden="true" />
        <span className={estilos.divisorTexto}>{CADASTRAR_ARTISTA.ouSocial}</span>
        <span className={estilos.divisorLinha} aria-hidden="true" />
      </div>

      <BotoesSociais
        acao={entrarComProvedor}
        tamanho="md"
        rotulos={{
          google: CADASTRAR_ARTISTA.google,
          facebook: CADASTRAR_ARTISTA.facebook,
          soundcloud: CADASTRAR_ARTISTA.soundcloud,
        }}
        verbo="Criar conta com"
      />

      <p className={estilos.notaSocial}>{CADASTRAR_ARTISTA.notaSocial}</p>
    </div>
  );
}
