'use client';

import { useActionState, useState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Botao } from '@/componentes/base/Botao';
import { BotaoLink } from '@/componentes/base/BotaoLink';
import { Campo } from '@/componentes/base/Campo';
import { MedidorDeSenha } from '@/componentes/base/MedidorDeSenha';
import { IconeOlho } from '@/componentes/autenticacao/IconeOlho';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { CodigoErro } from '@/lib/erros';
import { ROTA } from '@/lib/guarda-rota';
import { erroGeralDe } from '@/textos/erros';
import { CADASTRAR, EQUIPE, SENHA } from '@/textos/prototipo';

import estilos from './AceiteDeConvite.module.css';

const { aceite: TEXTOS } = EQUIPE;

const MOTIVOS: Readonly<Record<string, string>> = {
  senha_fraca: SENHA.erroSenhaFraca,
  confirmar_vazio: SENHA.erroConfirmarVazio,
  senhas_diferentes: SENHA.erroSenhasDiferentes,
};

export type EstadoDoAceite = 'pronto' | 'sem_token' | 'sem_sessao';

export type PropsAceiteDeConvite = {
  readonly estadoInicial: EstadoDoAceite;
  /** Define a senha e chama `aceitar_convite_admin`. */
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
  readonly token: string;
};

/**
 * Aceite de convite da equipe (27.3).
 *
 * **Derivada**: o protótipo do admin começa no login e não tem esta tela. O
 * fluxo é do PRD, e a moldura é a das telas de autenticação (design-system
 * §3.3).
 *
 * ## Quatro estados na mesma rota
 *
 * Link sem token, sessão ausente, convite inválido e concluído. São a mesma
 * rota porque o link do e-mail aponta para um lugar só, e o que ele encontra
 * depende do token e da sessão — não do endereço.
 *
 * O caso "sem sessão" é real e não é erro: `inviteUserByEmail` cria a conta e
 * autentica quem clica no link, mas o link pode ser aberto em outro navegador,
 * dias depois, com a sessão já expirada. Aí o caminho é entrar e voltar.
 *
 * ## Convite inválido não diz por quê
 *
 * Expirado, já usado, inexistente ou de outro e-mail viram a mesma tela.
 * Distingui-los diria a quem tem o link se ele é válido para **outra** pessoa —
 * e o convite dá acesso administrativo.
 */
