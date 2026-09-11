import 'server-only';

/**
 * Único ponto que toca as tabelas do curador.
 *
 * Cinco tabelas — `perfil`, `perfil_curador`, `midia_curador`,
 * `servico_curador`, `credencial_curador` — mais dois buckets. Todas as
 * escritas passam pela sessão do próprio curador, e não pela service role: as
 * policies da `0002` já dizem "dono gerencia as próprias", e usar a chave de
 * serviço aqui trocaria a fronteira do banco por um `where` no código.
 *
 * A exceção que **não** existe: `classe`, `situacao` e `classificado_em` não
 * são escritos daqui. O trigger `proibir_autopromocao_de_classe` recusa, e o
 * único caminho é a RPC `concluir_cadastro_curador` (0002c).
 */

import { lerConfiguracao } from '@/lib/configuracao';
import { criarClienteServidor } from '@/lib/supabase/servidor';
import { estourarSeErro } from '@/lib/supabase/erros';

import type {
  CanalDoCurador,
  CredencialDoCurador,
  EstadoDoCadastro,
  PassoDoCadastro,
  ServicoDoCurador,
  TipoDeCredencial,
  TipoDeMidia,
  TipoDeServico,
} from './tipos';
import { ehPasso, TIPOS_DE_CREDENCIAL } from './tipos';

/**
 * O estado do wizard, numa ida.
 *
 * Cinco `select` numa chamada só, por `select` aninhado do PostgREST — o
 * `perfil_curador` traz as três coleções filhas. A alternativa seriam quatro
 * viagens a `us-west-2` para montar uma tela, e a tela 8 (revisão) precisa de
 * todas ao mesmo tempo.
 */
export async function lerEstadoDoCadastro(): Promise<EstadoDoCadastro | null> {
  const supabase = await criarClienteServidor();

  const { data: usuario } = await supabase.auth.getUser();
  if (usuario.user === null) return null;

  const [{ data, error }, minimoParaPrata] = await Promise.all([
    supabase
      .from('perfil_curador')
      .select(
        `id, passo_cadastro, bio, especialidade, generos, atuacao, tempo_atuacao,
         cadastro_concluido_em, classe, situacao,
         perfil:perfil_id (nome_completo, foto_caminho),
         midia_curador (id, tipo, nome, url, ativo),
         servico_curador (tipo, preco_claves, ativo),
         credencial_curador (tipo, url, anexo_caminho, verificavel)`,
      )
      .eq('perfil_id', usuario.user.id)
      .maybeSingle(),
    lerConfiguracao('classe.prata_min_credenciais'),
  ]);

  estourarSeErro(error);
  if (data === null) return null;

  const canais: readonly CanalDoCurador[] = data.midia_curador
    .filter((midia) => midia.ativo)
    .map((midia) => ({
      id: midia.id,
      tipo: midia.tipo,
      nome: midia.nome,
      url: midia.url,
    }));

  const servicos: readonly ServicoDoCurador[] = data.servico_curador.map((servico) => ({
    tipo: servico.tipo,
    precoClaves: Number(servico.preco_claves),
    ativo: servico.ativo,
  }));

  const credenciais: readonly CredencialDoCurador[] = data.credencial_curador
    .filter((credencial): credencial is typeof credencial & { tipo: TipoDeCredencial } =>
      (TIPOS_DE_CREDENCIAL as readonly string[]).includes(credencial.tipo),
    )
    .map((credencial) => ({
      tipo: credencial.tipo,
      url: credencial.url,
      anexoCaminho: credencial.anexo_caminho,
      verificavel: credencial.verificavel ?? false,
    }));

  return {
    perfilCuradorId: data.id,
    passoSalvo: ehPasso(data.passo_cadastro) ? data.passo_cadastro : 1,
    classe: data.classe,
    situacaoCurador: data.situacao,
    nome: data.perfil?.nome_completo ?? '',
    email: usuario.user.email ?? '',
    fotoCaminho: data.perfil?.foto_caminho ?? null,
    generos: data.generos ?? [],
    atuacao: data.atuacao ?? [],
    tempoAtuacao: data.tempo_atuacao,
    bio: data.bio,
    especialidade: data.especialidade,
    canais,
    servicos,
    credenciais,
    minimoParaPrata,
    concluido: data.cadastro_concluido_em !== null,
  };
}

/**
 * Avança o marcador de retomada.
 *
 * `passo_cadastro` só **sobe**: quem volta ao passo 3 para corrigir algo não
 * deve perder a marca de que já chegou ao 7. A retomada tem de levar de volta
 * ao ponto mais adiantado, senão corrigir um campo custaria repetir o wizard.
 */
export async function avancarPasso(perfilCuradorId: string, passo: PassoDoCadastro): Promise<void> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from('perfil_curador')
    .update({ passo_cadastro: passo })
    .eq('id', perfilCuradorId)
    .lt('passo_cadastro', passo);

  estourarSeErro(error);
}

