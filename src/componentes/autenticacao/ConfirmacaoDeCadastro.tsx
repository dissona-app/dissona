'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Botao } from '@/componentes/base/Botao';
import { Campo } from '@/componentes/base/Campo';
import { Checkbox } from '@/componentes/base/Checkbox';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { CodigoErro } from '@/lib/erros';
import { ROTA } from '@/lib/guarda-rota';
import { CONFIRMAR_SOCIAL } from '@/textos/prototipo';

import estilos from './ConfirmacaoDeCadastro.module.css';

export type PropsConfirmacaoDeCadastro = {
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
  readonly acaoDeSair: (dados: FormData) => void | Promise<void>;
  /** Nome que o provedor devolveu, para a pessoa confirmar ou corrigir. */
  readonly nome: string;
  /** E-mail do provedor. Vazio quando ele não devolve nenhum — ver o componente. */
  readonly email: string;
};

const ESTADO_INICIAL: ResultadoDeAcao | null = null;

const TEXTO_DO_MOTIVO: Readonly<Record<string, string>> = {
  nome_vazio: CONFIRMAR_SOCIAL.erroNomeVazio,
  aceite_obrigatorio: CONFIRMAR_SOCIAL.erroAceite,
  email_vazio: CONFIRMAR_SOCIAL.erroEmailVazio,
  email_invalido: CONFIRMAR_SOCIAL.erroEmailInvalido,
};

/**
 * Confirmação do cadastro social — a tela que fecha o que o OAuth deixou aberto.
 *
 * ## Por que "Sair" é a única saída
 *
 * A guarda de rota devolve para cá qualquer navegação de quem não aceitou os
 * termos, então esta tela não tem "voltar" — não há para onde voltar. O que ela
 * tem é a saída honesta: sair. Uma tela sem escape nenhum seria uma armadilha,
 * e a alternativa (deixar navegar sem aceite) é a que a LGPD não permite.
 *
 * ## Os dois modos, e por que o e-mail muda de forma
 *
 * Quando o provedor devolve endereço (Google, Facebook), ele aparece em
 * **texto** — e não em campo desabilitado, porque um `<input disabled>` convida
 * ao clique e não vai no `FormData`. Ele é a identidade da conta: mostrar, sim;
 * oferecer edição, não, ou alguém confirmaria a conta com um endereço que não
 * provou possuir.
 *
 * Quando o provedor **não** devolve nenhum — o caso do SoundCloud, cuja API não
 * tem o campo — não há o que exibir, e o endereço passa a ser pedido. É o mesmo
 * formulário: o que muda é de onde vem o e-mail, não o que a pessoa está
 * fazendo aqui.
 */
export function ConfirmacaoDeCadastro({
  acao,
  acaoDeSair,
  nome,
  email,
}: PropsConfirmacaoDeCadastro) {
  const [resultado, confirmar, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acao(dados),
    ESTADO_INICIAL,
  );

  const falhou = resultado !== null && !resultado.ok;

  // Sem endereço do provedor, o campo existe — e é ele que define o modo.
  const precisaDeEmail = email === '';

  const erroDeCampo = (campo: string): string | undefined => {
    if (!falhou) return undefined;
    const motivo = resultado.campos?.[campo];
    return motivo === undefined ? undefined : TEXTO_DO_MOTIVO[motivo];
  };

  return (
    <>
      <div className={estilos.cabecalho}>
        <span className={estilos.overline}>{CONFIRMAR_SOCIAL.overline}</span>
        <h1 className={estilos.titulo}>{CONFIRMAR_SOCIAL.titulo}</h1>
        <p className={estilos.subtitulo}>
          {precisaDeEmail ? CONFIRMAR_SOCIAL.subtituloSemEmail : CONFIRMAR_SOCIAL.subtitulo}
        </p>
      </div>

      {falhou && resultado.codigo === CodigoErro.EMAIL_JA_CADASTRADO ? (
        <Aviso
          tom="erro"
          titulo={CONFIRMAR_SOCIAL.bannerEmailEmUso.titulo}
          acao={
            <Link className={estilos.aceiteLink} href={ROTA.ENTRAR}>
              {CONFIRMAR_SOCIAL.bannerEmailEmUso.acao}
            </Link>
          }
        >
          {CONFIRMAR_SOCIAL.bannerEmailEmUso.texto}
        </Aviso>
      ) : null}

      <form action={confirmar} className={estilos.campos} noValidate>
        <Campo
          name="nome"
          type="text"
          rotulo={CONFIRMAR_SOCIAL.rotuloNome}
          placeholder={CONFIRMAR_SOCIAL.placeholderNome}
          autoComplete="name"
          defaultValue={nome}
          required
          erro={erroDeCampo('nome')}
        />

        {precisaDeEmail ? (
          <Campo
            name="email"
            type="email"
            rotulo={CONFIRMAR_SOCIAL.rotuloEmail}
            placeholder={CONFIRMAR_SOCIAL.placeholderEmail}
            autoComplete="email"
            required
            erro={erroDeCampo('email')}
            auxiliar={CONFIRMAR_SOCIAL.notaEmailPedido}
          />
        ) : (
          <div className={estilos.email}>
            <span className={estilos.emailRotulo}>{CONFIRMAR_SOCIAL.rotuloEmail}</span>
            <span className={estilos.emailValor}>{email}</span>
            <span className={estilos.emailNota}>{CONFIRMAR_SOCIAL.notaEmail}</span>
          </div>
        )}

        <Checkbox name="aceite" value="on" required erro={erroDeCampo('aceite')}>
          {CONFIRMAR_SOCIAL.aceiteAntes}
          <Link className={estilos.aceiteLink} href={ROTA.TERMOS}>
            {CONFIRMAR_SOCIAL.aceiteTermos}
          </Link>
          {CONFIRMAR_SOCIAL.aceiteEntre}
          <Link className={estilos.aceiteLink} href={ROTA.PRIVACIDADE}>
            {CONFIRMAR_SOCIAL.aceitePrivacidade}
          </Link>
          {CONFIRMAR_SOCIAL.aceiteDepois}
        </Checkbox>

        <Botao type="submit" carregando={pendente} blocoInteiro>
          {pendente ? CONFIRMAR_SOCIAL.enviando : CONFIRMAR_SOCIAL.enviar}
        </Botao>
      </form>

      <div className={estilos.saida}>
        <p className={estilos.notaSaida}>{CONFIRMAR_SOCIAL.notaDesistir}</p>
        <form action={acaoDeSair}>
          <Botao type="submit" variante="ghost" tamanho="sm">
            {CONFIRMAR_SOCIAL.desistir}
          </Botao>
        </form>
      </div>
    </>
  );
}
