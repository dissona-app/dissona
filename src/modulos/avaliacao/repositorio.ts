import 'server-only';

/**
 * Único ponto que toca `criterio`, `avaliacao`, `nota_criterio`,
 * `compartilhamento` e as duas funções de remuneração.
 *
 * ## O que é escrita livre e o que é RPC
 *
 * Enquanto `situacao = 'rascunho'`, o curador dono escreve à vontade em
 * `avaliacao`, `nota_criterio` e `compartilhamento` — as policies da `0008`
 * permitem (`avaliacao_em_rascunho_do_curador`). **Concluir não é escrita**:
 * é `enviar_avaliacao`, que grava o ganho, fecha o envio e notifica numa
 * transação só. O trigger `avaliacao_concluida_e_final` recusa um cliente que
 * tente setar `situacao = 'concluida'` por fora.
 */

import { CodigoErro, falhar } from '@/lib/erros';
import { estourarSeErro } from '@/lib/supabase/erros';
import { criarClienteServidor, usuarioAtual } from '@/lib/supabase/servidor';
import type { Database } from '@/lib/supabase/tipos-bd';

import type {
  AvaliacaoEmEdicao,
  ClasseCurador,
  CompartilhamentoEmEdicao,
  Criterio,
  ItemDoHistorico,
  NotaDeCriterio,
  OpcionaisCumpridos,
  Remuneracao,
} from './tipos';

/** O catálogo dos 11, do seed da `0008`. Legível por qualquer autenticado. */
export async function listarCriterios(): Promise<readonly Criterio[]> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('criterio')
    .select('chave, grupo, rotulo, obrigatorio, ordem')
    .eq('ativo', true)
    .order('ordem');

  estourarSeErro(error);
  return data ?? [];
}

/** O rascunho do envio, ou `null` se ainda não existe. */
export async function buscarRascunho(envioId: string): Promise<AvaliacaoEmEdicao | null> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('avaliacao')
    .select(
      'id, envio_id, nota_subjetiva, feedback, escuta_percentual, passo_atual, situacao, nota_criterio(criterio, nota, justificativa), compartilhamento(modalidade, descricao, url)',
    )
    .eq('envio_id', envioId)
    .maybeSingle();

  estourarSeErro(error);
  if (data === null || data === undefined) return null;

  const partilha = Array.isArray(data.compartilhamento)
    ? data.compartilhamento[0]
    : data.compartilhamento;

  return {
    id: data.id,
    envioId: data.envio_id,
    notaSubjetiva: data.nota_subjetiva,
    feedback: data.feedback,
    escutaPercentual: Number(data.escuta_percentual),
    passoAtual: data.passo_atual,
    concluida: data.situacao === 'concluida',
    notas: (data.nota_criterio ?? []).map((n) => ({
      criterio: n.criterio,
      nota: Number(n.nota),
      justificativa: n.justificativa,
    })),
    compartilhamento:
      partilha === null || partilha === undefined
        ? null
        : {
            modalidade: partilha.modalidade,
            descricao: partilha.descricao,
            url: partilha.url,
          },
  };
}

/**
 * Cria o rascunho, se não houver.
 *
 * `perfil_curador_id` é denormalizado em `avaliacao` — a `0008` o põe lá para
 * a RLS e as métricas da R3 não precisarem de join até `envio`. Vem de
 * `meu_perfil_curador_id()`, nunca do cliente.
 *
 * ## `upsert`, e não "ler e depois inserir"
 *
 * `avaliacao.envio_id` é `unique`, e ler-antes-de-inserir é uma janela de
 * corrida: duas abas abertas na mesma faixa, ou o player gravando a escuta
 * enquanto o formulário é enviado, e a segunda chamada estoura `23505`. O
 * sintoma não seria um erro claro — seria o formulário voltar com "conflito"
 * sem nada a corrigir.
 *
 * `ignoreDuplicates` faz a linha existente vencer sem erro. Ela não devolve id
 * nesse caso, e por isso a leitura vem depois: o id é sempre lido, tenha a
 * linha nascido agora ou não.
 */
