import 'server-only';

/**
 * Único ponto que toca a equipe administrativa — módulo 27.
 *
 * Quase tudo aqui é **RPC**, e por duas razões diferentes:
 *
 *  · A leitura, porque `perfil` não tem e-mail (ele vive em `auth.users`) e
 *    porque a lista une `membro_admin` com `convite_admin` pendente.
 *  · As escritas, porque o `motivo` da auditoria vive em
 *    `current_setting('dissona.motivo')`, que só existe dentro de uma
 *    transação — e pelo PostgREST cada `update` é a sua própria transação, sem
 *    onde marcá-la.
 *
 * Ver o cabeçalho da migration `0003d`, que enumera as quatro lacunas que ela
 * fecha.
 *
 * A **única** coisa que usa a chave de serviço é o convite pelo Auth
 * (`inviteUserByEmail`), porque criar conta em `auth.users` é operação
 * administrativa do Auth por definição.
 */

import { criarClienteDeServico } from '@/lib/supabase/servico';
import { criarClienteServidor } from '@/lib/supabase/servidor';
import { estourarSeErro } from '@/lib/supabase/erros';

import type { CelulaDaMatriz, LinhaDaEquipe, NivelDeAcesso, PapelAdmin } from './tipos';
import { NivelDeAcesso as Nivel, nivelDe } from './tipos';

/**
 * A lista de equipe (27.2).
 *
 * Os tipos gerados dizem que nenhuma coluna de `returns table` é nula, e
 * mentem — é a mesma armadilha documentada em `lib/papeis.ts`. `membro_id`,
 * `convite_id`, `nome`, `cargo` e `expira_em` são nulos por desenho: a linha é
 * um integrante **ou** um convite.
 */
export async function lerEquipe(): Promise<readonly LinhaDaEquipe[]> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.rpc('ler_equipe_admin');
  estourarSeErro(error);

  return (data ?? []).map((linha) => ({
    membroId: linha.membro_id,
    conviteId: linha.convite_id,
    perfilId: linha.perfil_id,
    nome: linha.nome,
    email: linha.email,
    cargo: linha.cargo,
    papelAdmin: linha.papel_admin,
    situacao: linha.situacao,
    expiraEm: linha.expira_em,
    souEu: linha.sou_eu,
  }));
}

export async function alterarPapel(
  membroId: string,
  papel: PapelAdmin,
  motivo: string,
): Promise<void> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase.rpc('alterar_papel_do_membro', {
    p_membro_id: membroId,
    p_papel: papel,
    p_motivo: motivo,
  });
  estourarSeErro(error);
}

export async function alterarAcesso(
  membroId: string,
  ativo: boolean,
  motivo: string,
): Promise<void> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase.rpc('alterar_acesso_do_membro', {
    p_membro_id: membroId,
    p_ativo: ativo,
    p_motivo: motivo,
  });
  estourarSeErro(error);
}

export type ConviteEmitido = {
  readonly conviteId: string;
  /** O token em claro. Existe **uma** vez: vai para o e-mail e não se guarda. */
  readonly token: string;
  readonly expiraEm: string;
};

/**
 * Emite o convite no nosso banco (27.3).
 *
 * Devolve o token em claro, que o banco não guarda — lá fica só o `sha256`
 * (0003b). Reenviar substitui o pendente e **rotaciona** o token, que é o
 * comportamento certo: o link antigo pode ter ido para a caixa errada.
 */
export async function emitirConvite(email: string, papel: PapelAdmin): Promise<ConviteEmitido> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.rpc('criar_convite_admin', {
    p_email: email,
    p_papel_admin: papel,
  });
  estourarSeErro(error);

  const linha = data?.[0];
  if (linha === undefined) throw new Error('criar_convite_admin nao devolveu o convite.');

  return { conviteId: linha.convite_id, token: linha.token, expiraEm: linha.expira_em };
}

export type ResultadoDoConviteNoAuth = 'ok' | 'ja_tem_conta' | 'limite_de_envio';

/**
 * Cria a conta no Auth e manda o e-mail de convite (27.3).
 *
 * `inviteUserByEmail` faz as duas coisas: cria a linha em `auth.users` com o
 * e-mail já confirmado e envia o convite. É por isso que o `redirectTo` leva o
 * **nosso** token — a pessoa chega autenticada em `/admin/convite`, e o que
 * falta é aceitar o nosso convite e definir a senha.
 *
 * `ja_tem_conta` não é erro de fluxo: quem já é artista na plataforma pode ser
 * convidado para a equipe. Nesse caso não há conta a criar, o Auth recusa, e o
 * nosso convite (que já foi emitido) continua valendo — a pessoa entra com a
 * senha que já tem e o link a leva ao aceite.
 */
export async function convidarPeloAuth(
  email: string,
  urlDeRetorno: string,
): Promise<ResultadoDoConviteNoAuth> {
  const supabase = criarClienteDeServico();

  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: urlDeRetorno,
  });

  if (error !== null) {
    if (error.code === 'email_exists' || error.code === 'user_already_exists') {
      return 'ja_tem_conta';
    }
    if (error.code === 'over_email_send_rate_limit' || error.status === 429) {
      return 'limite_de_envio';
    }
    throw error;
  }

  return 'ok';
}

