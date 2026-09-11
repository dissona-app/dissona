'use client';

import { useActionState, useState } from 'react';

import { Botao } from '@/componentes/base/Botao';
import { BotaoLink } from '@/componentes/base/BotaoLink';
import { Campo } from '@/componentes/base/Campo';
import { MedidorDeSenha } from '@/componentes/base/MedidorDeSenha';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { CodigoErro } from '@/lib/erros';
import { SENHA } from '@/textos/prototipo';

import estilos from './FormularioDeRedefinicao.module.css';
import { IconeOlho } from './IconeOlho';

export type PropsFormularioDeRedefinicao = {
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
  readonly hrefDoLogin: string;
  readonly hrefDaRecuperacao: string;
  /**
   * `false` quando não há marcador de recuperação — link expirado, já usado, ou
   * rota aberta na mão. A tela não distingue os três, porque para quem está na
   * frente dela os três pedem a mesma coisa: outro link.
   */
  readonly autorizado: boolean;
};

const ESTADO_INICIAL: ResultadoDeAcao | null = null;

const TEXTO_DO_MOTIVO: Readonly<Record<string, string>> = {
  senha_fraca: SENHA.erroSenhaFraca,
  confirmar_vazio: SENHA.erroConfirmarVazio,
  senhas_diferentes: SENHA.erroSenhasDiferentes,
};

/**
 * Telas 1.3 e 19.2 — definir nova senha.
 *
 * Três estados na mesma rota, exatamente como o protótipo: link válido, link
 * inválido e senha redefinida. Serem a mesma rota importa — o link do e-mail
 * aponta para um lugar só, e o que ele encontra ao chegar depende do token, não
 * do endereço.
 *
 * A tela **não** mostra "Redefinindo a senha de a***@email.com". O protótipo
 * mostra, mascarando um endereço que a própria pessoa digitou na tela anterior;
 * aqui quem chega vem do e-mail, e a linha não acrescenta nada que ela já não
 * saiba. Ver a nota em `SENHA.dono`.
 */
export function FormularioDeRedefinicao({
  acao,
  hrefDoLogin,
  hrefDaRecuperacao,
  autorizado,
}: PropsFormularioDeRedefinicao) {
  const [resultado, enviar, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acao(dados),
    ESTADO_INICIAL,
  );

  const [senha, setSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);

  const concluido = resultado !== null && resultado.ok;
  const falhou = resultado !== null && !resultado.ok;

  // O token pode expirar entre a abertura da tela e o envio — a sessão de
  // recuperação também tem prazo. Por isso o estado inválido considera as duas
  // coisas, e não só a autorização inicial.
  const semLink = !autorizado || (falhou && resultado.codigo === CodigoErro.TOKEN_INVALIDO);

  if (concluido) {
    return (
      <>
        <div className={estilos.cabecalho}>
          <span className={estilos.overline}>{SENHA.concluidoOverline}</span>
          <h1 className={estilos.titulo}>{SENHA.concluidoTitulo}</h1>
          <p className={estilos.texto}>{SENHA.concluidoTexto}</p>
        </div>

        <BotaoLink href={hrefDoLogin} blocoInteiro>
          {SENHA.irAoLogin}
        </BotaoLink>
      </>
    );
  }

  if (semLink) {
    return (
      <>
        <div className={estilos.cabecalho}>
          <span className={estilos.overlineAlerta}>{SENHA.invalidoOverline}</span>
          <h1 className={estilos.tituloFrase}>{SENHA.invalidoTitulo}</h1>
          <p className={estilos.texto}>{SENHA.invalidoTexto}</p>
        </div>

        <div className={estilos.acoes}>
          <BotaoLink href={hrefDaRecuperacao} blocoInteiro>
            {SENHA.reiniciar}
          </BotaoLink>
          <BotaoLink href={hrefDoLogin} variante="secundario" blocoInteiro>
            {SENHA.voltarAoLogin}
          </BotaoLink>
        </div>
      </>
    );
  }

  const erroDeCampo = (campo: string): string | undefined => {
    if (!falhou) return undefined;
    const motivo = resultado.campos?.[campo];
    if (motivo !== undefined) return TEXTO_DO_MOTIVO[motivo];
    if (resultado.campo === campo && resultado.codigo === CodigoErro.SENHA_FRACA) {
      return SENHA.erroSenhaFraca;
    }
    return undefined;
  };

  return (
    <>
      <div className={estilos.cabecalho}>
        <span className={estilos.overline}>{SENHA.redefinirOverline}</span>
        <h1 className={estilos.titulo}>{SENHA.redefinirTitulo}</h1>
        <p className={estilos.texto}>{SENHA.redefinirTexto}</p>
      </div>

      <form action={enviar} className={estilos.campos} noValidate>
        <div className={estilos.blocoSenha}>
          <Campo
            name="senha"
            type={senhaVisivel ? 'text' : 'password'}
            rotulo={SENHA.rotuloNovaSenha}
            placeholder={SENHA.placeholderNovaSenha}
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
                aria-label={senhaVisivel ? SENHA.ocultarSenha : SENHA.mostrarSenha}
                title={senhaVisivel ? SENHA.ocultarSenha : SENHA.mostrarSenha}
              >
                <IconeOlho riscado={senhaVisivel} />
              </button>
            }
          />

          <MedidorDeSenha
            senha={senha}
            rotulos={SENHA.forcaDaSenha}
            requisitos={{ tamanho: SENHA.requisitoTamanho, numero: SENHA.requisitoNumero }}
          />
        </div>

        <Campo
          name="confirmar"
          type={senhaVisivel ? 'text' : 'password'}
          rotulo={SENHA.rotuloConfirmar}
          placeholder={SENHA.placeholderConfirmar}
          autoComplete="new-password"
          required
          erro={erroDeCampo('confirmar')}
        />

        <Botao type="submit" carregando={pendente} blocoInteiro>
          {pendente ? SENHA.redefinindo : SENHA.redefinirEnviar}
        </Botao>
      </form>
    </>
  );
}
