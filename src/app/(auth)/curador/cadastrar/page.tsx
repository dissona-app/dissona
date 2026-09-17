import type { Metadata } from 'next';

import { BotoesSociais } from '@/componentes/autenticacao/BotoesSociais';
import { FormularioDeCadastro } from '@/componentes/autenticacao/FormularioDeCadastro';
import { MolduraDeAutenticacao } from '@/componentes/autenticacao/MolduraDeAutenticacao';
import { ROTA } from '@/lib/guarda-rota';
import { cadastrar, entrarComProvedor } from '@/modulos/autenticacao/acoes';
import { CADASTRAR_CURADOR } from '@/textos/prototipo';

import estilos from './pagina.module.css';

export const metadata: Metadata = {
  title: 'Criar conta · Dissona',
  description: 'Crie sua conta de curador e comece a avaliar músicas.',
};

/**
 * Tela 1.1 — criar conta, exclusiva do curador.
 *
 * Cópia de `(auth)/cadastrar/page.tsx`: o papel vai como hidden input para a
 * mesma Server Action `cadastrar`, que grava "curador" assim que a sessão
 * existir — direto ao wizard do módulo 12, sem passar por `/selecao-de-perfil`.
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
        textos={CADASTRAR_CURADOR}
        hrefEntrar={ROTA.CURADOR_ENTRAR}
        papel="curador"
        social={<BlocoSocial />}
      />
    </MolduraDeAutenticacao>
  );
}

function ComoFunciona() {
  return (
    <>
      <div className={estilos.asideCabecalho}>
        <span className={estilos.asideOverline}>{CADASTRAR_CURADOR.comoFunciona.overline}</span>
        <h2 className={estilos.asideTitulo}>{CADASTRAR_CURADOR.comoFunciona.titulo}</h2>
      </div>

      <ol className={estilos.passos}>
        {CADASTRAR_CURADOR.comoFunciona.passos.map((passo) => (
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

      <p className={estilos.asideNota}>{CADASTRAR_CURADOR.comoFunciona.nota}</p>
    </>
  );
}

function BlocoSocial() {
  return (
    <div className={estilos.social}>
      <div className={estilos.divisor}>
        <span className={estilos.divisorLinha} aria-hidden="true" />
        <span className={estilos.divisorTexto}>{CADASTRAR_CURADOR.ouSocial}</span>
        <span className={estilos.divisorLinha} aria-hidden="true" />
      </div>

      <BotoesSociais
        acao={entrarComProvedor}
        tamanho="md"
        rotulos={{
          google: CADASTRAR_CURADOR.google,
          facebook: CADASTRAR_CURADOR.facebook,
          soundcloud: CADASTRAR_CURADOR.soundcloud,
        }}
        verbo="Criar conta com"
      />

      <p className={estilos.notaSocial}>{CADASTRAR_CURADOR.notaSocial}</p>
    </div>
  );
}
