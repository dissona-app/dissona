'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Botao } from '@/componentes/base/Botao';
import { Campo } from '@/componentes/base/Campo';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { CodigoErro } from '@/lib/erros';
import { SENHA } from '@/textos/prototipo';

import estilos from './FormularioDeRecuperacao.module.css';

export type PropsFormularioDeRecuperacao = {
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
  /** `/entrar` ou `/admin/entrar` — é a única diferença entre os dois ambientes. */
  readonly hrefDoLogin: string;
  /** Cooldown de reenvio, em segundos (19.1 pede um). */
  readonly segundosDeCooldown: number;
};

const ESTADO_INICIAL: ResultadoDeAcao | null = null;

/**
 * Telas 1.2 e 19.1 — esqueci minha senha.
 *
 * Uma rota, dois estados: o formulário e a confirmação neutra. É como o
 * protótipo se comporta, e a razão de não serem duas rotas é a própria
 * neutralidade — uma URL de confirmação distinta seria alcançável e diria, pela
 * simples existência, que algo aconteceu.
 *
 * ## A confirmação não confirma nada
 *
 * *"Se este e-mail estiver cadastrado, enviamos um link de recuperação. Por
 * segurança, não confirmamos se a conta existe."* A tela mostra isto para
 * endereço cadastrado e não cadastrado, e a ação por trás devolve sucesso nos
 * dois casos. Qualquer diferença — de texto, de tempo de resposta, de estado —
 * transformaria esta tela num oráculo de contas.
 *
 * O cooldown existe pelo mesmo motivo de sempre: o servidor já recusa com 429,
 * e o contador só evita que a pessoa descubra isso clicando.
 */
export function FormularioDeRecuperacao({
  acao,
  hrefDoLogin,
  segundosDeCooldown,
}: PropsFormularioDeRecuperacao) {
  /**
   * O cooldown é um **instante**, não um contador que decrementa.
   *
   * A primeira versão guardava os segundos restantes e os diminuía num
   * `useEffect`, e isso é cascata de render disfarçada de relógio: cada tique
   * agenda o próximo pelo próprio estado que acabou de mudar. Guardando o
   * instante em que o cooldown termina, o que resta é uma subtração — e o
   * efeito passa a ser o que efeito deve ser, uma assinatura de relógio.
   *
   * O `setFimDoCooldown` mora dentro da função da ação, que é manipulador de
   * evento e não efeito. É o lugar certo: o cooldown começa porque a pessoa
   * enviou, não porque a tela renderizou.
   */
  const [fimDoCooldown, setFimDoCooldown] = useState<number | null>(null);
  const [agora, setAgora] = useState(0);

  const [resultado, enviar, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => {
      const proximo = await acao(dados);
      if (proximo.ok) {
        const fim = Date.now() + segundosDeCooldown * 1000;
        setFimDoCooldown(fim);
        setAgora(Date.now());
      }
      return proximo;
    },
    ESTADO_INICIAL,
  );

  const enviado = resultado !== null && resultado.ok;
  const falhou = resultado !== null && !resultado.ok;

  useEffect(() => {
    if (fimDoCooldown === null) return;

    const relogio = setInterval(() => {
      const instante = Date.now();
      setAgora(instante);
      if (instante >= fimDoCooldown) clearInterval(relogio);
    }, 500);

    return () => clearInterval(relogio);
  }, [fimDoCooldown]);

  const restante =
    fimDoCooldown === null ? 0 : Math.max(0, Math.ceil((fimDoCooldown - agora) / 1000));

  const erroDeEmail =
    falhou && resultado.codigo === CodigoErro.ENTRADA_INVALIDA
      ? resultado.detalhes?.['motivo'] === 'email_vazio'
        ? SENHA.erroEmailVazio
        : SENHA.erroEmailInvalido
      : undefined;

  const emCooldown = restante > 0;

  return (
    <>
      <div className={estilos.cabecalho}>
        <span className={estilos.overline}>
          {enviado ? SENHA.enviadoOverline : SENHA.recuperarOverline}
        </span>
        {/* O título da confirmação neutra é uma frase, e o protótipo o compõe
            num degrau abaixo do nome de tela — ver `.tituloFrase` no CSS. */}
        <h1 className={enviado ? estilos.tituloFrase : estilos.titulo}>
          {enviado ? SENHA.enviadoTitulo : SENHA.recuperarTitulo}
        </h1>
        <p className={estilos.texto}>{enviado ? SENHA.enviadoTexto : SENHA.recuperarTexto}</p>
        {enviado ? null : <p className={estilos.nota}>{SENHA.recuperarNota}</p>}
      </div>

      {falhou && resultado.codigo === CodigoErro.LIMITE_DE_ENVIO ? (
        <Aviso tom="alerta" titulo={SENHA.bannerLimite.titulo}>
          {SENHA.bannerLimite.texto}
        </Aviso>
      ) : null}

      {/*
        O formulário continua montado depois do envio — é ele que reenvia. Só o
        campo sai de vista, porque o endereço já foi dado e reeditá-lo seria
        outro pedido, não um reenvio.
      */}
      <form action={enviar} className={estilos.campos}>
        <div className={enviado ? 'dsn-apenas-leitor' : estilos.campo}>
          <Campo
            name="email"
            type="email"
            rotulo={SENHA.rotuloEmail}
            placeholder={SENHA.placeholderEmail}
            autoComplete="email"
            required
            erro={erroDeEmail}
          />
        </div>

        <Botao
          type="submit"
          variante={enviado ? 'secundario' : 'primario'}
          carregando={pendente}
          blocoInteiro
          disabled={emCooldown}
        >
          {rotuloDoBotao({ enviado, pendente, restante })}
        </Botao>
      </form>

      <p className={estilos.rodape}>
        {enviado ? null : <span className={estilos.rodapePergunta}>{SENHA.lembrou}</span>}
        <Link className={estilos.rodapeLink} href={hrefDoLogin}>
          {SENHA.voltarAoLogin}
        </Link>
      </p>
    </>
  );
}

function rotuloDoBotao({
  enviado,
  pendente,
  restante,
}: {
  readonly enviado: boolean;
  readonly pendente: boolean;
  readonly restante: number;
}): string {
  if (pendente) return enviado ? SENHA.reenviando : SENHA.recuperarEnviando;
  // O contador vai no rótulo, e não num texto ao lado: é a informação de que a
  // pessoa precisa no exato elemento que ela está tentando clicar.
  if (restante > 0) return `${SENHA.reenviar} (${restante}s)`;
  return enviado ? SENHA.reenviar : SENHA.recuperarEnviar;
}