export async function garantirRascunho(envioId: string): Promise<string> {
  const supabase = await criarClienteServidor();

  const existente = await buscarRascunho(envioId);
  if (existente?.id != null) return existente.id;

  const perfil = await meuPerfilCurador();
  if (perfil === null) falhar(CodigoErro.PAPEL_AUSENTE);

  const { error } = await supabase
    .from('avaliacao')
    .upsert(
      { envio_id: envioId, perfil_curador_id: perfil.id },
      { onConflict: 'envio_id', ignoreDuplicates: true },
    );

  estourarSeErro(error);

  const criado = await buscarRascunho(envioId);
  if (criado?.id == null) falhar(CodigoErro.NAO_AUTORIZADO, { operacao: 'criar_rascunho' });
  return criado.id;
}

/** O tipo gerado do `update` — nunca um `Record<string, unknown>` solto. */
type PatchDeAvaliacao = Database['public']['Tables']['avaliacao']['Update'];

async function atualizarRascunho(avaliacaoId: string, patch: PatchDeAvaliacao): Promise<void> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('avaliacao')
    .update(patch)
    .eq('id', avaliacaoId)
    .select('id');

  estourarSeErro(error);
  if ((data ?? []).length === 0) {
    falhar(CodigoErro.AVALIACAO_JA_CONCLUIDA, { avaliacaoId });
  }
}

/**
 * Registra a escuta medida.
 *
 * O trigger `avaliacao_escuta_so_cresce` grava `greatest(old, new)`, então
 * mandar um valor menor é inócuo — o que é exatamente o que se quer: o
 * `MedidorDeEscuta` zera a cada carregamento da página, e sem essa regra um F5
 * no meio da avaliação apagaria o progresso já medido.
 */
export async function registrarEscuta(avaliacaoId: string, percentual: number): Promise<void> {
  await atualizarRascunho(avaliacaoId, { escuta_percentual: percentual });
}

/**
 * Marca o envio como `ouviu`, quando a escuta cruza o mínimo.
 *
 * É a segunda das três transições que o cliente pode escrever — a lista está
 * em `fila/repositorio.ts`, e `ouviu` estava na lista sem que ninguém a
 * gravasse: em `src/` o valor só aparecia em leitura e filtro. O ciclo que o
 * artista via em `3.3` era `Recebeu → Avaliando → Pronto`, e o "Ouviu" do
 * RF-071 nunca acendia.
 *
 * `.eq('situacao', 'recebeu')` é o que torna isto idempotente e barato: a cada
 * tique do medidor a condição é falsa depois da primeira vez, e o update afeta
 * zero linhas. Não sobrescreve `avaliando` — quem já começou a avaliar não
 * volta para `ouviu` por causa de um F5 que faça o player remedir.
 *
 * Sem `estourarSeErro`: quem chama é o medidor, e a regra dele é não
 * interromper quem está ouvindo. Um erro aqui custa o carimbo de estado, não a
 * escuta — que já foi gravada por `registrarEscuta`, e é ela que o gate
 * `DS001` de `enviar_avaliacao` lê.
 */
export async function marcarEnvioComoOuvido(envioId: string): Promise<void> {
  const supabase = await criarClienteServidor();

  await supabase
    .from('envio')
    .update({ situacao: 'ouviu' })
    .eq('id', envioId)
    .eq('situacao', 'recebeu');
}

export async function salvarPasso(avaliacaoId: string, passo: number): Promise<void> {
  await atualizarRascunho(avaliacaoId, { passo_atual: passo });
}

export async function salvarSubjetiva(
  avaliacaoId: string,
  notaSubjetiva: number,
  feedback: string | null,
): Promise<void> {
  await atualizarRascunho(avaliacaoId, { nota_subjetiva: notaSubjetiva, feedback });
}

/**
 * Grava uma nota de critério.
 *
 * `upsert` com `onConflict` na única `(avaliacao_id, criterio)`: o curador
 * mexe na mesma nota várias vezes, e um insert cego estouraria `23505` na
 * segunda vez.
 */
export async function salvarNota(avaliacaoId: string, nota: NotaDeCriterio): Promise<void> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase.from('nota_criterio').upsert(
    {
      avaliacao_id: avaliacaoId,
      criterio: nota.criterio,
      nota: nota.nota,
      justificativa: nota.justificativa,
    },
    { onConflict: 'avaliacao_id,criterio' },
  );

  estourarSeErro(error);
}

export async function removerNota(avaliacaoId: string, criterio: string): Promise<void> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from('nota_criterio')
    .delete()
    .eq('avaliacao_id', avaliacaoId)
    .eq('criterio', criterio);

  estourarSeErro(error);
}

