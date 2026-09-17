import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../src/lib/supabase/tipos-bd';

import { DOMINIO_E2E, PREFIXO_E2E } from './personas';

/**
 * O que nenhuma tela monta: estado de SLA, ledger, log e notificação.
 *
 * ## Por que existe
 *
 * Três requisitos da R2 não têm porta de entrada pela interface. O aviso de
 * 72 h (RF-069) e a devolução em 7 dias (RF-070) são jobs de `pg_cron`; o
 * ciclo de estados do envio (RF-071) só fecha se alguém puder adiantar o
 * relógio. E metade do RF-070 — "o crédito devolvido **não** entra como ganho
 * do curador" — não aparece em tela nenhuma: é ausência de linha numa tabela.
 * Sem este módulo, a prova desses critérios ficaria só no SQL, e o requisito
 * fala do que o artista e o curador veem.
 *
 * ## Por que a chave de serviço, e não a sessão do admin
 *
 * `devolver_claves_sem_resposta()` e `avisar_prazo_72h()` são **revogadas de
 * `authenticated`** no rodapé da migration `0010` — são jobs, e um curador
 * poder disparar a devolução da própria fila seria um buraco. `service_role`
 * mantém o grant padrão. O mesmo vale para recuar prazos: o trigger
 * `proibir_estado_terminal_de_envio` (`0006`) só barra quando
 * `current_user = 'authenticated'`.
 *
 * ## A chave nunca chega ao navegador
 *
 * Este módulo roda no processo do Node do Playwright. A chave não entra em
 * `page.evaluate`, `addInitScript`, `route.fulfill` nem em nenhum `fill()` — o
 * `page` só recebe URL e texto. Se um dia algum dado daqui precisar existir no
 * browser, o certo é um endpoint, não a chave.
 *
 * ## As duas guardas, porque o banco é compartilhado
 *
 * O projeto Supabase serve Preview, Production e a suíte ao mesmo tempo
 * (open-questions #25), e aqui a RLS não se aplica. Então:
 *
 * 1. **Toda mutação recebe id**, nunca predicado aberto. Não existe
 *    `update ... where devolucao_em < now()` neste arquivo.
 * 2. **Toda mutação confere o prefixo `e2e_`** no título da faixa e *lança* se
 *    não bater. Uma persona trocada por engano falha alto, em vez de mexer no
 *    envio de alguém real.
 *
 * A exceção consciente é `rodarDevolucaoPorSLA()`: a função varre todos os
 * envios vencidos, inclusive de contas reais. Não dá para restringi-la por
 * fora, e nem seria certo — é exatamente o que o `pg_cron` faz de hora em
 * hora. Chamá-la do teste antecipa em minutos o que o job faria sozinho, e o
 * estado final é o mesmo.
 *
 * ## O que este módulo não é
 *
 * Ele monta estado e confere efeito invisível. **Não** substitui asserção de
 * tela que exista: se o extrato mostra a devolução, quem afirma isso é o
 * `expect` sobre a tabela na tela, e o `banco.ts` só acrescenta o que a tela
 * não tem como mostrar.
 */

let cliente: SupabaseClient<Database> | null = null;

/** Nome da variável no erro — um `undefined` aqui vira 401 três camadas depois. */
function exigir(variavel: string): string {
  const valor = process.env[variavel];
  if (valor === undefined || valor.trim() === '') {
    throw new Error(
      `${variavel} não está definida. A suíte precisa dela para montar o estado ` +
        'que nenhuma tela monta (SLA, ledger, log). Defina-a em .env.local ' +
        '(local) ou como secret do job (CI). Ver README.md → Testes end-to-end.',
    );
  }
  return valor;
}

/**
 * O cliente de serviço, memoizado por processo.
 *
 * Criado à mão em vez de reaproveitar `src/lib/supabase/servico.ts`, que tem
 * `import 'server-only'` e quebra fora do bundler do Next. Só o **tipo** é
 * importado de `src/` — a mesma indireção que `apoio/textos.ts` usa.
 */
