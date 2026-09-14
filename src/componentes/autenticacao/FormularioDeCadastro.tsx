'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useActionState, useState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Botao } from '@/componentes/base/Botao';
import { Campo } from '@/componentes/base/Campo';
import { Checkbox } from '@/componentes/base/Checkbox';
import { MedidorDeSenha } from '@/componentes/base/MedidorDeSenha';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { CodigoErro } from '@/lib/erros';
import { ROTA } from '@/lib/guarda-rota';
import { CADASTRAR } from '@/textos/prototipo';

import estilos from './FormularioDeCadastro.module.css';
import type { Banner } from './FormularioDeLogin';
import { IconeOlho } from './IconeOlho';

export type PropsFormularioDeCadastro = {
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
  /** Botões sociais e divisor — ficam **abaixo** do formulário nesta tela. */
  readonly social?: ReactNode;
};

const ESTADO_INICIAL: ResultadoDeAcao | null = null;

/**
 * Tradução dos códigos de campo para o texto do protótipo.
 *
 * O servidor devolve códigos (`nome_vazio`, `senhas_diferentes`) e a View
 * traduz — architecture.md §8. É o que permite o i18n entrar sem tocar em ação
 * nenhuma, e o que garante que a mensagem seja a mesma com e sem JavaScript.
 */
const TEXTO_DO_MOTIVO: Readonly<Record<string, string>> = {
  nome_vazio: CADASTRAR.erroNomeVazio,
  email_vazio: CADASTRAR.erroEmailVazio,
  email_invalido: CADASTRAR.erroEmailInvalido,
  senha_fraca: CADASTRAR.erroSenhaFraca,
  confirmar_vazio: CADASTRAR.erroConfirmarVazio,
  senhas_diferentes: CADASTRAR.erroSenhasDiferentes,
  aceite_obrigatorio: CADASTRAR.erroAceite,
};

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
export function FormularioDeCadastro({ acao, social }: PropsFormularioDeCadastro) {
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
    if (motivo !== undefined) return TEXTO_DO_MOTIVO[motivo] ?? CADASTRAR.erroEmailInvalido;

    // `campo` é o caminho de um erro único — é como o Auth devolve os dois
    // erros que ele julga por conta própria: senha fraca e endereço recusado.
    if (resultado.campo === campo && resultado.codigo === CodigoErro.SENHA_FRACA) {
      return CADASTRAR.erroSenhaFraca;
    }
    if (resultado.campo === campo && resultado.codigo === CodigoErro.EMAIL_INVALIDO) {
      return CADASTRAR.erroEmailInvalido;
    }
    return undefined;
  };

  const banner: Banner | null = !falhou
    ? null
    : resultado.codigo === CodigoErro.EMAIL_JA_CADASTRADO
      ? {
          titulo: CADASTRAR.bannerEmailExistente.titulo,
          texto: CADASTRAR.bannerEmailExistente.texto,
          acao: (
            <Link className={estilos.bannerLink} href={ROTA.ENTRAR}>
              {CADASTRAR.bannerEmailExistente.acao}
            </Link>
          ),
        }
      : resultado.codigo === CodigoErro.LIMITE_DE_ENVIO
        ? CADASTRAR.bannerLimite
        : null;

  return (
    <>
      <div className={estilos.cabecalho}>
        <span className={estilos.overline}>{CADASTRAR.overline}</span>
        <h1 className={estilos.titulo}>{CADASTRAR.titulo}</h1>
        <p className={estilos.subtitulo}>{CADASTRAR.subtitulo}</p>
      </div>

      {banner !== null ? (
        <Aviso tom="erro" titulo={banner.titulo} acao={banner.acao}>
          {banner.texto}
        </Aviso>
      ) : null}

      <form action={enviar} className={estilos.campos} noValidate>
        <Campo
          name="nome"
          type="text"
          rotulo={CADASTRAR.rotuloNome}
          placeholder={CADASTRAR.placeholderNome}
          autoComplete="name"
          required
          erro={erroDeCampo('nome')}
        />

        <Campo
          name="email"
          type="email"
          rotulo={CADASTRAR.rotuloEmail}
          placeholder={CADASTRAR.placeholderEmail}
          autoComplete="email"
          required
          erro={erroDeCampo('email')}
        />

        <div className={estilos.blocoSenha}>
          <Campo
            name="senha"
            type={senhaVisivel ? 'text' : 'password'}
            rotulo={CADASTRAR.rotuloSenha}
            placeholder={CADASTRAR.placeholderSenha}
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
                aria-label={senhaVisivel ? CADASTRAR.ocultarSenha : CADASTRAR.mostrarSenha}
                title={senhaVisivel ? CADASTRAR.ocultarSenha : CADASTRAR.mostrarSenha}
              >
                <IconeOlho riscado={senhaVisivel} />
              </button>
            }
          />

          <MedidorDeSenha
            senha={senha}
            rotulos={CADASTRAR.forcaDaSenha}
            requisitos={{
              tamanho: CADASTRAR.requisitoTamanho,
              numero: CADASTRAR.requisitoNumero,
            }}
          />
        </div>

        <Campo
          name="confirmar"
          type={senhaVisivel ? 'text' : 'password'}
          rotulo={CADASTRAR.rotuloConfirmar}
          placeholder={CADASTRAR.placeholderConfirmar}
          autoComplete="new-password"
          required
          erro={erroDeCampo('confirmar')}
        />

        <Checkbox name="aceite" value="on" required erro={erroDeCampo('aceite')}>
          {CADASTRAR.aceiteAntes}
          <Link className={estilos.aceiteLink} href={ROTA.TERMOS}>
            {CADASTRAR.aceiteTermos}
          </Link>
          {CADASTRAR.aceiteEntre}
          <Link className={estilos.aceiteLink} href={ROTA.PRIVACIDADE}>
            {CADASTRAR.aceitePrivacidade}
          </Link>
          {CADASTRAR.aceiteDepois}
        </Checkbox>

        <Botao type="submit" carregando={pendente} blocoInteiro>
          {pendente ? CADASTRAR.enviando : CADASTRAR.enviar}
        </Botao>
      </form>

      {social}

      <p className={estilos.alternativa}>
        {CADASTRAR.temConta}
        <Link className={estilos.alternativaLink} href={ROTA.ENTRAR}>
          {CADASTRAR.entrar}
        </Link>
      </p>
    </>
  );
}
