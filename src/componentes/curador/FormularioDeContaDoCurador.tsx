'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Botao } from '@/componentes/base/Botao';
import { Campo } from '@/componentes/base/Campo';
import { CampoDeFoto } from '@/componentes/base/CampoDeFoto';
import { MedidorDeSenha } from '@/componentes/base/MedidorDeSenha';
import { IconeOlho } from '@/componentes/autenticacao/IconeOlho';
import type { Banner } from '@/componentes/autenticacao/FormularioDeLogin';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { CodigoErro } from '@/lib/erros';
import { ROTA } from '@/lib/guarda-rota';
import { CURADOR_CADASTRO } from '@/textos/curador';
import { erroGeralDe } from '@/textos/erros';
import { CADASTRAR } from '@/textos/prototipo';

import estilos from './FormularioDeContaDoCurador.module.css';

const ESTADO_INICIAL: ResultadoDeAcao | null = null;

/**
 * "Dados básicos" — passo 1 do wizard sem sessão (`docs/R2/extraido/Curador.html`).
 *
 * Não é `FormularioDeCadastro`: o protótipo não tem "Confirmar senha" nem o
 * checkbox de Termos neste passo — só Nome completo, E-mail e Senha. Decisão
 * do cliente em 2026-09-22 de seguir o protótipo aqui; RF-003 (confirmação +
 * aceite obrigatórios) continua valendo para `/cadastrar` e
 * `/artista/cadastrar`. Ver `esquemaCadastroCurador` e
 * `docs/prd/07-pendencias-e-divergencias.md`.
 *
 * A foto **sobe pelo servidor**, e não pelo navegador. `useUploadDireto`
 * precisa de `usuarioId` para montar o caminho no bucket, e enquanto a pessoa
 * escolhe o arquivo a conta ainda não existe — então ele não acha sessão,
 * deixa o arquivo no formulário e o `multipart` de sempre o leva à Server
 * Action, que já tem sessão quando chega a hora de gravar. É o mesmo caminho
 * de baixo que o `CampoDeFoto` mantém para quem está sem JavaScript
 * (`resolverArquivoDoFormulario`), aqui usado como caminho principal.
 *
 * `nome` alimenta as iniciais do avatar em tempo real — é o que o protótipo
 * mostra enquanto ninguém escolheu foto nenhuma.
 */
export function FormularioDeContaDoCurador({
  acao,
}: {
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
}) {
  const [resultado, enviar, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acao(dados),
    ESTADO_INICIAL,
  );

  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  // Enviar com a foto ainda subindo mandaria `foto_caminho` vazio — mesma
  // trava do passo 1 do wizard (`Passo1Dados`).
  const [subindoFoto, setSubindoFoto] = useState(false);

  const falhou = resultado !== null && !resultado.ok;

  const erroDeCampo = (campo: string): string | undefined => {
    if (!falhou) return undefined;
    const motivo = resultado.campos?.[campo];
    if (motivo !== undefined) return TEXTO_DO_MOTIVO[motivo] ?? CADASTRAR.erroEmailInvalido;
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
            <Link className={estilos.bannerLink} href={ROTA.CURADOR_ENTRAR}>
              {CADASTRAR.bannerEmailExistente.acao}
            </Link>
          ),
        }
      : resultado.codigo === CodigoErro.LIMITE_DE_ENVIO
        ? CADASTRAR.bannerLimite
        : null;

  const erroDaFoto =
    falhou && resultado.campo === 'foto'
      ? resultado.codigo === CodigoErro.FORMATO_NAO_SUPORTADO
        ? CURADOR_CADASTRO.erroFotoTipo
        : CURADOR_CADASTRO.erroFotoTamanho
      : undefined;

  const erroGeral = erroGeralDe(
    falhou ? resultado : null,
    [erroDeCampo('nome'), erroDeCampo('email'), erroDeCampo('senha'), erroDaFoto],
    banner !== null,
  );

  return (
    <form action={enviar} className={estilos.campos} noValidate>
      {banner !== null ? (
        <Aviso tom="erro" titulo={banner.titulo} acao={banner.acao}>
          {banner.texto}
        </Aviso>
      ) : null}
      {erroGeral === undefined ? null : <Aviso tom="erro">{erroGeral}</Aviso>}
      {erroDaFoto === undefined ? null : <Aviso tom="erro">{erroDaFoto}</Aviso>}

      <CampoDeFoto
        nome={nome}
        aoMudarEnvio={setSubindoFoto}
        tamanhoDoBotao="sm"
        textos={{
          botao: CURADOR_CADASTRO.adicionarFoto,
          hint: CURADOR_CADASTRO.fotoHint,
          enviando: CURADOR_CADASTRO.fotoEnviando,
          enviada: CURADOR_CADASTRO.fotoEnviada,
          erroTipo: CURADOR_CADASTRO.erroFotoTipo,
          erroTamanho: CURADOR_CADASTRO.erroFotoTamanho,
        }}
      />

      <Campo
        name="nome"
        type="text"
        rotulo={CADASTRAR.rotuloNome}
        placeholder={CURADOR_CADASTRO.placeholderNome}
        autoComplete="name"
        required
        value={nome}
        onChange={(evento) => setNome(evento.target.value)}
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

      <div className={estilos.rodape}>
        <Link className={estilos.voltar} href={ROTA.CURADOR_ENTRAR}>
          {CURADOR_CADASTRO.voltarAoLogin}
        </Link>
        <Botao type="submit" tamanho="denso" carregando={pendente} disabled={subindoFoto}>
          {pendente ? CADASTRAR.enviando : CURADOR_CADASTRO.continuar}
        </Botao>
      </div>
    </form>
  );
}

/** Tradução dos códigos de campo — mesma tabela de `FormularioDeCadastro`. */
const TEXTO_DO_MOTIVO: Readonly<Record<string, string>> = {
  nome_vazio: CADASTRAR.erroNomeVazio,
  email_vazio: CADASTRAR.erroEmailVazio,
  email_invalido: CADASTRAR.erroEmailInvalido,
  senha_fraca: CADASTRAR.erroSenhaFraca,
};