export function clienteDeServico(): SupabaseClient<Database> {
  cliente ??= createClient<Database>(
    exigir('NEXT_PUBLIC_SUPABASE_URL'),
    exigir('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return cliente;
}

function estourar(contexto: string, erro: { message: string } | null): void {
  if (erro !== null) throw new Error(`${contexto}: ${erro.message}`);
}

export type EnvioDeTeste = {
  readonly id: string;
  readonly faixaId: string;
  readonly titulo: string;
  readonly situacao: string;
  readonly prazoEm: string | null;
  readonly devolucaoEm: string | null;
  readonly avisadoPrazoEm: string | null;
  readonly totalClaves: number;
};

/**
 * O envio ativo de uma faixa de teste, pelo título.
 *
 * O título é a âncora porque é o que o seed garante e o que o spec já conhece
 * — as constantes `FAIXA_DO_C3`…`FAIXA_PARA_CONCLUIR` de `apoio/avaliacao.ts`.
 * Devolve `null` quando não há envio ativo, para o teste poder dizer "rode o
 * seed" em vez de estourar com "cannot read property of undefined".
 */
export async function envioDaFaixa(tituloDaFaixa: string): Promise<EnvioDeTeste | null> {
  const { data, error } = await clienteDeServico()
    .from('envio')
    .select(
      'id, faixa_id, situacao, prazo_em, devolucao_em, avisado_prazo_em, total_claves, faixa!inner(titulo)',
    )
    .eq('faixa.titulo', tituloDaFaixa)
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  estourar(`envioDaFaixa("${tituloDaFaixa}")`, error);
  if (data === null) return null;

  return {
    id: data.id,
    faixaId: data.faixa_id,
    titulo: tituloDaFaixa,
    situacao: data.situacao,
    prazoEm: data.prazo_em,
    devolucaoEm: data.devolucao_em,
    avisadoPrazoEm: data.avisado_prazo_em,
    totalClaves: Number(data.total_claves),
  };
}

/**
 * A guarda do prefixo. Chamada por **toda** mutação deste módulo.
 *
 * Confere no banco, e não no argumento: quem passa o id já perdeu de vista o
 * título, e é justamente aí que o engano acontece.
 */
async function exigirFaixaDeTeste(envioId: string): Promise<void> {
  const { data, error } = await clienteDeServico()
    .from('envio')
    .select('faixa!inner(titulo)')
    .eq('id', envioId)
    .maybeSingle();

  estourar(`exigirFaixaDeTeste(${envioId})`, error);

  const titulo = data?.faixa.titulo;
  if (titulo === undefined) {
    throw new Error(`envio ${envioId} não existe — o teste ia mutar o nada`);
  }
  if (!titulo.startsWith(PREFIXO_E2E)) {
    throw new Error(
      `recusado: o envio ${envioId} é da faixa "${titulo}", que não tem o prefixo ` +
        `"${PREFIXO_E2E}". Este banco também serve produção (open-questions #25); ` +
        'a suíte só muta o que ela mesma semeou.',
    );
  }
}

/** Horas (ou dias, negativos) a partir de agora, em ISO. */
function daquiA(horas: number): string {
  return new Date(Date.now() + horas * 3_600_000).toISOString();
}

/**
 * Adianta o relógio de um envio.
 *
 * É o que torna RF-069 e RF-070 testáveis sem esperar 72 horas ou 7 dias. Os
 * valores são **horas relativas a agora** — negativo é passado. Recuar
 * `devolucao_em` para o passado e chamar `rodarDevolucaoPorSLA()` encena
 * exatamente o que o job faria no sétimo dia.
 */
export async function recuarPrazos(
  envioId: string,
  horas: { readonly prazo?: number; readonly devolucao?: number; readonly limparAviso?: boolean },
): Promise<void> {
  await exigirFaixaDeTeste(envioId);

  const patch: Database['public']['Tables']['envio']['Update'] = {};
  if (horas.prazo !== undefined) patch.prazo_em = daquiA(horas.prazo);
  if (horas.devolucao !== undefined) patch.devolucao_em = daquiA(horas.devolucao);
  if (horas.limparAviso === true) patch.avisado_prazo_em = null;

  const { error } = await clienteDeServico().from('envio').update(patch).eq('id', envioId);
  estourar(`recuarPrazos(${envioId})`, error);
}

/**
 * Marca o envio como `ouviu` sem tocar áudio.
 *
 * O Playwright não reproduz mídia de verdade, e o áudio das faixas semeadas
 * nem existe no Storage. Quem prova que o **produto** faz a transição é
 * `registrarEscutaMedida` (`src/modulos/avaliacao/acoes.ts`); aqui é só o
 * atalho para que o cenário de estados do envio não dependa de escuta real.
 */
export async function marcarOuviu(envioId: string): Promise<void> {
  await exigirFaixaDeTeste(envioId);

  const { error } = await clienteDeServico()
    .from('envio')
    .update({ situacao: 'ouviu' })
    .eq('id', envioId)
    .eq('situacao', 'recebeu');

  estourar(`marcarOuviu(${envioId})`, error);
}

/**
 * Roda o job da devolução por falta de resposta. Devolve quantos envios tratou.
 *
 * ⚠️ Varre **todos** os envios vencidos, não só os de teste — ver o cabeçalho
 * deste arquivo. É o comportamento do `pg_cron`, antecipado em minutos.
 */
export async function rodarDevolucaoPorSLA(): Promise<number> {
  const { data, error } = await clienteDeServico().rpc('devolver_claves_sem_resposta', {
    p_limite: 500,
  });
  estourar('rodarDevolucaoPorSLA()', error);
  return Number(data ?? 0);
}

/** Roda o job do aviso de prazo. Idempotente por `envio.avisado_prazo_em`. */
export async function rodarAvisoDePrazo(janela = '12 hours'): Promise<number> {
  const { data, error } = await clienteDeServico().rpc('avisar_prazo_72h', {
    p_janela: janela,
    p_limite: 500,
  });
  estourar('rodarAvisoDePrazo()', error);
  return Number(data ?? 0);
}

/**
 * Notificações de um perfil, por evento, criadas depois de `desde`.
 *
 * O `desde` não é conveniência: as personas são reutilizadas entre execuções e
 * `notificacao` é append-only, então sem a janela o teste contaria os avisos de
 * ontem. O corpo do evento vive em `contexto` (jsonb) — é lá que está o
 * `envio_id` que `avisar_prazo_72h` grava.
 */
export async function notificacoesDe(
  perfilId: string,
  evento: string,
  desde: Date,
): Promise<readonly { readonly contexto: unknown; readonly criadoEm: string }[]> {
  const { data, error } = await clienteDeServico()
    .from('notificacao')
    .select('contexto, criado_em')
    .eq('perfil_id', perfilId)
    .eq('evento', evento)
    .gte('criado_em', desde.toISOString());

  estourar(`notificacoesDe(${perfilId}, ${evento})`, error);
  return (data ?? []).map((linha) => ({ contexto: linha.contexto, criadoEm: linha.criado_em }));
}

/**
 * Ganhos do curador por envio. Vazio é a metade do RF-070 que nenhuma tela mostra.
 *
 * `ganho_curador` não tem `envio_id`: ele pendura em `avaliacao_id`, porque o
 * ganho nasce da avaliação concluída, não do envio. O join é o caminho certo,
 * e não um detalhe de conveniência.
 */
export async function ganhosDoEnvio(envioId: string): Promise<readonly { readonly id: string }[]> {
  const { data, error } = await clienteDeServico()
    .from('ganho_curador')
    .select('id, avaliacao!inner(envio_id)')
    .eq('avaliacao.envio_id', envioId);

  estourar(`ganhosDoEnvio(${envioId})`, error);
  return (data ?? []).map((linha) => ({ id: linha.id }));
}

/** Lançamentos de Clave por envio, com o tipo — `devolucao`, `consumo`, … */
export async function lancamentosDoEnvio(
  envioId: string,
): Promise<readonly { readonly tipo: string; readonly quantidade: number }[]> {
  const { data, error } = await clienteDeServico()
    .from('lancamento_clave')
    .select('tipo, quantidade')
    .eq('envio_id', envioId);

  estourar(`lancamentosDoEnvio(${envioId})`, error);
  return (data ?? []).map((l) => ({ tipo: l.tipo, quantidade: Number(l.quantidade) }));
}

/**
 * O rastro de auditoria de um registro (RF-051, RF-053).
 *
 * A tabela é `log_auditoria` (migration `0003`); o trigger de `pacote_clave`
 * entra na `0007`. Lembrar que a exclusão de pacote é **lógica** desde a
 * `0007b`: o que se espera é um `update` com `excluido_em` preenchido, nunca
 * uma linha `delete`.
 */
export async function auditoriaDe(
  tabela: string,
  registroId: string,
): Promise<
  readonly {
    readonly acao: string;
    readonly atorId: string | null;
    readonly depois: Record<string, unknown> | null;
  }[]
> {
  const { data, error } = await clienteDeServico()
    .from('log_auditoria')
    .select('acao, ator_id, depois')
    .eq('tabela', tabela)
    .eq('registro_id', registroId)
    .order('criado_em');

  estourar(`auditoriaDe(${tabela}, ${registroId})`, error);
  return (data ?? []).map((l) => ({
    acao: l.acao,
    atorId: l.ator_id,
    depois: l.depois as Record<string, unknown> | null,
  }));
}

/**
 * O pedido de Claves mais recente de uma conta, cru.
 *
 * Devolve a linha inteira de propósito: o RF-045 afirma que **nenhum** campo
 * carrega o cartão, e listar colunas deixaria a asserção cega justamente para a
 * coluna que alguém acrescentasse amanhã.
 */
export async function ultimoPedidoDe(email: string): Promise<Record<string, unknown> | null> {
  const perfilId = await perfilPorEmail(email);
  if (perfilId === null) return null;

  const { data: artista, error: erroDoArtista } = await clienteDeServico()
    .from('perfil_artista')
    .select('id')
    .eq('perfil_id', perfilId)
    .maybeSingle();

  estourar(`ultimoPedidoDe("${email}") · perfil_artista`, erroDoArtista);
  if (artista === null) return null;

  const { data, error } = await clienteDeServico()
    .from('pedido_clave')
    .select('*')
    .eq('perfil_artista_id', artista.id)
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  estourar(`ultimoPedidoDe("${email}")`, error);
  return data as Record<string, unknown> | null;
}

/**
 * O ambiente em uso gravado no perfil (RF-008).
 *
 * `RegistrarAmbiente` grava num `useEffect`, **depois** da pintura, e só quando
 * o ambiente muda. Um teste que navegue e siga em frente corre com essa escrita
 * — daí existir esta leitura, para esperar pelo efeito em vez de por tempo.
 */
export async function ambienteDoPerfil(email: string): Promise<string | null> {
  const perfilId = await perfilPorEmail(email);
  if (perfilId === null) return null;

  const { data, error } = await clienteDeServico()
    .from('perfil')
    .select('ultimo_ambiente')
    .eq('id', perfilId)
    .maybeSingle();

  estourar(`ambienteDoPerfil("${email}")`, error);
  return data?.ultimo_ambiente ?? null;
}

/**
 * Devolve `ultimo_ambiente` ao valor que o seed dá.
 *
 * É **restauração de fixture**, e não encenação de comportamento: o produto
 * grava esse campo por `RegistrarAmbiente`, num efeito de cliente, e o teste
 * que prova isso já o exerce pela tela. Restaurar pela interface obrigaria a
 * esperar o mesmo efeito dentro de um `afterAll` que está fechando o contexto —
 * uma corrida que já falhou, e cujo sintoma aparece no teste **seguinte**.
 */
export async function restaurarAmbienteDoPerfil(email: string, ambiente: string): Promise<void> {
  const perfilId = await perfilPorEmail(email);
  if (perfilId === null) return;

  const { error } = await clienteDeServico()
    .from('perfil')
    .update({ ultimo_ambiente: ambiente as Database['public']['Enums']['papel'] })
    .eq('id', perfilId);

  estourar(`restaurarAmbienteDoPerfil("${email}")`, error);
}

/**
 * Devolve o rascunho do curador ao passo 1.
 *
 * Restauração de fixture. Os cenários do wizard **avançam** o passo — é o que
 * eles provam —, e o passo é estado de conta, não de teste: sem a volta, o
 * segundo teste do arquivo encontra a retomada abrindo onde o primeiro parou, e
 * a falha diz "esperava o passo 1" como se o produto estivesse errado.
 */
export async function reporRascunhoDoCurador(email: string): Promise<void> {
  const perfilId = await perfilPorEmail(email);
  if (perfilId === null) return;

  const { error } = await clienteDeServico()
    .from('perfil_curador')
    .update({ passo_cadastro: 1 })
    .eq('perfil_id', perfilId);

  estourar(`reporRascunhoDoCurador("${email}")`, error);
}

/**
 * Apaga as mídias `e2e_` de um curador.
 *
 * Restauração de fixture. O cenário 12.6 **insere** mídia — é o que ele prova —,
 * e insere de novo a cada execução. Sem a limpeza, a segunda rodada encontra
 * duas linhas com o mesmo nome, e o seletor por texto estoura em modo estrito
 * com uma mensagem que fala de ambiguidade, não de acúmulo.
 *
 * Só o que tem o prefixo: o que o curador cadastrou de verdade não é da suíte.
 */
export async function limparMidiasDeTeste(email: string): Promise<void> {
  const perfilId = await perfilPorEmail(email);
  if (perfilId === null) return;

  const supabase = clienteDeServico();

  const { data: curador, error: erroDoCurador } = await supabase
    .from('perfil_curador')
    .select('id')
    .eq('perfil_id', perfilId)
    .maybeSingle();
  estourar(`limparMidiasDeTeste("${email}") · perfil_curador`, erroDoCurador);
  if (curador === null) return;

  const { error } = await supabase
    .from('midia_curador')
    .delete()
    .eq('perfil_curador_id', curador.id)
    .like('nome', `${PREFIXO_E2E}%`);

  estourar(`limparMidiasDeTeste("${email}")`, error);
}

/**
 * Zera as credenciais de um curador em rascunho.
 *
 * Restauração de fixture, e não encenação: o passo 6 acumula entre testes de um
 * arquivo serial, e uma credencial marcada sem prova por um teste faz o
 * **seguinte** falhar na validação — com a mensagem certa, no lugar errado.
 * Limpar antes de cada teste é o que dá a cada um o mesmo ponto de partida.
 */
export async function limparCredenciais(email: string): Promise<void> {
  const perfilId = await perfilPorEmail(email);
  if (perfilId === null) return;

  const supabase = clienteDeServico();

  const { data: curador, error: erroDoCurador } = await supabase
    .from('perfil_curador')
    .select('id')
    .eq('perfil_id', perfilId)
    .maybeSingle();
  estourar(`limparCredenciais("${email}") · perfil_curador`, erroDoCurador);
  if (curador === null) return;

  const { error } = await supabase
    .from('credencial_curador')
    .delete()
    .eq('perfil_curador_id', curador.id);

  estourar(`limparCredenciais("${email}")`, error);
}

/**
 * O caminho da foto gravado no perfil, ou `null`.
 *
 * É a prova do **caminho de escrita** em `avatares`: desde que a foto sobe do
 * navegador direto ao bucket, esta coluna é o que diz se o caminho chegou
 * inteiro do cliente à tabela, sob a pasta da própria pessoa.
 */
export async function fotoDoPerfil(email: string): Promise<string | null> {
  const perfilId = await perfilPorEmail(email);
  if (perfilId === null) return null;

  const { data, error } = await clienteDeServico()
    .from('perfil')
    .select('foto_caminho')
    .eq('id', perfilId)
    .maybeSingle();

  estourar(`fotoDoPerfil("${email}")`, error);
  return data?.foto_caminho ?? null;
}

/**
 * Tira a foto do perfil e do bucket.
 *
 * Restauração de fixture. O cenário do passo 1 **envia** uma foto — é o que ele
 * prova —, e `foto_caminho` é estado de conta, não de teste: sem a volta, a
 * segunda execução encontra "Foto enviada" onde esperava a dica, e a falha diz
 * respeito ao texto em vez do acúmulo que a causou.
 *
 * O objeto sai junto, e não só a coluna. `avatares` é bucket **público**: deixar
 * `<uid>/perfil.jpg` lá é deixar um arquivo da suíte legível por qualquer um,
 * para sempre — e o expurgo da `0011` não apaga objeto de Storage, porque SQL
 * não fala com a Storage API.
 *
 * Só personas da suíte: o domínio `@e2e.dissona.local` não é roteável, e o
 * banco também serve produção.
 */
export async function limparFotoDoPerfil(email: string): Promise<void> {
  if (!email.endsWith(`@${DOMINIO_E2E}`)) {
    throw new Error(`recusado: "${email}" não é do domínio "${DOMINIO_E2E}"`);
  }

  const perfilId = await perfilPorEmail(email);
  if (perfilId === null) return;

  const supabase = clienteDeServico();
  const caminho = await fotoDoPerfil(email);

  const { error } = await supabase.from('perfil').update({ foto_caminho: null }).eq('id', perfilId);
  estourar(`limparFotoDoPerfil("${email}")`, error);

  // O caminho gravado é sempre `<uid>/…`, e o `<uid>` é o do próprio perfil —
  // conferir isso é o que impede um caminho torto de virar um `remove` alheio.
  if (caminho === null || !caminho.startsWith(`${perfilId}/`)) return;

  const { error: erroDoObjeto } = await supabase.storage.from('avatares').remove([caminho]);
  estourar(`limparFotoDoPerfil("${email}") · storage`, erroDoObjeto);
}

/**
 * O caminho do anexo de formação gravado para o curador, ou `null`.
 *
 * Existe para provar o **caminho de escrita** em `materiais`, que nenhum teste
 * alcançava: os dois cenários de anexo eram negativos, e o upload válido não
 * tinha prova nenhuma. Desde que o arquivo sobe do navegador direto ao bucket,
 * é esta coluna que diz se o caminho chegou inteiro do cliente à tabela.
 */
export async function anexoDaCredencial(email: string): Promise<string | null> {
  const perfilId = await perfilPorEmail(email);
  if (perfilId === null) return null;

  const supabase = clienteDeServico();

  const { data: curador, error: erroDoCurador } = await supabase
    .from('perfil_curador')
    .select('id')
    .eq('perfil_id', perfilId)
    .maybeSingle();
  estourar(`anexoDaCredencial("${email}") · perfil_curador`, erroDoCurador);
  if (curador === null) return null;

  const { data, error } = await supabase
    .from('credencial_curador')
    .select('anexo_caminho')
    .eq('perfil_curador_id', curador.id)
    .eq('tipo', 'formacao')
    .maybeSingle();

  estourar(`anexoDaCredencial("${email}")`, error);
  return data?.anexo_caminho ?? null;
}

/** `rascunho` ou `concluida` — o que distingue trabalho salvo de crédito liberado. */
export async function situacaoDaAvaliacao(envioId: string): Promise<string | null> {
  const { data, error } = await clienteDeServico()
    .from('avaliacao')
    .select('situacao')
    .eq('envio_id', envioId)
    .maybeSingle();

  estourar(`situacaoDaAvaliacao(${envioId})`, error);
  return data?.situacao ?? null;
}

/** A escuta já medida e gravada para o envio, em percentual. */
export async function escutaDoEnvio(envioId: string): Promise<number> {
  const { data, error } = await clienteDeServico()
    .from('avaliacao')
    .select('escuta_percentual')
    .eq('envio_id', envioId)
    .maybeSingle();

  estourar(`escutaDoEnvio(${envioId})`, error);
  return Number(data?.escuta_percentual ?? 0);
}

/**
 * Põe um áudio que toca de verdade no Storage da faixa.
 *
 * As faixas semeadas têm `arquivo_caminho` apontando para um objeto que não
 * existe — e isso é deliberado na maioria dos cenários, porque o Playwright não
 * reproduz mídia e o que eles precisam é do rascunho, não do som. Mas sem
 * objeto no bucket `createSignedUrl` falha, `audioUrl` vem `null`, e o
 * `PlayerComMedicao` troca o player por um aviso: **não há o que tocar**.
 *
 * O cenário dos estados do envio é o único que precisa da escuta acontecer de
 * verdade, porque é ela que carimba `ouviu`. O arquivo é o `e2e-faixa.mp3` de
 * `e2e/apoio/arquivos/`, que tem cerca de um segundo — a faixa inteira toca no
 * tempo de um teste, e o medidor credita 100% sem ninguém forjar nada.
 *
 * O upload não cabe em `dados-e2e.sql`: Storage é API, não SQL. Por isso mora
 * aqui, com `upsert`, e é chamado pelo próprio cenário.
 */
export async function garantirAudioDaFaixa(tituloDaFaixa: string): Promise<void> {
  const supabase = clienteDeServico();

  const { data: faixa, error } = await supabase
    .from('faixa')
    .select('arquivo_caminho')
    .eq('titulo', tituloDaFaixa)
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  estourar(`garantirAudioDaFaixa("${tituloDaFaixa}")`, error);

  const caminho = faixa?.arquivo_caminho;
  if (caminho === undefined || caminho === null || caminho.trim() === '') {
    throw new Error(`a faixa "${tituloDaFaixa}" não tem arquivo_caminho — rode o seed`);
  }
  if (!tituloDaFaixa.startsWith(PREFIXO_E2E)) {
    throw new Error(`recusado: "${tituloDaFaixa}" não tem o prefixo "${PREFIXO_E2E}"`);
  }

  const mp3 = readFileSync(join(process.cwd(), 'e2e', 'apoio', 'arquivos', 'e2e-faixa.mp3'));

  const { error: erroDoUpload } = await supabase.storage
    .from('faixas')
    .upload(caminho, mp3, { contentType: 'audio/mpeg', upsert: true });

  estourar(`upload do áudio de "${tituloDaFaixa}"`, erroDoUpload);
}

/**
 * O id de um pacote pelo nome, para amarrar a ação da tela ao rastro no log.
 *
 * O nome vem de `nomeUnico()`, então é único por worker e por execução — não há
 * ambiguidade nem entre execuções concorrentes. Inclui os logicamente
 * excluídos, porque o rastro da exclusão é justamente o que se quer conferir.
 */
export async function pacotePorNome(nome: string): Promise<string | null> {
  const { data, error } = await clienteDeServico()
    .from('pacote_clave')
    .select('id')
    .eq('nome', nome)
    .maybeSingle();

  estourar(`pacotePorNome("${nome}")`, error);
  return data?.id ?? null;
}

/**
 * O `perfil.id` de uma persona, para conferir o `ator_id` do log.
 *
 * Vai pelo Auth admin, e não por `select` em `perfil`: a migration `0002e`
 * **tirou o e-mail de `perfil`** — ele vive só em `auth.users`, que o PostgREST
 * não expõe. O id é o mesmo nos dois lados, porque o trigger
 * `criar_perfil_para_novo_usuario` cria o perfil com o id do usuário.
 */
export async function perfilPorEmail(email: string): Promise<string | null> {
  const { data, error } = await clienteDeServico().auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  estourar(`perfilPorEmail("${email}")`, error);
  return data.users.find((usuario) => usuario.email === email)?.id ?? null;
}

/** O limite de upload em MB, de `configuracao` — nunca o `50` literal. */
export async function limiteDeUploadMb(): Promise<number> {
  const { data, error } = await clienteDeServico()
    .from('configuracao')
    .select('valor')
    .eq('chave', 'upload.tamanho_max_mb')
    .maybeSingle();

  estourar('limiteDeUploadMb()', error);
  const valor = Number(data?.valor);
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error('configuracao.upload.tamanho_max_mb ausente ou inválida — rode as migrations');
  }
  return valor;
}
