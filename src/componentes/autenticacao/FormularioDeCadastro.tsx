'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useActionState, useState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Botao } from '@/componentes/base/Botao';
import type { TamanhoBotao } from '@/componentes/base/Botao';
import { Campo } from '@/componentes/base/Campo';
import { Checkbox } from '@/componentes/base/Checkbox';
import { MedidorDeSenha } from '@/componentes/base/MedidorDeSenha';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { CodigoErro } from '@/lib/erros';
import { ROTA } from '@/lib/guarda-rota';
import type { TextosDeCadastro } from '@/textos/prototipo';
import { erroGeralDe } from '@/textos/erros';

import estilos from './FormularioDeCadastro.module.css';
import type { Banner } from './FormularioDeLogin';
import { IconeOlho } from './IconeOlho';

export type PropsFormularioDeCadastro = {
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
  readonly textos: TextosDeCadastro;
  /** Para onde "Entrar" e "Já tem conta?" levam — muda por perfil. */
  readonly hrefEntrar: string;
  /**
   * Papel da rota exclusiva (`/artista/cadastrar`, `/curador/cadastrar`).
   *
   * Vai como hidden input, e a Server Action grava o papel na conta assim que
   * a sessão existir — sem passar por `/selecao-de-perfil`. Ausente em
   * `/cadastrar`, que não sabe o papel de antemão.
   */
  readonly papel?: 'artista' | 'curador';
  /** Botões sociais e divisor — ficam **abaixo** do formulário nesta tela. */
  readonly social?: ReactNode;
  /**
   * Quando `true`, não renderiza overline/título/subtítulo internos.
   *
   * A tela de criar conta do curador embrulha este formulário na moldura do
   * wizard (`MolduraDoWizard`), que já é dona do `<h1>` e do subtítulo do
   * passo 1 — repeti-los aqui duplicaria o título, o mesmo defeito que
   * `FormularioDeLogin` tinha nas telas com chamada externa.
   */
  readonly semCabecalho?: boolean;
  /**
   * Tamanho e largura do botão de envio. `undefined`/`true` reproduz o padrão
   * do cadastro do artista (`md`, bloco inteiro); a tela de criar conta do
   * curador passa `denso`/`false` — é o "Continuar" de 15px do rodapé do
   * wizard (`AcoesDoPasso`), não o botão largo do cartão de cadastro.
   */
  readonly tamanhoDoBotao?: TamanhoBotao;
  readonly blocoInteiro?: boolean;
  /**
   * Cor do link "Já tem conta?" / "Voltar ao login". `'destaque'` (padrão) é
   * o roxo do cadastro do artista; `'neutro'` é o cinza que o protótipo usa
   * no "Voltar ao login" do wizard do curador — lá ele desfaz, e desfazer não
   * é convite (mesma razão do `Botao variante="neutro"` de `AcoesDoPasso`).
   */
  readonly corDoRodape?: 'destaque' | 'neutro';
};

const ESTADO_INICIAL: ResultadoDeAcao | null = null;

/**
 * Tradução dos códigos de campo para o texto do protótipo.
 *
 * O servidor devolve códigos (`nome_vazio`, `senhas_diferentes`) e a View
 * traduz — architecture.md §8. É o que permite o i18n entrar sem tocar em ação
 * nenhuma, e o que garante que a mensagem seja a mesma com e sem JavaScript.
 */
function textoDoMotivo(textos: TextosDeCadastro): Readonly<Record<string, string>> {
  return {
    nome_vazio: textos.erroNomeVazio,
    email_vazio: textos.erroEmailVazio,
    email_invalido: textos.erroEmailInvalido,
    senha_fraca: textos.erroSenhaFraca,
    confirmar_vazio: textos.erroConfirmarVazio,
    senhas_diferentes: textos.erroSenhasDiferentes,
    aceite_obrigatorio: textos.erroAceite,
  };
}

/**
 * Tela 1.1 — criar conta.
 *
 * Mesmo desenho do `FormularioDeLogin`: `useActionState` com
 * `<form action={...}>`, que funciona **sem JavaScript**. Numa tela de
 * cadastro isso vale o mesmo que no login — uma falha de hidratação aqui
 * impede a pessoa de existir no produto.
 *
 * A senha é o único estado local, e por um motivo só: o medidor de força
 * precisa dela a cada tecla. Os erros continuam vindo do servidor, inclusive o
 * de senha fraca — o medidor informa, ele não valida.
 */