export async function salvarCompartilhamento(
  avaliacaoId: string,
  escolha: CompartilhamentoEmEdicao,
): Promise<void> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase.from('compartilhamento').upsert(
    {
      avaliacao_id: avaliacaoId,
      modalidade: escolha.modalidade,
      descricao: escolha.descricao,
      url: escolha.url,
    },
    { onConflict: 'avaliacao_id' },
  );

  estourarSeErro(error);
}

/**
 * Previsão da remuneração — a **mesma função** que `enviar_avaliacao` usa.
 *
 * Chamá-la em vez de reimplementar o cálculo é o que garante que a tela 14.4
 * mostre o número que vai ser pago. `calcular_remuneracao` é `stable` e
 * `security invoker`; devolve **array de um elemento**.
 */
export async function preverRemuneracao(
  classe: ClasseCurador,
  noPrazo: boolean,
  baseClaves: number,
  opcionais: OpcionaisCumpridos,
): Promise<Remuneracao | null> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.rpc('calcular_remuneracao', {
    p_classe: classe,
    p_no_prazo: noPrazo,
    p_base_claves: baseClaves,
    p_opcionais: { ...opcionais },
  });

  estourarSeErro(error);

  const linha = (data ?? [])[0];
  if (linha === undefined) return null;

  return {
    pisoPercentual: Number(linha.piso_percentual),
    percentualAplicado: Number(linha.percentual_aplicado),
    tetoPercentual: Number(linha.teto_percentual),
    penalidadePrazo: linha.penalidade_prazo,
    baseCentavos: BigInt(linha.base_centavos),
    valorCentavos: BigInt(linha.valor_centavos),
    comissaoCentavos: BigInt(linha.comissao_centavos),
    acrescimos: Array.isArray(linha.acrescimos)
      ? (linha.acrescimos as { chave: string; percentual: number }[]).map((a) => ({
          chave: a.chave,
          percentual: Number(a.percentual),
        }))
      : [],
  };
}

/**
 * Conclui — a RPC atômica.
 *
 * Grava avaliação e notas, calcula a remuneração, cria `ganho_curador`, fecha
 * o `envio` como `pronto` e dispara as duas notificações. Nada disso pode ser
 * feito em pedaços pelo cliente: `ganho_curador` não tem policy de insert, e
 * `pronto` é estado terminal reservado a RPC por trigger.
 *
 * Devolve o id do ganho. Erros sobem como `DS001`–`DS005` e a View traduz.
 */
export async function concluir(
  envioId: string,
  notas: readonly NotaDeCriterio[],
  notaSubjetiva: number,
  feedback: string,
  escutaPercentual: number,
  compartilhamento: CompartilhamentoEmEdicao,
): Promise<string> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.rpc('enviar_avaliacao', {
    p_envio_id: envioId,
    p_notas: notas.map((n) => ({
      criterio: n.criterio,
      nota: n.nota,
      justificativa: n.justificativa,
    })),
    p_nota_subjetiva: notaSubjetiva,
    p_feedback: feedback,
    p_escuta_percentual: escutaPercentual,
    p_compartilhamento: {
      modalidade: compartilhamento.modalidade,
      descricao: compartilhamento.descricao,
      url: compartilhamento.url,
    },
  });

  estourarSeErro(error);
  if (data === null) falhar(CodigoErro.CONFLITO, { operacao: 'enviar_avaliacao' });
  return data;
}

/**
 * O `perfil_curador` da sessão — id e classe.
 *
 * ⚠️ O `.eq('perfil_id', ...)` **não** é redundante com a RLS. A policy de
 * leitura é `situacao in ('bronze_aprovado','prata_aprovado') or perfil_id =
 * auth.uid() or e_admin()`: todo curador aprovado é visível a qualquer
 * autenticado, porque a seleção de curadores (4) precisa listá-los. Sem o
 * filtro, um `maybeSingle()` aqui recebe a plataforma inteira e falha — e falha
 * de um jeito que parece "você não é curador", que é o diagnóstico errado.
 */
async function meuPerfilCurador(): Promise<{
  readonly id: string;
  readonly classe: ClasseCurador;
} | null> {
  const usuario = await usuarioAtual();
  if (usuario === null) return null;

  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('perfil_curador')
    .select('id, classe')
    .eq('perfil_id', usuario.id)
    .maybeSingle();

  estourarSeErro(error);
  return data;
}