/** Aceita o convite e cria o vínculo administrativo — o único caminho (0003). */
export async function aceitarConvite(token: string): Promise<void> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase.rpc('aceitar_convite_admin', { p_token: token });
  estourarSeErro(error);
}

/* ------------------------------------------------- matriz de permissões ---- */

/**
 * A matriz inteira (27.4).
 *
 * Leitura direta da tabela, e não RPC: a policy `permissao_admin: equipe le a
 * matriz` já libera para `e_admin()`, e a tabela não tem coluna escondida em
 * outro schema. RPC aqui seria maquinário sem razão.
 */
export async function lerMatriz(): Promise<readonly CelulaDaMatriz[]> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('permissao_admin')
    .select('papel_admin, modulo, pode_ler, pode_escrever');
  estourarSeErro(error);

  return (data ?? []).map((linha) => ({
    papel: linha.papel_admin,
    modulo: linha.modulo,
    nivel: nivelDe(linha.pode_ler, linha.pode_escrever),
  }));
}

export type CelulaParaGravar = {
  readonly papel: PapelAdmin;
  readonly modulo: string;
  readonly nivel: NivelDeAcesso;
};

/**
 * Grava a matriz numa transação (27.4).
 *
 * A RPC recebe `jsonb` porque a tela tem **um** Salvar para as dezesseis
 * células: uma chamada por célula daria dezesseis transações, e uma falha no
 * meio deixaria a matriz metade nova e metade velha.
 */
export async function gravarMatriz(
  celulas: readonly CelulaParaGravar[],
  motivo: string,
): Promise<number> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.rpc('definir_permissoes_admin', {
    p_permissoes: celulas.map((celula) => ({
      papel: celula.papel,
      modulo: celula.modulo,
      pode_ler: celula.nivel !== Nivel.NENHUM,
      pode_escrever: celula.nivel === Nivel.ESCREVER,
    })),
    p_motivo: motivo,
  });
  estourarSeErro(error);

  return data ?? 0;
}

/* -------------------------------------------------------- dados pessoais --- */

export type MeusDadosDeMembro = {
  readonly nome: string;
  readonly cargo: string | null;
  readonly papelAdmin: PapelAdmin;
  readonly senhaAlteradaEm: string | null;
  readonly fotoCaminho: string | null;
  /** Cache-buster da URL pública: o nome do objeto é fixo. */
  readonly atualizadoEm: string | null;
};

/**
 * Nome, cargo e a data da última troca de senha (27.1).
 *
 * Duas tabelas, e as duas pela RLS do próprio dono: `perfil` tem a policy "dono
 * atualiza a propria linha", e `membro_admin` tem "proprio membro e a equipe
 * leem". Nenhuma RPC é necessária para **ler**.
 */
export async function lerMeusDados(perfilId: string): Promise<MeusDadosDeMembro | null> {
  const supabase = await criarClienteServidor();

  const [perfil, membro] = await Promise.all([
    supabase
      .from('perfil')
      .select('nome_completo, senha_alterada_em, foto_caminho, atualizado_em')
      .eq('id', perfilId)
      .maybeSingle(),
    supabase
      .from('membro_admin')
      .select('cargo, papel_admin')
      .eq('perfil_id', perfilId)
      .maybeSingle(),
  ]);

  estourarSeErro(perfil.error);
  estourarSeErro(membro.error);

  if (perfil.data === null || membro.data === null) return null;

  return {
    nome: perfil.data.nome_completo,
    cargo: membro.data.cargo,
    papelAdmin: membro.data.papel_admin,
    senhaAlteradaEm: perfil.data.senha_alterada_em,
    fotoCaminho: perfil.data.foto_caminho,
    atualizadoEm: perfil.data.atualizado_em,
  };
}

/** O nome é do `perfil`, que o dono atualiza pela própria policy. */
export async function salvarMeuNome(
  perfilId: string,
  nome: string,
  fotoCaminho: string | null = null,
): Promise<void> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from('perfil')
    .update({
      nome_completo: nome,
      // Só quando veio foto nova: `null` é "não mandou nada", e gravá-lo
      // apagaria a foto de quem só corrigiu o nome.
      ...(fotoCaminho === null ? {} : { foto_caminho: fotoCaminho }),
    })
    .eq('id', perfilId);
  estourarSeErro(error);
}

/**
 * O cargo é de `membro_admin`, cuja policy de update exige
 * `tem_permissao('equipe', true)` — então quem é `suporte` não conseguiria
 * salvar o próprio. A RPC `atualizar_meu_cargo` (0003d/0003e) toca **uma**
 * coluna e resolve isso sem abrir `papel_admin` nem `ativo`.
 */
export async function salvarMeuCargo(cargo: string): Promise<void> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase.rpc('atualizar_meu_cargo', { p_cargo: cargo });
  estourarSeErro(error);
}