export async function salvarGenerosDoCurador(
  perfilCuradorId: string,
  generos: readonly string[],
): Promise<void> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from('perfil_curador')
    .update({ generos: [...generos] })
    .eq('id', perfilCuradorId);
  estourarSeErro(error);
}

export async function salvarAtuacaoDoCurador(
  perfilCuradorId: string,
  atuacao: readonly string[],
  tempoAtuacao: string,
): Promise<void> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from('perfil_curador')
    .update({ atuacao: [...atuacao], tempo_atuacao: tempoAtuacao })
    .eq('id', perfilCuradorId);
  estourarSeErro(error);
}

export async function salvarBioDoCurador(
  perfilCuradorId: string,
  bio: string,
  especialidade: string,
): Promise<void> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from('perfil_curador')
    .update({
      // String vazia não é o mesmo que "não informado": a coluna é anulável, e
      // um `''` gravado faria a revisão do passo 8 exibir um campo preenchido
      // com nada.
      bio: bio === '' ? null : bio,
      especialidade: especialidade === '' ? null : especialidade,
    })
    .eq('id', perfilCuradorId);
  estourarSeErro(error);
}

export type CanalParaSalvar = {
  readonly tipo: TipoDeMidia;
  readonly nome: string;
  readonly url: string;
};

/**
 * Substitui a lista de canais.
 *
 * `delete` seguido de `insert`, e não um diff: a tela manda a lista inteira, e
 * casar linha por linha exigiria identidade estável nos campos do formulário —
 * complexidade que só se paga quando há algo pendurado na linha. Nada aponta
 * para `midia_curador` na R2; `salvamentos` é o único dado derivado, e ele
 * depende de uma integração da R3.
 *
 * A alteração de mídia **não** altera a classe (regras §2) — e é por isso que
 * este método não toca em `credencial_curador` nem chama a RPC.
 */
export async function substituirCanais(
  perfilCuradorId: string,
  canais: readonly CanalParaSalvar[],
): Promise<void> {
  const supabase = await criarClienteServidor();

  const { error: erroDoDelete } = await supabase
    .from('midia_curador')
    .delete()
    .eq('perfil_curador_id', perfilCuradorId);
  estourarSeErro(erroDoDelete);

  if (canais.length === 0) return;

  const { error: erroDoInsert } = await supabase.from('midia_curador').insert(
    canais.map((canal) => ({
      perfil_curador_id: perfilCuradorId,
      tipo: canal.tipo,
      nome: canal.nome,
      url: canal.url,
    })),
  );
  estourarSeErro(erroDoInsert);
}

/**
 * Insere **uma** mídia (12.6).
 *
 * A tela 12.6 é manutenção, não cadastro: a pessoa acrescenta uma playlist sem
 * reenviar as outras cinco. `substituirCanais` continua servindo o passo 4 do
 * wizard, onde a tela de fato manda a lista inteira — usá-lo aqui apagaria e
 * reinseriria tudo para acrescentar uma linha, e trocaria o `id` de mídias que
 * ninguém mexeu.
 */
export async function inserirCanal(perfilCuradorId: string, canal: CanalParaSalvar): Promise<void> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase.from('midia_curador').insert({
    perfil_curador_id: perfilCuradorId,
    tipo: canal.tipo,
    nome: canal.nome,
    url: canal.url,
  });
  estourarSeErro(error);
}

/**
 * Atualiza uma mídia (12.6).
 *
 * O `eq('perfil_curador_id', ...)` é redundante com a RLS — a policy da `0002`
 * já restringe ao dono — e fica de propósito: um `id` de outra pessoa vindo do
 * formulário não atualiza nada em vez de depender só da policy para isso.
 */
export async function atualizarCanal(
  perfilCuradorId: string,
  canalId: string,
  canal: CanalParaSalvar,
): Promise<void> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from('midia_curador')
    .update({ tipo: canal.tipo, nome: canal.nome, url: canal.url })
    .eq('id', canalId)
    .eq('perfil_curador_id', perfilCuradorId);
  estourarSeErro(error);
}

/**
 * Remove uma mídia (12.6).
 *
 * `delete` de verdade, e não `ativo = false`: nada aponta para
 * `midia_curador` na R2, e uma lista que acumula linhas invisíveis é uma lista
 * que um dia aparece por engano. A leitura já filtra por `ativo` para o caso de
 * a coluna passar a ser usada pela moderação (R3).
 */
export async function removerCanal(perfilCuradorId: string, canalId: string): Promise<void> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from('midia_curador')
    .delete()
    .eq('id', canalId)
    .eq('perfil_curador_id', perfilCuradorId);
  estourarSeErro(error);
}

export type ServicoParaSalvar = {
  readonly tipo: TipoDeServico;
  readonly precoClaves: number;
  readonly ativo: boolean;
};