/**
 * A classe do curador da sessão — o primeiro argumento de `calcular_remuneracao`.
 *
 * Lida aqui e não recebida da tela: `classe` decide dinheiro, e o cliente não
 * tem voz nela. A RPC de conclusão relê a própria classe pelo mesmo motivo, e
 * congela-a em `avaliacao.classe_no_momento` — a previsão desta tela e o ganho
 * gravado precisam vir da mesma fonte.
 */
export async function classeDoCurador(): Promise<ClasseCurador | null> {
  return (await meuPerfilCurador())?.classe ?? null;
}

/**
 * URL assinada do áudio da faixa, para o player medir a escuta.
 *
 * O bucket `faixas` é privado. A policy de leitura do curador (`0006b`) compara
 * `storage.objects.name` com `faixa.arquivo_caminho` por igualdade exata, então
 * o caminho aqui é o que veio da view — nunca um montado à mão.
 *
 * Devolve `null` quando não há arquivo ou quando o Storage recusa a assinatura,
 * em vez de estourar: a tela tem um estado próprio para isso, e uma avaliação
 * inteira não pode cair num `error.tsx` por causa de um objeto ausente. A
 * fronteira continua sendo a RPC, que recusa com `DS001` sem escuta medida.
 */
export async function urlDoAudio(caminho: string | null): Promise<string | null> {
  if (caminho === null || caminho.trim() === '') return null;

  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.storage
    .from('faixas')
    .createSignedUrl(caminho, VALIDADE_DO_AUDIO_SEGUNDOS);

  if (error !== null) return null;
  return data?.signedUrl ?? null;
}

/**
 * Uma hora. O wizard tem cinco etapas e um "Salvar e sair"; um link de dez
 * minutos expiraria no meio da escuta e o player pararia sem explicação.
 */
const VALIDADE_DO_AUDIO_SEGUNDOS = 60 * 60;

/**
 * O ganho já gravado de uma avaliação concluída.
 *
 * A tela 14.4 depois de concluída mostra **este** valor, e não uma nova
 * previsão: `calcular_remuneracao` é `stable` e leria a `configuracao` de hoje,
 * enquanto `ganho_curador` congelou a classe, o prazo e os percentuais do
 * momento da entrega. Se o admin mudar um acréscimo amanhã, a tela continua
 * explicando o crédito que de fato entrou.
 *
 * A policy é `perfil_curador_id = meu_perfil_curador_id() or tem_permissao('financeiro')`
 * — só de leitura; `ganho_curador` não tem policy de escrita nenhuma.
 */
export async function buscarGanho(avaliacaoId: string): Promise<Remuneracao | null> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('ganho_curador')
    .select(
      'piso_percentual, percentual_aplicado, teto_percentual, penalidade_prazo, base_centavos, valor_centavos, comissao_centavos, acrescimos',
    )
    .eq('avaliacao_id', avaliacaoId)
    .maybeSingle();

  estourarSeErro(error);
  if (data === null) return null;

  return {
    pisoPercentual: Number(data.piso_percentual),
    percentualAplicado: Number(data.percentual_aplicado),
    tetoPercentual: Number(data.teto_percentual),
    penalidadePrazo: data.penalidade_prazo,
    baseCentavos: BigInt(data.base_centavos),
    valorCentavos: BigInt(data.valor_centavos),
    comissaoCentavos: BigInt(data.comissao_centavos),
    acrescimos: Array.isArray(data.acrescimos)
      ? (data.acrescimos as { chave: string; percentual: number }[]).map((a) => ({
          chave: a.chave,
          percentual: Number(a.percentual),
        }))
      : [],
  };
}

/**
 * Apaga a escolha de compartilhamento.
 *
 * Existe para um caso só: escolher "Outros" em 14.2 é uma escolha **incompleta**
 * — o `check` `compartilhamento_outros_exige_descricao` recusa a linha sem
 * dizer onde a faixa vai circular, e essa resposta só é colhida em 14.3. Em vez
 * de gravar uma descrição inventada para satisfazer o `check`, a escolha
 * anterior é removida e a linha nasce em 14.3, completa.
 *
 * Assim o estado intermediário é honesto: `impedimentosParaConcluir` acusa
 * `compartilhamento_sem_escolha` enquanto 14.3 não for respondida.
 */
