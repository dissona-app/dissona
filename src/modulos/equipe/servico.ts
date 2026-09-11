import 'server-only';

/**
 * Regra da equipe administrativa — módulo 27.
 *
 * O que este arquivo protege é a **ordem** do convite, que tem duas metades em
 * sistemas diferentes:
 *
 *  1. o nosso `convite_admin`, com o token que autoriza o aceite;
 *  2. a conta no Auth, que é quem manda o e-mail.
 *
 * A ordem importa e é esta: emitir o nosso convite **primeiro**. Se o e-mail
 * falhar, existe um convite pendente que a tela mostra e o botão "Reenviar"
 * resolve. Na ordem inversa haveria conta criada no Auth sem convite nenhum —
 * uma pessoa que recebe e-mail, clica, e chega a uma tela que não a reconhece.
 */

import { usuarioAtual } from '@/lib/supabase/servidor';
import { registrarTrocaDeSenha, trocarSenha } from '@/modulos/autenticacao/repositorio';
import { lerPermissao, ModuloAdmin } from '@/modulos/admin/permissoes';
import { notificarEquipeAdmin } from '@/modulos/notificacao/servico';
import { EventoNotificacao } from '@/modulos/notificacao/tipos';

import {
  aceitarConvite,
  alterarAcesso,
  alterarPapel,
  convidarPeloAuth,
  emitirConvite,
  gravarMatriz,
  lerEquipe,
  lerMatriz,
  lerMeusDados,
  salvarMeuCargo,
  salvarMeuNome,
} from './repositorio';
import type { CelulaParaGravar, MeusDadosDeMembro } from './repositorio';
import type { CelulaDaMatriz, LinhaDaEquipe, PapelAdmin } from './tipos';
import { MODULOS_DA_MATRIZ, celulaTravada } from './tipos';

/** As duas negações que a guarda de permissão produz, sem o `ok` de ninguém. */
export type FalhaDeEquipe =
  { readonly estado: 'sem_sessao' } | { readonly estado: 'sem_permissao' };

export type ResultadoDaEquipe = { readonly estado: 'ok' } | FalhaDeEquipe;

/**
 * Terceira camada de autorização (architecture §5.2).
 *
 * As RPCs da `0003d` já checam `tem_permissao('equipe', true)` e a RLS também —
 * esta é a terceira, e serve para a tela receber `sem_permissao` em vez de um
 * `DS020` cru. Ela não substitui as outras duas: substituí-las seria mover a
 * fronteira do banco para o código.
 */
type GuardaDeEquipe =
  | { readonly ok: true; readonly usuarioId: string }
  | { readonly ok: false; readonly falha: FalhaDeEquipe };

async function exigirGestaoDeEquipe(): Promise<GuardaDeEquipe> {
  const usuario = await usuarioAtual();
  if (usuario === null) return { ok: false, falha: { estado: 'sem_sessao' } };

  const { podeEscrever } = await lerPermissao(ModuloAdmin.EQUIPE);
  if (!podeEscrever) return { ok: false, falha: { estado: 'sem_permissao' } };

  return { ok: true, usuarioId: usuario.id };
}

/* ------------------------------------------------------------- leituras --- */

export async function lerEquipeDaConta(): Promise<readonly LinhaDaEquipe[]> {
  return lerEquipe();
}

export async function lerMatrizDePermissoes(): Promise<readonly CelulaDaMatriz[]> {
  return lerMatriz();
}

export async function lerMeusDadosDeMembro(): Promise<MeusDadosDeMembro | null> {
  const usuario = await usuarioAtual();
  if (usuario === null) return null;
  return lerMeusDados(usuario.id);
}

/* -------------------------------------------------------------- convite --- */

export type ResultadoDoConvite =
  | { readonly estado: 'ok'; readonly token: string; readonly jaTinhaConta: boolean }
  | { readonly estado: 'limite_de_envio' }
  | FalhaDeEquipe;

/**
 * Convida um membro (27.3).
 *
 * O token em claro volta no resultado por uma razão prática e temporária: com o
 * SMTP embutido do Supabase (~2 e-mails por hora), o e-mail de convite é a
 * parte mais frágil do fluxo, e o link tem de existir em algum lugar que quem
 * convidou alcance. A tela o mostra **uma** vez, para copiar e mandar por
 * outro canal se o e-mail não chegar.
 *
 * Isso sai quando houver provedor real ([#10](docs/open-questions.md)). Não é
 * um vazamento — quem vê o link é quem acabou de emiti-lo, e é a mesma pessoa
 * que poderia reemiti-lo a qualquer momento.
 */
export async function convidarMembro(
  email: string,
  papel: PapelAdmin,
  urlDeRetorno: string,
): Promise<ResultadoDoConvite> {
  const guarda = await exigirGestaoDeEquipe();
  if (!guarda.ok) return guarda.falha;

  // Primeiro o nosso convite: ver o cabeçalho deste arquivo sobre a ordem.
  const convite = await emitirConvite(email, papel);

  const urlComToken = `${urlDeRetorno}?token=${encodeURIComponent(convite.token)}`;
  const noAuth = await convidarPeloAuth(email, urlComToken);

  if (noAuth === 'limite_de_envio') {
    // O convite ficou emitido de propósito: a tela mostra a linha pendente e o
    // "Reenviar" resolve quando a janela do limite passar. Apagá-lo aqui
    // perderia o token que a pessoa pode copiar agora.
    return { estado: 'limite_de_envio' };
  }

  await notificarEquipeAdmin(EventoNotificacao.CONVITE_MEMBRO_ENVIADO, {
    email,
    papel,
  });

  return { estado: 'ok', token: convite.token, jaTinhaConta: noAuth === 'ja_tem_conta' };
}