export function AceiteDeConvite({ estadoInicial, acao, token }: PropsAceiteDeConvite) {
  const [resultado, enviar, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acao(dados),
    null,
  );

  const [senha, setSenha] = useState('');
  const [visivel, setVisivel] = useState(false);

  const concluido = resultado !== null && resultado.ok;
  const falhou = resultado !== null && !resultado.ok;

  const erroDe = (campo: string): string | undefined => {
    if (!falhou) return undefined;
    const motivo = resultado.campos?.[campo];
    if (motivo !== undefined) return MOTIVOS[motivo];

    // RF-033: `definirSenhaDoConvite` devolve `falha(SENHA_FRACA, 'senha')` —
    // chave `campo`, singular, que a leitura por `campos` não alcança. É o
    // caminho de toda senha recusada pelo Auth: fraca, vazada, ou igual à atual
    // (`same_password` vira `senha_fraca` em `autenticacao/repositorio.ts`).
    if (resultado.campo === campo && resultado.codigo === CodigoErro.SENHA_FRACA) {
      return SENHA.erroSenhaFraca;
    }
    return undefined;
  };

  if (concluido) {
    return (
      <div className={estilos.cabecalho}>
        <span className={estilos.overline}>{TEXTOS.overline}</span>
        <h1 className={estilos.titulo}>{TEXTOS.sucessoTitulo}</h1>
        <p className={estilos.texto}>{TEXTOS.sucessoTexto}</p>
        <BotaoLink href={ROTA.ADMIN} blocoInteiro>
          {TEXTOS.irAoPainel}
        </BotaoLink>
      </div>
    );
  }

  if (estadoInicial === 'sem_token') {
    return (
      <div className={estilos.cabecalho}>
        <span className={estilos.overline}>{TEXTOS.overline}</span>
        <h1 className={estilos.titulo}>{TEXTOS.tituloSemToken}</h1>
        <p className={estilos.texto}>{TEXTOS.textoSemToken}</p>
        <BotaoLink href={ROTA.ADMIN_ENTRAR} variante="secundario" blocoInteiro>
          {TEXTOS.irAoLogin}
        </BotaoLink>
      </div>
    );
  }

  if (
    estadoInicial === 'sem_sessao' ||
    (falhou && resultado.codigo === CodigoErro.NAO_AUTENTICADO)
  ) {
    return (
      <div className={estilos.cabecalho}>
        <span className={estilos.overline}>{TEXTOS.overline}</span>
        <h1 className={estilos.titulo}>{TEXTOS.tituloSemSessao}</h1>
        <p className={estilos.texto}>{TEXTOS.textoSemSessao}</p>
        <BotaoLink href={ROTA.ADMIN_ENTRAR} blocoInteiro>
          {TEXTOS.irAoLogin}
        </BotaoLink>
      </div>
    );
  }

  const conviteInvalido = falhou && resultado.codigo === CodigoErro.TOKEN_INVALIDO;

  if (conviteInvalido) {
    return (
      <div className={estilos.cabecalho}>
        <span className={estilos.overline}>{TEXTOS.overline}</span>
        <h1 className={estilos.titulo}>{TEXTOS.tituloInvalido}</h1>
        <p className={estilos.texto}>{TEXTOS.textoInvalido}</p>
        <BotaoLink href={ROTA.ADMIN_ENTRAR} variante="secundario" blocoInteiro>
          {TEXTOS.irAoLogin}
        </BotaoLink>
      </div>
    );
  }

  // Os três estados acima já têm tela própria. O que sobra sem campo — e é
  // muito: `CONVITE_INVALIDO`, `CONFLITO`, `NAO_AUTORIZADO` — cai aqui, em vez
  // de deixar "Concluir acesso" sem efeito nenhum.
  const erroGeral = erroGeralDe(falhou ? resultado : null, [erroDe('senha'), erroDe('confirmar')]);

  const olho = (
    <button
      type="button"
      className={estilos.olho}
      onClick={() => setVisivel((atual) => !atual)}
      aria-pressed={visivel}
      aria-label={visivel ? CADASTRAR.ocultarSenha : CADASTRAR.mostrarSenha}
      title={visivel ? CADASTRAR.ocultarSenha : CADASTRAR.mostrarSenha}
    >
      <IconeOlho riscado={visivel} />
    </button>
  );

  return (
    <>
      <div className={estilos.cabecalho}>
        <span className={estilos.overline}>{TEXTOS.overline}</span>
        <h1 className={estilos.titulo}>{TEXTOS.titulo}</h1>
        <p className={estilos.texto}>{TEXTOS.texto}</p>
      </div>

      <form action={enviar} className={estilos.formulario} noValidate>
        {/* O token vem da URL e viaja no formulário: sem JavaScript não há de
            onde a ação o ler senão daqui. */}
        <input type="hidden" name="token" value={token} />

        {erroGeral === undefined ? null : <Aviso tom="erro">{erroGeral}</Aviso>}

        <div className={estilos.blocoSenha}>
          <Campo
            name="senha"
            type={visivel ? 'text' : 'password'}
            rotulo={TEXTOS.rotuloSenha}
            placeholder={TEXTOS.placeholderSenha}
            autoComplete="new-password"
            required
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            erro={erroDe('senha')}
            acao={olho}
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
          type={visivel ? 'text' : 'password'}
          rotulo={TEXTOS.rotuloConfirmar}
          placeholder={TEXTOS.placeholderConfirmar}
          autoComplete="new-password"
          required
          erro={erroDe('confirmar')}
        />

        <Botao type="submit" blocoInteiro carregando={pendente}>
          {pendente ? TEXTOS.enviando : TEXTOS.enviar}
        </Botao>
      </form>
    </>
  );
}
