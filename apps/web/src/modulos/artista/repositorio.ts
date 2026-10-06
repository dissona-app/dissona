import 'server-only';

/**
 * Único ponto que toca `perfil_artista` e a fatia de `perfil` que a tela 7.1
 * edita.
 *
 * A autorização não está aqui: a RLS da `0002` restringe `perfil_artista` ao
 * dono (`perfil_id = auth.uid()`), e a da `0001` faz o mesmo com `perfil`.
 * Repetir a checagem daria a impressão de que a policy é opcional.
 *
 * **Duas tabelas, dois `update`.** O perfil não está na lista de operações que
 * exigem RPC atômica (architecture.md §4.1) — aquela lista é de escritas em que
 * uma metade aplicada deixa dinheiro ou estado inconsistente. Aqui a metade
 * aplicada é um nome salvo sem a bio, que a própria tela mostra no recarregar.
 * A ordem é `perfil` primeiro: é o `update` que pode falhar por colisão de
 * `handle`, e falhar antes de tocar `perfil_artista` deixa menos rastro.
 */

import { CodigoErro, falhar } from '@dissona/nucleo/lib/erros';
import { estourarSeErro } from '@dissona/nucleo/lib/supabase/erros';
import { criarClienteServidor } from '@dissona/nucleo/lib/supabase/servidor';

import type { DadosDoPerfil, PerfilDoArtista } from './tipos';

/**
 * Um literal só, sem concatenar.
 *
 * O cliente do Supabase infere o tipo da linha **do texto do `select`**, e
 * `'a, b' + 'c'` chega a ele como `string` — o que derruba a inferência para
 * `GenericStringError` e faz toda leitura de campo virar erro de typecheck.
 */
const COLUNAS =
  'id, perfil_id, bio, generos, link_instagram, link_spotify, link_youtube, link_site, perfil!inner(nome_completo, nome_exibicao, handle, cidade, foto_caminho, atualizado_em)';

/**
 * O perfil do artista da sessão. `null` quando a conta não tem o papel — e é
 * `null`, não erro, porque a página decide o que fazer (a guarda de rota já
 * barrou quem não é artista; isto cobre a corrida entre trocar de papel e
 * navegar).
 */
export async function lerMeuPerfil(): Promise<PerfilDoArtista | null> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.from('perfil_artista').select(COLUNAS).maybeSingle();

  estourarSeErro(error);
  if (data === null || data === undefined) return null;

  return {
    perfilId: data.perfil_id,
    perfilArtistaId: data.id,
    nomeCompleto: data.perfil.nome_completo,
    nomeExibicao: data.perfil.nome_exibicao,
    fotoCaminho: data.perfil.foto_caminho,
    atualizadoEm: data.perfil.atualizado_em,
    handle: data.perfil.handle,
    cidade: data.perfil.cidade,
    bio: data.bio,
    generos: data.generos ?? [],
    linkInstagram: data.link_instagram,
    linkSpotify: data.link_spotify,
    linkYoutube: data.link_youtube,
    linkSite: data.link_site,
  };
}

/**
 * Grava as três colunas de conta.
 *
 * O `.select('id')` existe pela mesma razão documentada em
 * `modulos/pacote/repositorio.ts`: um `update` fora do `using` da policy afeta
 * zero linhas **sem erro**, e sem conferir a contagem a pessoa sairia achando
 * que salvou.
 *
 * `23505` aqui só pode ser o `handle`: é o único índice único de `perfil`
 * afora a PK, e a PK não é tocada. Por isso o `CONFLITO` que
 * `estourarSeErro` levanta é re-etiquetado com o campo — a View precisa saber
 * onde pintar a borda vermelha.
 */
async function gravarDadosDaConta(
  perfilId: string,
  dados: DadosDoPerfil,
  fotoCaminho: string | null,
): Promise<void> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('perfil')
    .update({
      nome_exibicao: dados.nomeExibicao,
      handle: dados.handle,
      cidade: dados.cidade,
      // Só quando veio foto nova. `null` é "não mandou nada" — gravá-lo
      // apagaria a foto de quem só mudou a bio.
      ...(fotoCaminho === null ? {} : { foto_caminho: fotoCaminho }),
    })
    .eq('id', perfilId)
    .select('id');

  if (error !== null && error.code === '23505') {
    falhar(CodigoErro.CONFLITO, { campo: 'handle' });
  }
  estourarSeErro(error);

  if ((data ?? []).length === 0) {
    falhar(CodigoErro.NAO_AUTORIZADO, { operacao: 'atualizar_perfil' });
  }
}