/**
 * Grava os serviços — **sem** `delete`.
 *
 * `servico_curador` tem um trigger que recusa a remoção do `feedback` com
 * `DS012`, e está certo: `confirmar_selecao_curadores` (0010) exige um
 * `servico_envio` de feedback, e um curador contratável sem ele seria
 * contratável e imediatamente inutilizável.
 *
 * Então o que fazemos é `upsert` pelo par único `(perfil_curador_id, tipo)` e
 * `ativo = false` no que foi desmarcado. Desativar preserva o preço que a
 * pessoa já havia definido, o que importa quando ela religa o serviço depois.
 */
export async function salvarServicos(
  perfilCuradorId: string,
  servicos: readonly ServicoParaSalvar[],
): Promise<void> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase.from('servico_curador').upsert(
    servicos.map((servico) => ({
      perfil_curador_id: perfilCuradorId,
      tipo: servico.tipo,
      preco_claves: servico.precoClaves,
      ativo: servico.ativo,
    })),
    { onConflict: 'perfil_curador_id,tipo' },
  );

  estourarSeErro(error);
}

export type CredencialParaSalvar = {
  readonly tipo: TipoDeCredencial;
  readonly descricao: string;
  readonly url: string | null;
  readonly anexoCaminho: string | null;
};

/**
 * Substitui as credenciais.
 *
 * `delete` + `insert` como nos canais, e aqui há um motivo a mais: `verificavel`
 * é coluna **gerada** e não aceita escrita, então não há como "atualizar" uma
 * credencial para não comprovada — desmarcá-la é apagá-la.
 */
export async function substituirCredenciais(
  perfilCuradorId: string,
  credenciais: readonly CredencialParaSalvar[],
): Promise<void> {
  const supabase = await criarClienteServidor();

  const { error: erroDoDelete } = await supabase
    .from('credencial_curador')
    .delete()
    .eq('perfil_curador_id', perfilCuradorId);
  estourarSeErro(erroDoDelete);

  if (credenciais.length === 0) return;

  const { error: erroDoInsert } = await supabase.from('credencial_curador').insert(
    credenciais.map((credencial) => ({
      perfil_curador_id: perfilCuradorId,
      tipo: credencial.tipo,
      descricao: credencial.descricao,
      url: credencial.url,
      anexo_caminho: credencial.anexoCaminho,
    })),
  );
  estourarSeErro(erroDoInsert);
}

/**
 * Sobe um arquivo e devolve o caminho.
 *
 * O caminho **tem** de começar com o `auth.uid()`: as policies dos buckets
 * comparam `(storage.foldername(name))[1]` com ele (`0000_storage`). Um caminho
 * fora dessa forma é recusado, e a mensagem não diz por quê.
 *
 * `upsert: true` porque trocar a foto é sobrescrever, não acumular — e sem ele
 * a segunda troca falharia com "arquivo já existe".
 */
export async function subirArquivo(
  balde: 'avatares' | 'materiais',
  usuarioId: string,
  nomeBase: string,
  arquivo: File,
): Promise<string> {
  const supabase = await criarClienteServidor();

  const extensao = extensaoDe(arquivo);
  const caminho = `${usuarioId}/${nomeBase}${extensao}`;

  const { error } = await supabase.storage
    .from(balde)
    .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type });

  estourarSeErro(error);
  return caminho;
}

/** Extensão a partir do MIME, e não do nome — o nome vem do cliente. */
function extensaoDe(arquivo: File): string {
  if (arquivo.type === 'application/pdf') return '.pdf';
  if (arquivo.type === 'image/png') return '.png';
  return '.jpg';
}

export async function salvarFotoDoPerfil(usuarioId: string, caminho: string): Promise<void> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from('perfil')
    .update({ foto_caminho: caminho })
    .eq('id', usuarioId);
  estourarSeErro(error);
}

export type ResultadoDaClassificacao = {
  readonly classe: string;
  readonly situacao: string;
  readonly credenciaisVerificaveis: number;
  readonly minimoParaPrata: number;
};

/**
 * Fecha o cadastro (12.4 + 12.5).
 *
 * A RPC é o **único** caminho: o trigger `proibir_autopromocao_de_classe`
 * recusa qualquer escrita do próprio curador em `classe`/`situacao`, e
 * `security definer` não contorna isso — ele troca o dono da execução, não a
 * sessão. Ver o cabeçalho da `0002c`.
 */
export async function concluirCadastro(): Promise<ResultadoDaClassificacao> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.rpc('concluir_cadastro_curador').single();

  estourarSeErro(error);
  if (data === null) throw new Error('concluir_cadastro_curador não devolveu resultado.');

  return {
    classe: data.classe,
    situacao: data.situacao,
    credenciaisVerificaveis: data.credenciais_verificaveis,
    minimoParaPrata: data.minimo_para_prata,
  };
}