export type ResultadoDoAceite =
  | { readonly estado: 'ok' }
  | { readonly estado: 'sem_sessao' }
  | { readonly estado: 'token_invalido' }
  | { readonly estado: 'senha_fraca' };

/**
 * Aceita o convite (27.3).
 *
 * `aceitar_convite_admin` é o **único** caminho para o papel `admin`: a policy
 * de `papel_usuario` barra o próprio dono de se dar esse papel, e a RPC confere
 * que o convite pertence ao e-mail da sessão. Um link vazado não vira acesso
 * na conta de quem o encontrou.
 */
export async function aceitarConviteDaEquipe(
  token: string,
  novaSenha: string,
): Promise<ResultadoDoAceite> {
  const usuario = await usuarioAtual();
  if (usuario === null) return { estado: 'sem_sessao' };

  try {
    await aceitarConvite(token);
  } catch {
    // Convite inexistente, já usado, expirado ou de outra conta. As quatro
    // causas viram a mesma resposta: distingui-las diria a quem tem o link se
    // ele é válido para **outra** pessoa.
    return { estado: 'token_invalido' };
  }

  // A senha vem **depois** do aceite, e a ordem é deliberada.
  //
  // `inviteUserByEmail` cria a conta sem senha: quem clica no link entra por
  // magic link. Aceitando primeiro, um token ruim — que é a falha comum — não
  // muda nada. Na ordem inversa, um token ruim deixaria uma senha definida numa
  // conta que não é da equipe: um estado que ninguém pediu e que nada explica.
  //
  // Se a senha falhar depois do aceite, a pessoa é integrante sem senha, e o
  // "Esqueci minha senha" do login administrativo resolve — um caminho que já
  // existe, ao contrário do outro.
  if ((await trocarSenha(novaSenha)) === 'senha_fraca') return { estado: 'senha_fraca' };

  await registrarTrocaDeSenha(usuario.id);

  // Sem notificação de aceite: o registro de eventos (semeado na `0005`) não
  // tem um, e o protótipo não pede. Inventar `convite_aceito` aqui quebraria o
  // teste de deriva de `modulos/notificacao/__testes__/eventos.test.ts`, que
  // existe justamente para o código e o seed não divergirem — e o evento certo
  // é decisão da matriz de notificações, não desta tela.
  return { estado: 'ok' };
}

/* --------------------------------------------------------- integrantes ---- */

export async function alterarPapelDoMembro(
  membroId: string,
  papel: PapelAdmin,
  motivo: string,
): Promise<ResultadoDaEquipe> {
  const guarda = await exigirGestaoDeEquipe();
  if (!guarda.ok) return guarda.falha;

  await alterarPapel(membroId, papel, motivo);
  return { estado: 'ok' };
}

export async function alterarAcessoDoMembro(
  membroId: string,
  ativo: boolean,
  motivo: string,
): Promise<ResultadoDaEquipe> {
  const guarda = await exigirGestaoDeEquipe();
  if (!guarda.ok) return guarda.falha;

  await alterarAcesso(membroId, ativo, motivo);
  return { estado: 'ok' };
}

/* ------------------------------------------------------------- matriz ----- */

/**
 * Grava a matriz (27.4).
 *
 * Filtra as células travadas **antes** de mandar: a RPC as recusa com `DS020`,
 * e mandar as dezesseis faria toda gravação falhar na primeira linha do
 * `administrador`. As travadas não são editáveis na tela; o filtro aqui é o que
 * torna o Salvar possível sem afrouxar a regra do banco.
 *
 * As células de `pacotes` e `configuracao` não chegam aqui — a tela do protótipo
 * tem quatro módulos, e a divergência está registrada (#7c). Elas seguem
 * governadas pelo seed da `0003`, e não zeradas por omissão.
 */
export async function gravarMatrizDePermissoes(
  celulas: readonly CelulaParaGravar[],
  motivo: string,
): Promise<ResultadoDaEquipe> {
  const guarda = await exigirGestaoDeEquipe();
  if (!guarda.ok) return guarda.falha;

  const editaveis = celulas.filter(
    (celula) =>
      !celulaTravada(celula.papel, celula.modulo) &&
      (MODULOS_DA_MATRIZ as readonly string[]).includes(celula.modulo),
  );

  if (editaveis.length > 0) {
    await gravarMatriz(editaveis, motivo);
    await notificarEquipeAdmin(EventoNotificacao.PERMISSOES_ALTERADAS, {
      celulas: editaveis.length,
    });
  }

  return { estado: 'ok' };
}

/* ------------------------------------------------------ dados pessoais ---- */

export type ResultadoDosDados =
  | { readonly estado: 'ok' }
  | { readonly estado: 'sem_sessao' }
  | { readonly estado: 'sem_vinculo' };

/**
 * Salva nome e cargo do próprio integrante (27.1).
 *
 * Duas escritas em tabelas diferentes, e **sem** exigir gestão de equipe: são
 * os dados da própria pessoa. O nome vai por policy de dono; o cargo por RPC,
 * porque a policy de `membro_admin` exige permissão de equipe e quem é
 * `suporte` não a tem (ver o cabeçalho da `0003d`).
 */
export async function salvarMeusDados(nome: string, cargo: string): Promise<ResultadoDosDados> {
  const usuario = await usuarioAtual();
  if (usuario === null) return { estado: 'sem_sessao' };

  await salvarMeuNome(usuario.id, nome);

  try {
    await salvarMeuCargo(cargo);
  } catch {
    // A RPC estoura `DS020` para quem não é da equipe administrativa. Chegar
    // aqui significa uma conta sem `membro_admin` numa tela que a guarda de
    // rota já restringe — então é sessão perdida, não erro de campo.
    return { estado: 'sem_vinculo' };
  }

  return { estado: 'ok' };
}