export async function removerCompartilhamento(avaliacaoId: string): Promise<void> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from('compartilhamento')
    .delete()
    .eq('avaliacao_id', avaliacaoId);

  estourarSeErro(error);
}

/**
 * O histórico do curador da sessão — "Notas e feedback".
 *
 * Três idas, uma por tabela, e nenhuma por linha: as avaliações, a faixa de
 * cada uma pela `fila_do_curador` (que cobre o envio em qualquer situação,
 * `pronto` incluído, e traz o nome do artista que `perfil` esconderia) e o
 * ganho das entregues. As policies decidem o que volta: `avaliacao` e
 * `ganho_curador` só entregam as do próprio curador, e a view já se restringe
 * a ele.
 *
 * Mais recente primeiro — pela entrega, ou pela última edição do rascunho.
 */
export async function listarHistorico(): Promise<readonly ItemDoHistorico[]> {
  // O filtro pelo curador é obrigatório, e não redundância com a policy: ela
  // também entrega a `avaliacao` ao admin e ao artista dono do envio. Quem é
  // curador **e** admin veria o histórico da plataforma inteira.
  const curador = await meuPerfilCurador();
  if (curador === null) return [];

  const supabase = await criarClienteServidor();

  const { data: avaliacoes, error } = await supabase
    .from('avaliacao')
    .select(
      'id, envio_id, situacao, passo_atual, nota_subjetiva, no_prazo, concluida_em, atualizado_em',
    )
    .eq('perfil_curador_id', curador.id);
  estourarSeErro(error);
  if (avaliacoes === null || avaliacoes.length === 0) return [];

  const envioIds = avaliacoes.map((a) => a.envio_id);
  const concluidas = avaliacoes.filter((a) => a.situacao === 'concluida').map((a) => a.id);

  // A view não está nos tipos gerados — o mesmo acesso de `fila/repositorio`.
  const view = supabase as unknown as {
    from(view: string): {
      select(colunas: string): {
        in(
          coluna: string,
          valores: readonly string[],
        ): PromiseLike<{
          readonly data:
            | {
                readonly envio_id: string;
                readonly titulo: string;
                readonly artista: string;
              }[]
            | null;
          readonly error: unknown;
        }>;
      };
    };
  };

  // O ganho também filtra pelo curador: `tem_permissao('financeiro')` abre a
  // tabela inteira ao admin.
  const [faixas, ganhos] = await Promise.all([
    view
      .from('fila_do_curador')
      .select('envio_id, titulo, artista')
      .in('envio_id', envioIds),
    concluidas.length === 0
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from('ganho_curador')
          .select('avaliacao_id, valor_centavos')
          .eq('perfil_curador_id', curador.id)
          .in('avaliacao_id', concluidas),
  ]);
  estourarSeErro(faixas.error);
  estourarSeErro(ganhos.error);

  const faixaPorEnvio = new Map((faixas.data ?? []).map((f) => [f.envio_id, f]));
  const ganhoPorAvaliacao = new Map(
    (ganhos.data ?? []).map((g) => [g.avaliacao_id, BigInt(g.valor_centavos)]),
  );

  const itens: ItemDoHistorico[] = [];
  for (const avaliacao of avaliacoes) {
    const faixa = faixaPorEnvio.get(avaliacao.envio_id);
    // Sem a faixa não há o que mostrar na linha; a view é quem diz se o envio
    // ainda é deste curador.
    if (faixa === undefined) continue;

    itens.push({
      envioId: avaliacao.envio_id,
      titulo: faixa.titulo,
      artista: faixa.artista,
      concluida: avaliacao.situacao === 'concluida',
      passoAtual: avaliacao.passo_atual,
      notaSubjetiva: avaliacao.nota_subjetiva,
      noPrazo: avaliacao.no_prazo,
      concluidaEm: avaliacao.concluida_em === null ? null : new Date(avaliacao.concluida_em),
      atualizadaEm: new Date(avaliacao.atualizado_em),
      valorCentavos: ganhoPorAvaliacao.get(avaliacao.id) ?? null,
    });
  }

  const momento = (item: ItemDoHistorico) => (item.concluidaEm ?? item.atualizadaEm).getTime();
  return itens.sort((a, b) => momento(b) - momento(a));
}
