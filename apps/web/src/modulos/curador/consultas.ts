import 'server-only';

/**
 * Leituras do cadastro do curador, para Server Components.
 *
 * Uma função só: o wizard é uma tela com oito faces, e todas as oito precisam
 * do mesmo objeto. A revisão do passo 8 precisa dele inteiro.
 */

import { criarClienteServidor } from '@dissona/nucleo/lib/supabase/servidor';
import { usuarioAtual } from '@dissona/nucleo/lib/supabase/servidor';
import { estourarSeErro } from '@dissona/nucleo/lib/supabase/erros';

import { lerEstadoDoCadastro } from '@dissona/nucleo/modulos/curador/repositorio';
import type { EstadoDoCadastro } from '@dissona/nucleo/modulos/curador/tipos';

/**
 * O estado do wizard, criando a linha de `perfil_curador` se ela não existir.
 *
 * A linha nasce na seleção de perfil (`ativarPapel`), então este `upsert` é
 * rede de segurança para dois caminhos reais: a conta que ganhou o papel
 * `curador` por outro meio — o seed de E2E, ou o `dados-e2e.sql` — e a corrida
 * entre ativar o papel e abrir o wizard.
 *
 * Sem ele, a guarda de rota mandaria a pessoa para `/curador/cadastro` (porque
 * `cadastro_concluido_em` é nulo quando não há linha) e o wizard não teria o
 * que mostrar: um laço de redirecionamento com tela em branco no fim.
 */
export async function lerCadastroDoCurador(): Promise<EstadoDoCadastro | null> {
  const existente = await lerEstadoDoCadastro();
  if (existente !== null) return existente;

  const usuario = await usuarioAtual();
  if (usuario === null) return null;

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from('perfil_curador')
    .upsert({ perfil_id: usuario.id }, { onConflict: 'perfil_id' });
  estourarSeErro(error);

  return lerEstadoDoCadastro();
}

// ---------------------------------------------------------------------------
// "Meu perfil" — a vitrine do curador (protótipo aprovado)
// ---------------------------------------------------------------------------

export type LeituraRecente = {
  readonly id: string;
  readonly faixa: string;
  readonly artista: string | null;
  readonly trecho: string | null;
  /** Nota objetiva (0–5), da `nota_avaliacao`. */
  readonly nota: number | null;
};

export type VitrineDoCuradorCompleta = {
  readonly handle: string | null;
  readonly cidade: string | null;
  readonly desde: string;
  readonly curadorias: number;
  readonly noPrazo: number;
  readonly compartilhamentos: number;
  readonly salvamentosPorCanal: ReadonlyMap<string, number>;
  readonly leituras: readonly LeituraRecente[];
};

/**
 * Os números e as listas da vitrine "Meu perfil". Tudo pela sessão (RLS): o
 * curador lê as próprias avaliações e compartilhamentos. O que a RLS não
 * deixar ler — o nome do artista, por exemplo — volta vazio, e a tela segue.
 */
export async function lerVitrineDoCuradorCompleta(
  perfilCuradorId: string,
): Promise<VitrineDoCuradorCompleta | null> {
  const usuario = await usuarioAtual();
  if (usuario === null) return null;
  const supabase = await criarClienteServidor();

  const [perfil, concluidas, compartilhadas, midias, recentes] = await Promise.all([
    supabase.from('perfil').select('handle, cidade, criado_em').eq('id', usuario.id).maybeSingle(),
    supabase
      .from('avaliacao')
      .select('id, no_prazo')
      .eq('perfil_curador_id', perfilCuradorId)
      .eq('situacao', 'concluida'),
    supabase
      .from('compartilhamento')
      .select('id, avaliacao!inner(perfil_curador_id)', { count: 'exact', head: true })
      .eq('avaliacao.perfil_curador_id', perfilCuradorId),
    supabase
      .from('midia_curador')
      .select('id, salvamentos')
      .eq('perfil_curador_id', perfilCuradorId),
    supabase
      .from('avaliacao')
      .select(
        'id, envio_id, feedback, envio(faixa(titulo, perfil_artista(perfil(nome_exibicao, nome_completo))))',
      )
      .eq('perfil_curador_id', perfilCuradorId)
      .eq('situacao', 'concluida')
      .order('concluida_em', { ascending: false })
      .limit(3),
  ]);

  const avaliacoes = concluidas.data ?? [];
  const idsRecentes = (recentes.data ?? []).map((linha) => linha.id);
  const notas =
    idsRecentes.length === 0
      ? []
      : ((
          await supabase
            .from('nota_avaliacao')
            .select('avaliacao_id, no')
            .in('avaliacao_id', idsRecentes)
        ).data ?? []);

  const salvamentosPorCanal = new Map<string, number>();
  for (const midia of midias.data ?? []) {
    if (midia.salvamentos !== null) salvamentosPorCanal.set(midia.id, Number(midia.salvamentos));
  }

  return {
    handle: perfil.data?.handle ?? null,
    cidade: perfil.data?.cidade ?? null,
    desde: perfil.data?.criado_em ?? new Date().toISOString(),
    curadorias: avaliacoes.length,
    noPrazo: avaliacoes.filter((linha) => linha.no_prazo === true).length,
    compartilhamentos: compartilhadas.count ?? 0,
    salvamentosPorCanal,
    leituras: (recentes.data ?? []).map((linha) => {
      const envio = Array.isArray(linha.envio) ? linha.envio[0] : linha.envio;
      const faixa =
        envio === null || envio === undefined
          ? null
          : Array.isArray(envio.faixa)
            ? envio.faixa[0]
            : envio.faixa;
      const artista = faixa?.perfil_artista;
      const perfilDoArtista =
        artista === null || artista === undefined
          ? null
          : Array.isArray(artista)
            ? artista[0]?.perfil
            : artista.perfil;
      const pessoa = Array.isArray(perfilDoArtista) ? perfilDoArtista[0] : perfilDoArtista;
      const nota = notas.find((cada) => cada.avaliacao_id === linha.id)?.no;
      return {
        id: linha.id,
        faixa: faixa?.titulo ?? '—',
        artista: pessoa?.nome_exibicao ?? pessoa?.nome_completo ?? null,
        trecho: linha.feedback,
        nota: nota === null || nota === undefined ? null : Number(nota),
      };
    }),
  };
}

export type RecebimentoDoCurador = {
  readonly chave: string | null;
  readonly tipo: string | null;
  readonly situacao: string | null;
};

/** A chave Pix do curador, para "Dados de recebimento" em Conta. */
export async function lerRecebimentoDoCurador(): Promise<RecebimentoDoCurador | null> {
  const usuario = await usuarioAtual();
  if (usuario === null) return null;
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from('perfil_curador')
    .select('chave_pix, chave_pix_tipo, chave_pix_situacao')
    .eq('perfil_id', usuario.id)
    .maybeSingle();
  if (data === null) return null;
  return { chave: data.chave_pix, tipo: data.chave_pix_tipo, situacao: data.chave_pix_situacao };
}