export function FormularioDeCadastro({
  acao,
  textos,
  hrefEntrar,
  papel,
  social,
  semCabecalho = false,
  tamanhoDoBotao,
  blocoInteiro = true,
  corDoRodape = 'destaque',
}: PropsFormularioDeCadastro) {
  const [resultado, enviar, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acao(dados),
    ESTADO_INICIAL,
  );

  const [senha, setSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);

  const falhou = resultado !== null && !resultado.ok;

  const erroDeCampo = (campo: string): string | undefined => {
    if (!falhou) return undefined;

    // `campos` é o caminho do formulário grande: todos os erros de uma vez.
    const motivo = resultado.campos?.[campo];
    if (motivo !== undefined) return textoDoMotivo(textos)[motivo] ?? textos.erroEmailInvalido;

    // `campo` é o caminho de um erro único — é como o Auth devolve os dois
    // erros que ele julga por conta própria: senha fraca e endereço recusado.
    if (resultado.campo === campo && resultado.codigo === CodigoErro.SENHA_FRACA) {
      return textos.erroSenhaFraca;
    }
    if (resultado.campo === campo && resultado.codigo === CodigoErro.EMAIL_INVALIDO) {
      return textos.erroEmailInvalido;
    }
    return undefined;
  };

  const banner: Banner | null = !falhou
    ? null
    : resultado.codigo === CodigoErro.EMAIL_JA_CADASTRADO
      ? {
          titulo: textos.bannerEmailExistente.titulo,
          texto: textos.bannerEmailExistente.texto,
          acao: (
            <Link className={estilos.bannerLink} href={hrefEntrar}>
              {textos.bannerEmailExistente.acao}
            </Link>
          ),
        }
      : resultado.codigo === CodigoErro.LIMITE_DE_ENVIO
        ? textos.bannerLimite
        : null;

  // O que não virou banner nem campo tem de aparecer em algum lugar: sem isto,
  // um `CONFLITO` ou um `NAO_AUTORIZADO` deixa o botão "Criar conta" mudo.
  const erroGeral = erroGeralDe(
    falhou ? resultado : null,
    [
      erroDeCampo('nome'),
      erroDeCampo('email'),
      erroDeCampo('senha'),
      erroDeCampo('confirmar'),
      erroDeCampo('aceite'),
    ],
    banner !== null,
  );

  return (
    <>
      {semCabecalho ? null : (
        <div className={estilos.cabecalho}>
          <span className={estilos.overline}>{textos.overline}</span>
          <h1 className={estilos.titulo}>{textos.titulo}</h1>
          <p className={estilos.subtitulo}>{textos.subtitulo}</p>
        </div>
      )}

      {banner !== null ? (
        <Aviso tom="erro" titulo={banner.titulo} acao={banner.acao}>
          {banner.texto}
        </Aviso>
      ) : null}

      <form action={enviar} className={estilos.campos} noValidate>
        {erroGeral === undefined ? null : <Aviso tom="erro">{erroGeral}</Aviso>}

        {papel === undefined ? null : <input type="hidden" name="papel" value={papel} />}

        <Campo
          name="nome"
          type="text"
          rotulo={textos.rotuloNome}
          placeholder={textos.placeholderNome}
          autoComplete="name"
          required
          erro={erroDeCampo('nome')}
        />

        <Campo
          name="email"
          type="email"
          rotulo={textos.rotuloEmail}
          placeholder={textos.placeholderEmail}
          autoComplete="email"
          required
          erro={erroDeCampo('email')}
        />

        <div className={estilos.blocoSenha}>
          <Campo
            name="senha"
            type={senhaVisivel ? 'text' : 'password'}
            rotulo={textos.rotuloSenha}
            placeholder={textos.placeholderSenha}
            autoComplete="new-password"
            required
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            erro={erroDeCampo('senha')}
            acao={
              <button
                type="button"
                className={estilos.olho}
                onClick={() => setSenhaVisivel((visivel) => !visivel)}
                aria-pressed={senhaVisivel}
                aria-label={senhaVisivel ? textos.ocultarSenha : textos.mostrarSenha}
                title={senhaVisivel ? textos.ocultarSenha : textos.mostrarSenha}
              >
                <IconeOlho riscado={senhaVisivel} />
              </button>
            }
          />

          <MedidorDeSenha
            senha={senha}
            rotulos={textos.forcaDaSenha}
            requisitos={{
              tamanho: textos.requisitoTamanho,
              numero: textos.requisitoNumero,
            }}
          />
        </div>

        <Campo
          name="confirmar"
          type={senhaVisivel ? 'text' : 'password'}
          rotulo={textos.rotuloConfirmar}
          placeholder={textos.placeholderConfirmar}
          autoComplete="new-password"
          required
          erro={erroDeCampo('confirmar')}
        />

        <Checkbox name="aceite" value="on" required erro={erroDeCampo('aceite')}>
          {textos.aceiteAntes}
          <Link className={estilos.aceiteLink} href={ROTA.TERMOS}>
            {textos.aceiteTermos}
          </Link>
          {textos.aceiteEntre}
          <Link className={estilos.aceiteLink} href={ROTA.PRIVACIDADE}>
            {textos.aceitePrivacidade}
          </Link>
          {textos.aceiteDepois}
        </Checkbox>

        <Botao
          type="submit"
          tamanho={tamanhoDoBotao}
          carregando={pendente}
          blocoInteiro={blocoInteiro}
        >
          {pendente ? textos.enviando : textos.enviar}
        </Botao>
      </form>

      {social}

      <p className={estilos.alternativa}>
        {textos.temConta}
        <Link
          className={
            corDoRodape === 'neutro'
              ? `${estilos.alternativaLink} ${estilos.alternativaLinkNeutro}`
              : estilos.alternativaLink
          }
          href={hrefEntrar}
        >
          {textos.entrar}
        </Link>
      </p>
    </>
  );
}
