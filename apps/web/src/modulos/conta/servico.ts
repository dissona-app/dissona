import 'server-only';

/**
 * Regra de credencial e de encerramento de conta — telas 7.2, 7.4, 17.2, 17.4
 * e 27.1.
 *
 * O que este arquivo protege é o **par reautenticação + efeito**: toda troca de
 * credencial exige a senha atual (RNF-004), e toda troca bem-sucedida encerra as
 * outras sessões. Separar as duas coisas seria deixar a porta aberta para uma
 * delas ser esquecida na próxima tela que trocar senha.
 */

import { zipSync, strToU8 } from 'fflate';

import { usuarioAtual } from '@/lib/supabase/servidor';
import {
  encerrarOutrasSessoes,
  encerrarSessao,
  registrarTrocaDeSenha,
  trocarSenha,
} from '@/modulos/autenticacao/repositorio';
import { notificar } from '@/modulos/notificacao/servico';
import { EventoNotificacao } from '@/modulos/notificacao/tipos';

import {
  conferirSenhaAtual,
  desativarConta,
  encerrarSessaoPorId,
  guardarExportacao,
  lerDadosParaExportacao,
  lerSessoes,
  pedirTrocaDeEmail,
} from './repositorio';
import type { SessaoAtiva } from './repositorio';

export type ResultadoDeCredencial =
  | { readonly estado: 'ok' }
  | { readonly estado: 'sem_sessao' }
  | { readonly estado: 'senha_atual_invalida' }
  | { readonly estado: 'senha_fraca' }
  | { readonly estado: 'email_ja_cadastrado' }
  | { readonly estado: 'limite_de_envio' };

/**
 * Troca a senha (7.4 / 17.4 / 27.1).
 *
 * Quatro efeitos, nesta ordem, e a ordem é a proteção:
 *
 *  1. **Confere a senha atual.** Sem isso, uma sessão roubada trocaria a senha
 *     e tomaria a conta — que é exatamente o que a reautenticação evita.
 *  2. **Troca.** Se falhar, nada do resto acontece.
 *  3. **Encerra as outras sessões.** É o que a copy promete em letras grandes,
 *     e é o ponto: quem tomou a conta perde o acesso. Depois da troca, porque
 *     derrubar sessões e falhar na troca seria o pior dos dois mundos.
 *  4. **Avisa por e-mail.** "Avisamos por e-mail" — e é o aviso que permite à
 *     pessoa reagir se não foi ela quem trocou.
 */
export async function trocarSenhaDaConta(
  senhaAtual: string,
  novaSenha: string,
): Promise<ResultadoDeCredencial> {
  const usuario = await usuarioAtual();
  if (usuario === null || usuario.email === undefined) return { estado: 'sem_sessao' };

  if (!(await conferirSenhaAtual(usuario.email, senhaAtual))) {
    return { estado: 'senha_atual_invalida' };
  }

  if ((await trocarSenha(novaSenha)) === 'senha_fraca') return { estado: 'senha_fraca' };

  await encerrarOutrasSessoes();
  await registrarTrocaDeSenha(usuario.id);
  await notificar(usuario.id, EventoNotificacao.CREDENCIAL_ALTERADA, { origem: 'senha' });

  return { estado: 'ok' };
}

/**
 * Pede a troca de e-mail (7.2 / 17.2 / 27.1).
 *
 * **Não** encerra as outras sessões, ao contrário da troca de senha — e a
 * diferença é deliberada. Aqui nada mudou ainda: o e-mail só passa a valer
 * quando o link chegar à caixa nova. Derrubar sessões agora puniria a pessoa
 * por um pedido que talvez ela nem conclua.
 */
export async function trocarEmailDaConta(
  senhaAtual: string,
  novoEmail: string,
  urlDeRetorno: string,
): Promise<ResultadoDeCredencial> {
  const usuario = await usuarioAtual();
  if (usuario === null || usuario.email === undefined) return { estado: 'sem_sessao' };

  if (!(await conferirSenhaAtual(usuario.email, senhaAtual))) {
    return { estado: 'senha_atual_invalida' };
  }

  const resultado = await pedirTrocaDeEmail(novoEmail, urlDeRetorno);
  if (resultado === 'email_ja_cadastrado') return { estado: 'email_ja_cadastrado' };
  if (resultado === 'limite_de_envio') return { estado: 'limite_de_envio' };

  await notificar(usuario.id, EventoNotificacao.CREDENCIAL_ALTERADA, { origem: 'email' });

  return { estado: 'ok' };
}

