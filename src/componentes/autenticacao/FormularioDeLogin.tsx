'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useActionState, useState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Botao } from '@/componentes/base/Botao';
import { Campo } from '@/componentes/base/Campo';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { CodigoErro } from '@/lib/erros';

import estilos from './FormularioDeLogin.module.css';
import { IconeOlho } from './IconeOlho';

export type Banner = { readonly titulo: string; readonly texto: string; readonly acao?: ReactNode };

export type TextosDeLogin = {
  readonly overline?: string;
  /**
   * `<h1>` quando a moldura não tem chamada (tela 19); ausente quando tem
   * (tela 1) — a chamada já traz o `<h1>` e as provas visíveis do protótipo,
   * e repetir o título dentro do card duplicaria um texto que ele só mostra
   * uma vez (`docs/R2/extraido/Artista.html`: depois do `<h1>` da chamada, o
   * card vai direto para o banner condicional).
   */
  readonly titulo?: string;
  readonly tituloComoH1?: boolean;
  readonly subtitulo?: string;
  readonly rotuloEmail: string;
  readonly placeholderEmail: string;
  readonly rotuloSenha: string;
  readonly placeholderSenha: string;
  readonly esqueciSenha: string;
  readonly hrefEsqueciSenha: string;
  readonly mostrarSenha: string;
  readonly ocultarSenha: string;
  readonly enviar: string;
  readonly enviando: string;
  readonly erroEmailVazio: string;
  readonly erroEmailInvalido: string;
  readonly erroSenhaVazia: string;
  readonly bannerCredenciais: Banner;
  /** Só a tela 19 tem — conta existente sem papel `admin`. */
  readonly bannerSemAcesso?: Banner;
  readonly bannerBloqueada: Banner;
};

export type PropsFormulario = {
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
  readonly textos: TextosDeLogin;
  readonly proximo?: string;
  /** Ícone à esquerda do overline — o cadeado da tela 19. */
  readonly icone?: ReactNode;
  /** Botões sociais e divisor "ou" — só a tela 1. */
  readonly social?: ReactNode;
  /** Rodapé do card: a nota do admin, ou o "Criar conta" do artista. */
  readonly rodape?: ReactNode;
  /**
   * Banner já visível na primeira renderização, antes de qualquer tentativa.
   *
   * Vem de `?motivo=` na URL: o middleware não pode devolver um
   * `ResultadoDeAcao` — ele redireciona —, então a razão de a pessoa ter sido
   * ejetada viaja na query string. É o caso de alguém que estava navegando
   * quando o admin bloqueou a conta.
   */
  readonly bannerInicial?: Banner;
};

const ESTADO_INICIAL: ResultadoDeAcao | null = null;

/**
 * Formulário de login das telas 1 e 19.
 *
 * `useActionState` em vez de `onSubmit` com `fetch`: o formulário funciona
 * **sem JavaScript** — o `<form action={...}>` do Next envia por POST normal, o
 * servidor autentica e redireciona. Numa tela de login isso não é purismo:
 * é a tela em que uma falha de hidratação deixa o produto inteiro
 * inacessível.
 *
 * O erro de campo vem do servidor, e não de validação no cliente. O protótipo
 * valida no cliente (`touched && !validEmail`), o que é bom para retorno
 * imediato, mas o servidor é quem decide — e ter só um lugar decidindo é o que
 * garante que a mensagem seja a mesma nos dois caminhos. O `type="email"` e o
 * `required` do navegador cobrem o retorno imediato de graça.
 */
