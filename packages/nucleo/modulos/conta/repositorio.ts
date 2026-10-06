import 'server-only';

/**
 * Leituras e escritas de credencial e sessão — telas 7.2, 7.4, 17.2, 17.4 e
 * 27.1.
 *
 * As sessões vêm por RPC `security definer` (migration `0001d`), e não pela
 * service role: o schema `auth` não é exposto pelo PostgREST, e mesmo se fosse,
 * o filtro `user_id = auth.uid()` dentro do SQL é mais seguro que um `where` no
 * TypeScript — não há como esquecê-lo. Ver o cabeçalho da `0001d`.
 */

import { criarClienteServidor } from '@dissona/nucleo/lib/supabase/servidor';
import { estourarSeErro } from '@dissona/nucleo/lib/supabase/erros';

export type SessaoAtiva = {
  readonly id: string;
  readonly criadaEm: string;
  readonly vistoEm: string;
  /** `user_agent` cru — quem o traduz para "Chrome · Windows" é a View. */
  readonly agente: string | null;
  readonly ip: string | null;
  readonly atual: boolean;
};

export async function lerSessoes(): Promise<readonly SessaoAtiva[]> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.rpc('ler_sessoes_da_conta');
  estourarSeErro(error);

  return (data ?? []).map((linha) => ({
    id: linha.id,
    criadaEm: linha.criada_em,
    vistoEm: linha.visto_em,
    // Os tipos gerados não sabem que colunas de `returns table` podem ser
    // nulas — `user_agent` e `ip` são, para sessão criada por API sem
    // cabeçalho.
    agente: linha.agente,
    ip: linha.ip,
    atual: linha.atual,
  }));
}

/** `false` quando não havia o que encerrar — sessão já expirada, por exemplo. */
export async function encerrarSessaoPorId(sessaoId: string): Promise<boolean> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.rpc('encerrar_sessao_da_conta', {
    p_sessao_id: sessaoId,
  });
  estourarSeErro(error);

  return data === true;
}

/**
 * Confere a senha atual — a reautenticação de RNF-004.
 *
 * `signInWithPassword` com o próprio e-mail é o único jeito de verificar a
 * senha pelo SDK: não existe um `verifyPassword`. O efeito colateral é uma
 * sessão nova para a **mesma** conta, o que é inofensivo — e é justamente o que
 * torna o `signOut({ scope: 'others' })` seguinte capaz de derrubar as antigas
 * sem derrubar esta.
 *
 * Resposta binária de propósito: distinguir "senha errada" de qualquer outra
 * falha aqui não ajudaria quem está na tela e ajudaria quem estivesse
 * sondando.
 */
export async function conferirSenhaAtual(email: string, senha: string): Promise<boolean> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  return error === null;
}

export type ResultadoDaTrocaDeEmail = 'ok' | 'email_ja_cadastrado' | 'limite_de_envio';

/**
 * Pede a troca de e-mail.
 *
 * O endereço novo **não** passa a valer aqui: o Supabase envia um link de
 * confirmação para ele, e a troca só se efetiva quando o link é aberto. É
 * exatamente o que a copy promete — "o novo endereço passa a valer depois da
 * confirmação enviada para ele" —, e é o que impede alguém de tomar a conta
 * apontando-a para uma caixa que não controla.
 */
export async function pedirTrocaDeEmail(
  novoEmail: string,
  urlDeRetorno: string,
): Promise<ResultadoDaTrocaDeEmail> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase.auth.updateUser(
    { email: novoEmail },
    { emailRedirectTo: urlDeRetorno },
  );

  if (error !== null) {
    if (error.code === 'email_exists' || error.code === 'user_already_exists') {
      return 'email_ja_cadastrado';
    }
    if (error.code === 'over_email_send_rate_limit' || error.status === 429) {
      return 'limite_de_envio';
    }
    throw error;
  }

  return 'ok';
}

/**
 * Desativa a conta — passo 2 da exclusão (RF-024).
 *
 * `desativada`, e não `excluida`: a exclusão é reversível por 30 dias entrando
 * de novo, e é o job `expurgar_contas_excluidas` (0011) que fecha o ciclo. O
 * trigger `proibir_autoalteracao_de_situacao` (0001c) permite exatamente esta
 * transição ao dono, e grava `desativada_em` sozinho — que é o marco dos 30
 * dias.
 */
export async function desativarConta(perfilId: string): Promise<void> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from('perfil')
    .update({ situacao: 'desativada' })
    .eq('id', perfilId)
    .eq('situacao', 'ativa');

  estourarSeErro(error);
}

/**
 * Sobe o `.zip` de exportação e devolve uma URL assinada de 24 horas.
 *
 * O bucket `exportacoes` é privado e a policy é do dono
 * (`(storage.foldername(name))[1] = auth.uid()::text`), então o caminho tem de
 * começar pelo id — e o link assinado é o que permite o download sem abrir o
 * bucket. As 24 horas são o que a copy promete: "o link vale 24 horas".
 */
export async function guardarExportacao(
  usuarioId: string,
  arquivo: Uint8Array,
  nome: string,
): Promise<string> {
  const supabase = await criarClienteServidor();
  const caminho = `${usuarioId}/${nome}`;

  const { error: erroDoUpload } = await supabase.storage
    .from('exportacoes')
    .upload(caminho, arquivo, { upsert: true, contentType: 'application/zip' });
  estourarSeErro(erroDoUpload);

  const { data, error } = await supabase.storage
    .from('exportacoes')
    .createSignedUrl(caminho, 24 * 60 * 60);
  estourarSeErro(error);

  if (data === null) throw new Error('não foi possível assinar a URL da exportação.');
  return data.signedUrl;
}

/**
 * Tudo o que a exportação de LGPD leva (RF-024).
 *
 * "Perfil, faixas enviadas, devolutivas recebidas e histórico de Claves" — as
 * quatro coisas que a tela promete, e nada além: exportar dados de terceiros
 * junto seria vazar por generosidade.
 *
 * A leitura passa pela **RLS da própria pessoa**, sem service role. Isso não é
 * economia: é o que garante que a exportação não possa conter linha que ela não
 * poderia ver de qualquer outra forma.
 */
export async function lerDadosParaExportacao(perfilId: string): Promise<Record<string, unknown>> {
  const supabase = await criarClienteServidor();

  const [perfil, artista, curador, faixas, lancamentos] = await Promise.all([
    supabase.from('perfil').select('*').eq('id', perfilId).maybeSingle(),
    supabase.from('perfil_artista').select('*').eq('perfil_id', perfilId).maybeSingle(),
    supabase.from('perfil_curador').select('*').eq('perfil_id', perfilId).maybeSingle(),
    supabase.from('faixa').select('*'),
    supabase.from('lancamento_clave').select('*'),
  ]);

  estourarSeErro(perfil.error);
  estourarSeErro(artista.error);
  estourarSeErro(curador.error);
  estourarSeErro(faixas.error);
  estourarSeErro(lancamentos.error);

  return {
    perfil: perfil.data,
    perfil_artista: artista.data,
    perfil_curador: curador.data,
    faixas: faixas.data ?? [],
    historico_de_claves: lancamentos.data ?? [],
  };
}
