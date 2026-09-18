import 'server-only';

/**
 * Único ponto que toca `saldo_carteira` e `lancamento_clave`.
 *
 * Nenhuma escrita: o ledger é append-only por trigger
 * (`lancamento_clave_append_only` recusa update e delete **inclusive dentro de
 * RPC**), e as inserções vêm de `confirmar_pedido_clave`,
 * `confirmar_selecao_curadores` e `devolver_claves_sem_resposta`. A aplicação
 * só lê.
 *
 * A RLS restringe as duas leituras ao dono (ou a quem tem `financeiro`), e a
 * view é `security_invoker` — sem isso ela rodaria como o dono e devolveria o
 * saldo de todo mundo, que é a falha mais silenciosa possível num dado
 * financeiro.
 */

import { paraClavesComSinal } from '@/lib/claves';
import type { Claves } from '@/lib/claves';
import { estourarSeErro } from '@/lib/supabase/erros';
import { criarClienteServidor } from '@/lib/supabase/servidor';

import type { Movimentacao } from './tipos';

/**
 * `numeric` chega como `number` no driver; passa por string decimal antes de
 * virar `bigint`. `toFixed(2)` sobre um `numeric(10,2)` é exato, porque o valor
 * já veio com duas casas do banco.
 *
 * **Com sinal**: `lancamento_clave.quantidade` é negativa no consumo, e o saldo
 * da view pode ser negativo num estorno. `paraClaves` recusaria as duas coisas.
 */
function claves(valor: number): Claves {
  return paraClavesComSinal(valor.toFixed(2));
}

export type SaldoDaView = {
  readonly disponivel: Claves;
  readonly comprometido: Claves;
  readonly devolvido: Claves;
};

/**
 * O saldo derivado. `null` quando a conta não tem perfil de artista.
 *
 * A view faz `left join` a partir de `perfil_artista`, então artista sem
 * movimento nenhum aparece com zeros em vez de sumir da consulta.
 */
export async function lerSaldo(): Promise<SaldoDaView | null> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('saldo_carteira')
    .select('disponivel, comprometido, devolvido')
    .maybeSingle();

  estourarSeErro(error);
  if (data === null || data === undefined) return null;

  return {
    disponivel: claves(data.disponivel ?? 0),
    comprometido: claves(data.comprometido ?? 0),
    devolvido: claves(data.devolvido ?? 0),
  };
}

/**
 * O ledger inteiro do artista, do mais recente para o mais antigo.
 *
 * **Sem paginação, e é uma decisão consciente.** Os três cards de resumo da
 * tela 5 (adquiridas, usadas, devolvidas) e o saldo acumulado da tela 5.3
 * dependem do histórico **completo** — um acumulado calculado sobre uma página
 * mostraria saldos que nunca existiram. Na R2 são dezenas de linhas por conta.
 * Quando isso crescer, o caminho é uma view de agregados, não paginar aqui.
 */
export async function lerMovimentacoes(): Promise<readonly Movimentacao[]> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('lancamento_clave')
    .select('id, criado_em, descricao, tipo, quantidade')
    .order('criado_em', { ascending: false });

  estourarSeErro(error);

  return (data ?? []).map((linha) => ({
    id: linha.id,
    data: new Date(linha.criado_em),
    origem: linha.descricao,
    tipo: linha.tipo,
    quantidade: claves(linha.quantidade),
  }));
}

/* ------------------------------------------------- cartão salvo (0007e) --- */

export type CartaoSalvo = {
  readonly id: string;
  readonly ultimosDigitos: string;
  readonly bandeira: string | null;
};

/**
 * O cartão que a pessoa tem guardado, ou `null`.
 *
 * O mais recente, quando há mais de um: a tela usa **um**, e o último usado é o
 * palpite certo. O `token` não sai daqui — a tela não tem o que fazer com ele,
 * e um token que trafega até o navegador é um token a mais exposto.
 */
export async function lerCartaoSalvo(): Promise<CartaoSalvo | null> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('cartao_salvo')
    .select('id, ultimos_digitos, bandeira')
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  estourarSeErro(error);
  if (data === null) return null;

  return { id: data.id, ultimosDigitos: data.ultimos_digitos, bandeira: data.bandeira };
}

/**
 * O token de um cartão do artista da sessão, para cobrar com ele.
 *
 * Fica separado de `lerCartaoSalvo` de propósito: quem desenha a tela não
 * precisa do token, e só o caminho da cobrança o pede. A RLS é a fronteira —
 * um id de outra pessoa volta `null`, não o token dela.
 */
export async function lerTokenDoCartao(cartaoId: string): Promise<string | null> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('cartao_salvo')
    .select('token')
    .eq('id', cartaoId)
    .maybeSingle();

  estourarSeErro(error);
  return data?.token ?? null;
}

/**
 * Guarda o cartão que a cobrança aprovada deixou.
 *
 * `upsert` pela chave (`perfil_artista_id`, `token`): reusar a mesma cobrança
 * não vira duas linhas. A falha é **engolida** — e é o único lugar deste módulo
 * em que engolir é o certo: o dinheiro já entrou e as Claves já foram
 * creditadas; derrubar a compra porque a conveniência da próxima não pôde ser
 * salva seria punir a pessoa por um detalhe que ela nem pediu.
 */
export async function salvarCartao(cartao: {
  readonly token: string;
  readonly ultimosDigitos: string;
  readonly bandeira: string | null;
}): Promise<void> {
  const supabase = await criarClienteServidor();

  // O id do artista é resolvido aqui, e não recebido: a policy de insert exige
  // `meu_perfil_artista_id()` de qualquer forma, e passá-lo de fora só criaria
  // a chance de alguém passar o errado.
  const { data: artista } = await supabase.from('perfil_artista').select('id').maybeSingle();
  if (artista === null) return;

  await supabase.from('cartao_salvo').upsert(
    {
      perfil_artista_id: artista.id,
      token: cartao.token,
      ultimos_digitos: cartao.ultimosDigitos,
      bandeira: cartao.bandeira,
    },
    { onConflict: 'perfil_artista_id,token', ignoreDuplicates: true },
  );
}

/**
 * Remove o cartão. `false` quando nada saiu — id de outra pessoa, ou já
 * removido.
 *
 * O `.select('id')` é o que distingue os dois: a policy de delete filtra pelo
 * dono, e um `delete` fora dela afeta zero linhas **sem erro**.
 */
export async function apagarCartao(cartaoId: string): Promise<boolean> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('cartao_salvo')
    .delete()
    .eq('id', cartaoId)
    .select('id');

  estourarSeErro(error);
  return (data ?? []).length > 0;
}