export async function lerSessoesDaConta(): Promise<readonly SessaoAtiva[]> {
  const usuario = await usuarioAtual();
  if (usuario === null) return [];
  return lerSessoes();
}

export async function encerrarUmaSessao(sessaoId: string): Promise<boolean> {
  return encerrarSessaoPorId(sessaoId);
}

/* ------------------------------------------------- exclusão de conta ------ */

export type ResultadoDaExportacao =
  | { readonly estado: 'ok'; readonly url: string; readonly nome: string }
  | { readonly estado: 'sem_sessao' };

/**
 * Passo 1 da exclusão — "Leve seus dados antes" (RF-024).
 *
 * Um `.zip` com um `.json` por conjunto, e um `LEIA-ME.txt` explicando o que é
 * cada arquivo. JSON e não CSV porque os dados são aninhados e heterogêneos —
 * um CSV de `faixa` perderia o que não é escalar, e a promessa é levar os
 * dados, não uma versão achatada deles.
 *
 * `fflate` e não `archiver`: ele é síncrono, sem dependência nativa, e o
 * conteúdo cabe todo em memória — são os dados de **uma** conta. Um zip em
 * streaming seria a escolha certa se fossem os dados de todas.
 */
export async function exportarDados(): Promise<ResultadoDaExportacao> {
  const usuario = await usuarioAtual();
  if (usuario === null) return { estado: 'sem_sessao' };

  const dados = await lerDadosParaExportacao(usuario.id);

  const arquivos: Record<string, Uint8Array> = {
    'LEIA-ME.txt': strToU8(LEIA_ME),
  };
  for (const [chave, valor] of Object.entries(dados)) {
    arquivos[`${chave}.json`] = strToU8(JSON.stringify(valor, null, 2));
  }

  const nome = `dissona-dados-${usuario.id}.zip`;
  const url = await guardarExportacao(usuario.id, zipSync(arquivos), nome);

  return { estado: 'ok', url, nome };
}

const LEIA_ME = `Exportação de dados — Dissona

Este arquivo contém os dados da sua conta, no formato em que o sistema os
guarda. Um arquivo .json por conjunto:

  perfil.json               seus dados de conta
  perfil_artista.json       seu perfil público de artista, se você tem o papel
  perfil_curador.json       seu cadastro de curador, se você tem o papel
  faixas.json               as faixas que você enviou para curadoria
  historico_de_claves.json  seu extrato de Claves, movimento a movimento

O que NÃO está aqui, e por quê:

  As devolutivas escritas por curadores sobre suas faixas pertencem também a
  quem as escreveu, e o texto delas é trabalho autoral de outra pessoa. Você as
  lê na plataforma, no detalhe de cada faixa.

O link deste arquivo vale 24 horas. Depois disso, gere outro em
Configurações › Segurança.
`;

export type ResultadoDaExclusao =
  | { readonly estado: 'ok' }
  | { readonly estado: 'sem_sessao' }
  | { readonly estado: 'senha_atual_invalida' };

/**
 * Passo 2 da exclusão — "Confirmar a exclusão" (RF-024).
 *
 * Senha atual **e** a palavra `EXCLUIR`: as duas coisas, como o protótipo pede.
 * A senha prova quem é; a palavra prova que a pessoa leu o que vai acontecer.
 * Uma sem a outra transformaria um clique acidental numa conta desativada.
 *
 * A conta é **desativada**, não apagada: "desativamos a conta agora e apagamos
 * em 30 dias", e nesse prazo entrar de novo reverte. Quem apaga é o job
 * `expurgar_contas_excluidas` (0011), que **anonimiza** em vez de deletar,
 * porque o extrato de Claves é append-only e há retenção fiscal — decisão
 * registrada em [open-questions #27](docs/open-questions.md), pendente do
 * jurídico.
 *
 * A sessão é encerrada ao fim: deixar a pessoa navegando numa conta que ela
 * acabou de excluir seria confuso, e a guarda de rota a mandaria ao login no
 * clique seguinte de qualquer forma.
 */
export async function excluirConta(senhaAtual: string): Promise<ResultadoDaExclusao> {
  const usuario = await usuarioAtual();
  if (usuario === null || usuario.email === undefined) return { estado: 'sem_sessao' };

  if (!(await conferirSenhaAtual(usuario.email, senhaAtual))) {
    return { estado: 'senha_atual_invalida' };
  }

  await desativarConta(usuario.id);
  await encerrarSessao();

  return { estado: 'ok' };
}
