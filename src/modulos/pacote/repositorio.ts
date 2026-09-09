import 'server-only';

/**
 * Único ponto que toca `pacote_clave`.
 *
 * A autorização **não** está aqui: quem pode escrever é a policy
 * `tem_permissao('pacotes', true)` da migration `0007`, e quem pode ler é
 * `ativo or tem_permissao('pacotes')`. O repositório não repete a checagem —
 * repetir daria a impressão de que a RLS é opcional, e um `select` que
 * "esqueceu" o filtro passaria a ser um vazamento em vez de zero linhas.
 *
 * As conversões `numeric`/`bigint` ↔ `bigint` do domínio ficam confinadas
 * neste arquivo. O driver devolve `numeric` como `number` e `bigint` como
 * `number` também (JSON não tem inteiro grande), então cada leitura passa pelo
 * conversor de `lib/` em vez de virar `BigInt(linha.valor_centavos)` solto.
 */

import { paraClaves } from '@/lib/claves';
import { paraCentavos } from '@/lib/dinheiro';
import { CodigoErro, falhar } from '@/lib/erros';
import { estourarSeErro } from '@/lib/supabase/erros';
import { criarClienteServidor } from '@/lib/supabase/servidor';
import type { Database } from '@/lib/supabase/tipos-bd';

import type { DadosDePacote, Pacote } from './tipos';

type Linha = Database['public']['Tables']['pacote_clave']['Row'];

const COLUNAS =
  'id, nome, quantidade_claves, valor_centavos, desconto_percentual, ativo, excluido_em, criado_em, atualizado_em';

/**
 * `numeric` chega como `number` no driver. Passar por string decimal antes de
 * `paraClaves` preserva as duas casas sem tocar em ponto flutuante de novo:
 * `toFixed(2)` sobre um `numeric(10,2)` é exato, porque o valor já veio com
 * duas casas do banco.
 */
function paraDominio(linha: Linha): Pacote {
  return {
    id: linha.id,
    nome: linha.nome,
    quantidade: paraClaves(linha.quantidade_claves.toFixed(2)),
    valor: paraCentavos((linha.valor_centavos / 100).toFixed(2)),
    descontoPercentual: linha.desconto_percentual,
    ativo: linha.ativo,
    excluidoEm: linha.excluido_em === null ? null : new Date(linha.excluido_em),
    criadoEm: new Date(linha.criado_em),
    atualizadoEm: new Date(linha.atualizado_em),
  };
}

/**
 * Lista da tela 21: os não excluídos, ordenados por quantidade.
 *
 * A ordem é a do protótipo (`lista.sort((a, b) => a.qtd - b.qtd)`) e é a que
 * faz a coluna "Por Clave" descer monotonicamente — é assim que o desconto
 * progressivo se lê numa tabela.
 */
export async function listarParaEquipe(): Promise<readonly Pacote[]> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('pacote_clave')
    .select(COLUNAS)
    .is('excluido_em', null)
    .order('quantidade_claves', { ascending: true });

  estourarSeErro(error);
  return (data ?? []).map(paraDominio);
}

/** Um pacote pelo id. `null` quando nao existe ou a RLS o esconde. */
export async function buscar(pacoteId: string): Promise<Pacote | null> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('pacote_clave')
    .select(COLUNAS)
    .eq('id', pacoteId)
    .is('excluido_em', null)
    .maybeSingle();

  estourarSeErro(error);
  return data === null || data === undefined ? null : paraDominio(data);
}

type Escrita = {
  readonly nome: string;
  readonly quantidade_claves: number;
  readonly valor_centavos: number;
  readonly desconto_percentual: number;
  readonly ativo: boolean;
};

function paraEscrita(dados: DadosDePacote, descontoPercentual: number): Escrita {
  return {
    nome: dados.nome.trim(),
    quantidade_claves: Number(dados.quantidade) / 100,
    valor_centavos: Number(dados.valor),
    desconto_percentual: descontoPercentual,
    ativo: dados.ativo,
  };
}

export async function inserir(dados: DadosDePacote, descontoPercentual: number): Promise<string> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('pacote_clave')
    .insert(paraEscrita(dados, descontoPercentual))
    .select('id')
    .single();

  estourarSeErro(error);
  if (data === null) falhar(CodigoErro.NAO_AUTORIZADO, { operacao: 'inserir_pacote' });
  return data.id;
}

/**
 * Aplica um `update` e **exige** que ele tenha alcancado a linha.
 *
 * Este `.select('id')` nao e decorativo, e a razao dele foi um achado da suite
 * de RLS: um `insert` barrado por `with check` estoura `42501`, mas um
 * `update` que cai fora do `using` da policy simplesmente **nao encontra
 * linha** — zero linhas afetadas, nenhum erro. Sem conferir a contagem, um
 * moderador (que tem `pacotes` sem escrita) clicaria "Salvar", nao veria erro
 * nenhum e sairia acreditando que o preco mudou.
 *
 * Zero linhas tem duas causas indistinguiveis daqui — sem permissao, ou id que
 * nao existe/foi excluido. As duas sao `NAO_AUTORIZADO` ou `NAO_ENCONTRADO`
 * para quem chamou, e a escolha e `NAO_AUTORIZADO` porque distinguir revelaria
 * a existencia da linha a quem nao pode le-la.
 */
async function atualizarExigindoLinha(
  pacoteId: string,
  patch: Partial<Escrita> & { readonly excluido_em?: string },
): Promise<void> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('pacote_clave')
    .update(patch)
    .eq('id', pacoteId)
    .is('excluido_em', null)
    .select('id');

  estourarSeErro(error);
  if ((data ?? []).length === 0) {
    falhar(CodigoErro.NAO_AUTORIZADO, { operacao: 'atualizar_pacote', pacoteId });
  }
}

export async function atualizar(
  pacoteId: string,
  dados: DadosDePacote,
  descontoPercentual: number,
): Promise<void> {
  await atualizarExigindoLinha(pacoteId, paraEscrita(dados, descontoPercentual));
}

export async function definirAtivo(pacoteId: string, ativo: boolean): Promise<void> {
  await atualizarExigindoLinha(pacoteId, { ativo });
}

/**
 * Exclusao logica — a acao "Excluir pacote" da tela 21.
 *
 * As duas colunas no **mesmo** update, e nao em dois: o check
 * `pacote_clave_excluido_e_inativo` recusaria o estado intermediario
 * `excluido_em is not null and ativo`, e recusar e o comportamento certo.
 */
export async function excluir(pacoteId: string): Promise<void> {
  await atualizarExigindoLinha(pacoteId, {
    ativo: false,
    excluido_em: new Date().toISOString(),
  });
}
