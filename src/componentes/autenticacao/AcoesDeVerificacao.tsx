'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Botao } from '@/componentes/base/Botao';
import { BotaoLink } from '@/componentes/base/BotaoLink';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { CodigoErro } from '@/lib/erros';
import { ENTRAR_PADRAO, ROTA } from '@/lib/guarda-rota';
import { VERIFICAR_EMAIL } from '@/textos/prototipo';

import estilos from './AcoesDeVerificacao.module.css';
import type { Banner } from './FormularioDeLogin';

export type PropsAcoesDeVerificacao = {
  readonly acaoDeReenvio: (dados: FormData) => Promise<ResultadoDeAcao>;
  /** Endereço para o qual o link foi enviado — vem de `?email=`. */
  readonly email: string | undefined;
  /** `true` quando o link chegou expirado ou já usado (`?erro=token`). */
  readonly tokenInvalido: boolean;
};

const ESTADO_INICIAL: ResultadoDeAcao | null = null;

/**
 * Tela de verificação de e-mail — a que o protótipo acrescentou ao board.
 *
 * ## "Já confirmei, continuar" leva ao login, e não adiante
 *
 * No protótipo ele vai direto ao onboarding, porque lá não existe sessão de
 * verdade. Aqui a situação real é outra: quem clica no link do e-mail **nunca
 * volta para esta tela** — o route handler troca o token por sessão e
 * redireciona. Então quem está lendo isto ou ainda não confirmou, ou confirmou
 * em outro navegador.
 *
 * Para os dois casos, o login é o destino certo: o e-mail agora está
 * confirmado, e a senha que a pessoa acabou de escolher funciona. Mandá-la
 * "adiante" sem sessão só produziria um redirecionamento de volta ao login,
 * com um passo a mais e nenhuma explicação.
 */
export function AcoesDeVerificacao({
  acaoDeReenvio,
  email,
  tokenInvalido,
}: PropsAcoesDeVerificacao) {
  const [resultado, reenviar, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acaoDeReenvio(dados),
    ESTADO_INICIAL,
  );

  const banner: Banner | null = (() => {
    if (resultado !== null && resultado.ok) return VERIFICAR_EMAIL.bannerReenviado;
    if (resultado !== null && resultado.codigo === CodigoErro.LIMITE_DE_ENVIO) {
      return VERIFICAR_EMAIL.bannerLimite;
    }
    if (tokenInvalido) return VERIFICAR_EMAIL.bannerNaoConfirmado;
    return null;
  })();

  const tomDoBanner = resultado !== null && resultado.ok ? 'sucesso' : 'alerta';

  return (
    <>
      <div className={estilos.cabecalho}>
        <span className={estilos.overline}>{VERIFICAR_EMAIL.overline}</span>
        <h1 className={estilos.titulo}>{VERIFICAR_EMAIL.titulo}</h1>
        <p className={estilos.texto}>
          {VERIFICAR_EMAIL.textoAntes}
          <strong className={estilos.endereco}>
            {email ?? VERIFICAR_EMAIL.emailDesconhecido}
          </strong>
          {VERIFICAR_EMAIL.textoDepois}
        </p>
      </div>

      {banner !== null ? (
        <Aviso tom={tomDoBanner} titulo={banner.titulo}>
          {banner.texto}
        </Aviso>
      ) : null}

      <div className={estilos.acoes}>
        <BotaoLink href={ENTRAR_PADRAO} blocoInteiro>
          {VERIFICAR_EMAIL.continuar}
        </BotaoLink>

        {/*
          O reenvio é um `<form>`, e não um `onClick` com `fetch`: sem
          JavaScript ele continua funcionando, e o e-mail vai. O endereço viaja
          num campo escondido porque não há sessão de onde tirá-lo — a conta
          existe, mas ainda não pode entrar.
        */}
        <form action={reenviar} className={estilos.formulario}>
          <input type="hidden" name="email" value={email ?? ''} />
          <Botao
            type="submit"
            variante="secundario"
            carregando={pendente}
            blocoInteiro
            disabled={email === undefined}
            title={
              email === undefined
                ? 'Sem o endereço na URL não há para onde reenviar. Use "corrija o endereço".'
                : undefined
            }
          >
            {pendente ? VERIFICAR_EMAIL.reenviando : VERIFICAR_EMAIL.reenviar}
          </Botao>
        </form>
      </div>

      <p className={estilos.rodape}>
        {VERIFICAR_EMAIL.naoChegouAntes}
        <Link className={estilos.rodapeLink} href={ROTA.CADASTRAR}>
          {VERIFICAR_EMAIL.corrigirEndereco}
        </Link>
        {VERIFICAR_EMAIL.naoChegouDepois}
      </p>
    </>
  );
}