/** Grava bio, gêneros e links. */
async function gravarDadosDoArtista(perfilArtistaId: string, dados: DadosDoPerfil): Promise<void> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('perfil_artista')
    .update({
      bio: dados.bio,
      // Array vazio e não `null`: a coluna é `text[]` e o check usa
      // `coalesce(array_length(...), 0)`, então os dois passam — mas `{}` faz
      // `generos @> '{x}'` do matching da R3 responder falso em vez de nulo.
      generos: [...dados.generos],
      link_instagram: dados.linkInstagram,
      link_spotify: dados.linkSpotify,
      link_youtube: dados.linkYoutube,
      link_site: dados.linkSite,
    })
    .eq('id', perfilArtistaId)
    .select('id');

  estourarSeErro(error);

  if ((data ?? []).length === 0) {
    falhar(CodigoErro.NAO_AUTORIZADO, { operacao: 'atualizar_perfil_artista' });
  }
}

export async function atualizarPerfil(
  perfil: PerfilDoArtista,
  dados: DadosDoPerfil,
  fotoCaminho: string | null = null,
): Promise<void> {
  await gravarDadosDaConta(perfil.perfilId, dados, fotoCaminho);
  await gravarDadosDoArtista(perfil.perfilArtistaId, dados);
}

/* --------------------------------------------------- vitrine (7.1) ------- */

/** Uma faixa como a vitrine a mostra, antes de o serviço derivar o status. */
export type FaixaNaVitrine = {
  readonly id: string;
  readonly titulo: string;
  readonly genero: string | null;
  readonly criadoEm: string;
  /** Quantos envios daquela faixa já foram concluídos pelo curador. */
  readonly leiturasConcluidas: number;
  /** Quantos envios existem ao todo — é o que separa "em análise" de "sem envio". */
  readonly envios: number;
};

/**
 * As faixas do artista com a contagem de envios prontos.
 *
 * `envio` é embed de `faixa`, e as duas são legíveis pelo dono (policies da
 * `0006`). **Sem embed de `perfil`**: ele é privado por `id = auth.uid()`, o
 * embed do PostgREST vira inner join e a lista voltaria vazia *sem erro* — o
 * mesmo defeito que a `0006d` existe para evitar do lado do curador.
 */
export async function listarFaixasDoArtista(
  perfilArtistaId: string,
): Promise<readonly FaixaNaVitrine[]> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('faixa')
    .select('id, titulo, genero, criado_em, envio(situacao)')
    .eq('perfil_artista_id', perfilArtistaId)
    .order('criado_em', { ascending: false });

  estourarSeErro(error);

  return (data ?? []).map((linha) => {
    const envios = linha.envio ?? [];
    return {
      id: linha.id,
      titulo: linha.titulo,
      genero: linha.genero,
      criadoEm: linha.criado_em,
      leiturasConcluidas: envios.filter((envio) => envio.situacao === 'pronto').length,
      envios: envios.length,
    };
  });
}

/**
 * Quantos compartilhamentos os curadores declararam nas faixas deste artista.
 *
 * `nao_compartilhou` é uma modalidade como as outras no banco — é o "Não vou
 * compartilhar desta vez" do passo 14.2 —, e por isso é excluída aqui: a
 * estatística se chama "Indicações".
 *
 * A policy `compartilhamento: segue a avaliacao` já limita o que volta ao que o
 * artista pode ver, e só avaliação **concluída** é visível para ele. Contar
 * rascunho seria contar promessa.
 */
export async function contarIndicacoes(perfilArtistaId: string): Promise<number> {
  const supabase = await criarClienteServidor();

  const { count, error } = await supabase
    .from('compartilhamento')
    .select('id, avaliacao!inner(envio!inner(faixa!inner(perfil_artista_id)))', {
      count: 'exact',
      head: true,
    })
    .eq('avaliacao.envio.faixa.perfil_artista_id', perfilArtistaId)
    .neq('modalidade', 'nao_compartilhou');

  estourarSeErro(error);
  return count ?? 0;
}