export function FormularioDeLogin({
  acao,
  textos,
  proximo,
  icone,
  social,
  rodape,
  bannerInicial,
}: PropsFormulario) {
  const [resultado, enviar, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acao(dados),
    ESTADO_INICIAL,
  );

  const [senhaVisivel, setSenhaVisivel] = useState(false);

  const falhou = resultado !== null && !resultado.ok;

  const erroDeCampo = (campo: string): string | undefined => {
    if (!falhou || resultado.campo !== campo) return undefined;
    if (campo === 'email') {
      return resultado.detalhes?.['motivo'] === 'email_vazio'
        ? textos.erroEmailVazio
        : textos.erroEmailInvalido;
    }
    return textos.erroSenhaVazia;
  };

  /**
   * Banner de topo. Uma mensagem por causa — é o que o protótipo faz, e a
   * diferença importa: "senha errada" pede outra tentativa, "conta bloqueada"
   * pede falar com o suporte, "conta sem acesso administrativo" pede falar com
   * um administrador. Um banner genérico faria as duas últimas pessoas tentarem
   * a senha de novo, indefinidamente.
   *
   * O `bannerInicial` só vale enquanto não houve tentativa: assim que a pessoa
   * envia o formulário, o resultado da tentativa é o que ela precisa ler.
   */
  const banner: Banner | null = !falhou
    ? (bannerInicial ?? null)
    : resultado.codigo === CodigoErro.PAPEL_AUSENTE && textos.bannerSemAcesso !== undefined
      ? textos.bannerSemAcesso
      : resultado.codigo === CodigoErro.CONTA_BLOQUEADA
        ? textos.bannerBloqueada
        : resultado.codigo === CodigoErro.NAO_AUTENTICADO
          ? textos.bannerCredenciais
          : null;

  const Titulo = textos.tituloComoH1 === true ? 'h1' : 'h2';
  const temCabecalho =
    textos.overline !== undefined || textos.titulo !== undefined || textos.subtitulo !== undefined;

  return (
    <>
      {temCabecalho ? (
        <div className={estilos.cabecalho}>
          {textos.overline !== undefined ? (
            <span className={estilos.overline}>
              {icone}
              {textos.overline}
            </span>
          ) : null}
          {textos.titulo !== undefined ? (
            <Titulo className={estilos.titulo}>{textos.titulo}</Titulo>
          ) : null}
          {textos.subtitulo !== undefined ? (
            <p className={estilos.subtitulo}>{textos.subtitulo}</p>
          ) : null}
        </div>
      ) : null}

      {banner !== null ? (
        <Aviso tom="erro" titulo={banner.titulo} acao={banner.acao}>
          {banner.texto}
        </Aviso>
      ) : null}

      {social}

      <form action={enviar} className={estilos.campos} noValidate>
        {proximo !== undefined ? <input type="hidden" name="proximo" value={proximo} /> : null}

        <Campo
          name="email"
          type="email"
          rotulo={textos.rotuloEmail}
          placeholder={textos.placeholderEmail}
          autoComplete="email"
          required
          erro={erroDeCampo('email')}
        />

        <Campo
          name="senha"
          type={senhaVisivel ? 'text' : 'password'}
          rotulo={textos.rotuloSenha}
          placeholder={textos.placeholderSenha}
          autoComplete="current-password"
          required
          erro={erroDeCampo('senha')}
          acessorioDoRotulo={
            <Link className={estilos.esqueci} href={textos.hrefEsqueciSenha}>
              {textos.esqueciSenha}
            </Link>
          }
          acao={
            <button
              type="button"
              className={estilos.olho}
              onClick={() => setSenhaVisivel((visivel) => !visivel)}
              // `aria-pressed` **e** rótulo que muda: o rótulo diz o que o
              // botão faz agora, e o estado diz onde estamos. Só o rótulo
              // deixaria o leitor de tela sem saber se a senha está exposta.
              aria-pressed={senhaVisivel}
              aria-label={senhaVisivel ? textos.ocultarSenha : textos.mostrarSenha}
              title={senhaVisivel ? textos.ocultarSenha : textos.mostrarSenha}
            >
              <IconeOlho riscado={senhaVisivel} />
            </button>
          }
        />

        <Botao type="submit" carregando={pendente} blocoInteiro>
          {pendente ? textos.enviando : textos.enviar}
        </Botao>
      </form>

      {rodape}
    </>
  );
}
