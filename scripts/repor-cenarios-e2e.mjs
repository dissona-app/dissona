/**
 * Repõe as faixas que os cenários da suíte E2E consomem.
 *
 * ## Por que existe
 *
 * Sete cenários terminam em estado terminal e **gastam** a faixa deles: C6
 * conclui, o de atomicidade e o de devolução por SLA devolvem, o de estados
 * fecha o ciclo em `pronto`. Um envio `pronto` ou `devolvido` não volta — e é
 * assim que tem de ser, senão o teste não estaria provando nada.
 *
 * A consequência prática é que a suíte completa precisa de reposição **antes de
 * cada execução**, e a falha, quando falta, é sempre a mesma: *"a fila precisa
 * listar … — rode supabase/testes/dados-e2e.sql"*.
 *
 * O `dados-e2e.sql` faz isso, mas ele exige a senha das personas
 * (`dissona.e2e_senha`) porque também cria contas — e digitar uma senha de
 * conta `admin` num projeto que serve produção, toda vez que se quer rodar a
 * suíte, é atrito que acaba em alguém deixando a senha no histórico do shell.
 * Repor faixa não precisa de senha nenhuma.
 *
 * ## Como ele faz o que o SQL fazia com `set_config`
 *
 * `confirmar_selecao_curadores` confere a propriedade da faixa contra
 * `auth.uid()`, e `security definer` não contorna isso. O SQL resolvia forjando
 * o JWT com `set_config('request.jwt.claims', …)`. Aqui não é preciso forjar
 * nada: o script **entra** como o artista, com a mesma senha que a suíte usa, e
 * chama a RPC pelo mesmo caminho que a tela chama. É mais fiel do que o SQL era.
 *
 * A chave de serviço entra só onde a RLS legitimamente barra o artista: criar o
 * rascunho de `avaliacao`, que é do curador.
 *
 * ## Idempotente
 *
 * Cada faixa é criada apenas se **não houver envio ativo** com aquele título
 * para aquele curador — a mesma condição que o SQL usava. Rodar duas vezes não
 * duplica; rodar com tudo no lugar não faz nada.
 *
 * Uso: `pnpm e2e:semear`
 */

import { readFileSync } from 'node:fs';

import { createClient } from '@supabase/supabase-js';

/**
 * Lê o `.env.local`, sem sobrescrever o que já está no ambiente.
 *
 * É o gêmeo de `carregarEnvLocal` em `e2e/setup/ambiente.ts`, e não um import
 * dele: este arquivo é `.mjs` e aquele é `.ts`, e num projeto sem
 * `"type": "module"` o Node reclama da ambiguidade a cada execução. São dez
 * linhas; a regra que importa — **nunca sobrescrever** — está nas duas, porque
 * no CI o valor vem do secret do job e ele tem de vencer.
 */
function carregarEnvLocal(raiz = process.cwd()) {
  let conteudo;
  try {
    conteudo = readFileSync(`${raiz}/.env.local`, 'utf8');
  } catch {
    return;
  }

  for (const linha of conteudo.split(/\r?\n/)) {
    const casado = /^([A-Z0-9_]+)=(.*)$/.exec(linha.trim());
    if (casado === null) continue;
    const [, chave, bruto] = casado;
    if (process.env[chave] !== undefined) continue;
    process.env[chave] = bruto.trim().replace(/^['"]|['"]$/g, '');
  }
}

/** Os cenários consumíveis, por curador. Espelha `e2e/apoio/avaliacao.ts`. */
const CENARIOS = [
  {
    curador: 'e2e_bronze@e2e.dissona.local',
    faixas: [
      'e2e_Faixa em curadoria',
      'e2e_Faixa do C3',
      'e2e_Faixa do C4',
      'e2e_Faixa do C5',
      'e2e_Faixa do C6',
      'e2e_Faixa para concluir',
    ],
  },
  {
    curador: 'e2e_curador_sla@e2e.dissona.local',
    faixas: [
      'e2e_Faixa do C7',
      'e2e_Faixa da atomicidade',
      'e2e_Faixa do aviso',
      'e2e_Faixa da devolucao',
      'e2e_Faixa dos estados',
    ],
  },
];

/**
 * Duas faixas nascem **sem** rascunho de avaliação.
 *
 * A regra geral é o contrário: todas vêm com a escuta já em 100%, porque o
 * Playwright não reproduz mídia e sem isso o gate `DS001` mascararia o cenário.
 * As exceções são as duas em que o rascunho **é** o que o teste observa:
 *
 * - `e2e_Faixa do aviso` — o aviso de 72h não depende de escuta, e criar o
 *   rascunho só encobriria o que o cenário quer ver.
 * - `e2e_Faixa dos estados` — `e2e/sla/s3` sobe áudio de verdade e **mede a
 *   escuta tocando**, para provar os quatro estados do RF-071. Com a escuta já
 *   em 100 no banco, o player nasce com `escutaSalva = 100`, nada cresce,
 *   `registrarEscutaMedida` nunca é chamada e `ouviu` nunca é carimbada — o
 *   cenário falha num ponto que não tem nada a ver com o que ele testa.
 */
const SEM_RASCUNHO = new Set(['e2e_Faixa do aviso', 'e2e_Faixa dos estados']);

/**
 * Devolve ao ponto de partida um cenário de `SEM_RASCUNHO` que ainda está ativo.
 *
 * Criar o que falta não basta para estes dois: o envio continua "ativo" depois
 * de uma execução interrompida, então a reposição o pula — e ele fica com o
 * rascunho que o teste anterior criou. Foi assim que `e2e/sla/s3` passou sozinho
 * e falhou na suíte: o player nasceu com `escutaSalva = 100`, nada cresceu,
 * `registrarEscutaMedida` nunca foi chamada e `ouviu` nunca foi carimbada.
 *
 * Restauração de fixture, e não encenação: o que se desfaz é exatamente o que a
 * execução anterior escreveu, e o estado que sobra é o que
 * `confirmar_selecao_curadores` deixaria.
 */
async function restaurarSemRascunho(titulo, envioId) {
  if (!SEM_RASCUNHO.has(titulo)) return;

  const { error: erroDoRascunho } = await servico
    .from('avaliacao')
    .delete()
    .eq('envio_id', envioId);
  estourar(`limpar o rascunho de "${titulo}"`, erroDoRascunho);

  const { error: erroDaSituacao } = await servico
    .from('envio')
    .update({ situacao: 'recebeu' })
    .eq('id', envioId)
    .neq('situacao', 'recebeu');
  estourar(`devolver "${titulo}" a recebeu`, erroDaSituacao);
}

/**
 * Devolve ao ponto de partida os prazos de um envio que já existia.
 *
 * Um cenário reusado envelhece: `prazo_em` é `criado_em + prazo_avaliacao_horas`
 * e não se renova, então três dias depois o envio está **atrasado** — e um teste
 * que afirma a remuneração "dentro das 72h" passa a ver a de atraso. Foi assim
 * que `c6-remuneracao-por-classe` ficou vermelho: nada nele mudou, o relógio é
 * que passou do prazo entre uma execução e a seguinte.
 *
 * Renovar aqui é seguro para quem envelhece prazo de propósito — `e2e/sla/s1` e
 * `s2` chamam `recuarPrazos` dentro do próprio teste, então o que eles precisam
 * é justamente de um ponto de partida limpo.
 *
 * Os números vêm de `configuracao`, nunca escritos aqui: são os mesmos que
 * `confirmar_selecao_curadores` usou para criar o envio.
 */
async function renovarPrazos(titulo, envioId) {
  const agora = Date.now();

  const { error } = await servico
    .from('envio')
    .update({
      prazo_em: new Date(agora + prazoEmHoras * 3_600_000).toISOString(),
      devolucao_em: new Date(agora + devolucaoEmDias * 86_400_000).toISOString(),
      avisado_prazo_em: null,
    })
    .eq('id', envioId);
  estourar(`renovar os prazos de "${titulo}"`, error);
}

const ARTISTA = 'e2e_artista@e2e.dissona.local';

const ativos = ['recebeu', 'ouviu', 'avaliando'];

function exigir(nome) {
  const valor = process.env[nome];
  if (valor === undefined || valor.trim() === '') {
    throw new Error(
      `${nome} não está definida. Ela vem do .env.local — ver README.md → Testes end-to-end.`,
    );
  }
  return valor;
}

function estourar(contexto, erro) {
  if (erro) throw new Error(`${contexto}: ${erro.message}`);
}

carregarEnvLocal();

const url = exigir('NEXT_PUBLIC_SUPABASE_URL');
const servico = createClient(url, exigir('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Os prazos do SLA, de `configuracao` — nunca o `72` e o `7` literais.
 *
 * São os mesmos que `confirmar_selecao_curadores` usa ao criar o envio, e é o
 * que faz `renovarPrazos` devolver exatamente o ponto de partida.
 */
async function lerPrazos() {
  const { data, error } = await servico
    .from('configuracao')
    .select('chave, valor')
    .in('chave', ['prazo_avaliacao_horas', 'prazo_devolucao_dias']);
  estourar('ler os prazos de configuracao', error);

  const por = Object.fromEntries((data ?? []).map((linha) => [linha.chave, Number(linha.valor)]));
  if (
    !Number.isFinite(por['prazo_avaliacao_horas']) ||
    !Number.isFinite(por['prazo_devolucao_dias'])
  ) {
    throw new Error('configuracao sem prazo_avaliacao_horas ou prazo_devolucao_dias');
  }
  return por;
}

const prazos = await lerPrazos();
const prazoEmHoras = prazos['prazo_avaliacao_horas'];
const devolucaoEmDias = prazos['prazo_devolucao_dias'];

/** O cliente do artista, autenticado — é ele que cria faixa e confirma seleção. */
const artista = createClient(url, exigir('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: sessao, error: erroDoLogin } = await artista.auth.signInWithPassword({
  email: ARTISTA,
  password: exigir('E2E_SENHA'),
});
estourar(`entrar como ${ARTISTA}`, erroDoLogin);

const perfilDoArtista = sessao.user.id;

const { data: linhaDoArtista, error: erroDoArtista } = await servico
  .from('perfil_artista')
  .select('id')
  .eq('perfil_id', perfilDoArtista)
  .maybeSingle();
estourar('perfil_artista do artista', erroDoArtista);
if (linhaDoArtista === null) {
  throw new Error(`${ARTISTA} não tem perfil_artista — rode supabase/testes/dados-e2e.sql antes`);
}

/**
 * Recarrega a carteira quando o saldo não cobre as reposições.
 *
 * Cada cenário custa 2 Claves (`feedback`), e onze cenários mais o que a suíte
 * gasta esvaziam a carteira em poucas execuções — aí `confirmar_selecao_curadores`
 * passa a recusar com `DS010` e a falha aponta para o lugar errado.
 *
 * A compra é encenada pelo caminho real, e cada metade pelo cliente certo:
 * `criar_pedido_clave` é do artista (`authenticated`), e `confirmar_pedido_clave`
 * é **revogada** dele — é o webhook do gateway que confirma, e aqui quem faz
 * esse papel é a chave de serviço.
 */
async function recarregarSePreciso() {
  const { data: saldo } = await servico
    .from('saldo_carteira')
    .select('disponivel')
    .eq('perfil_artista_id', linhaDoArtista.id)
    .maybeSingle();

  if (Number(saldo?.disponivel ?? 0) >= 30) return;

  const { data: pacote, error: erroDoPacote } = await servico
    .from('pacote_clave')
    .select('id')
    .eq('ativo', true)
    .is('excluido_em', null)
    .order('quantidade_claves', { ascending: false })
    .limit(1)
    .maybeSingle();
  estourar('achar um pacote ativo', erroDoPacote);
  if (pacote === null) throw new Error('nenhum pacote ativo — rode supabase/testes/dados-e2e.sql');

  const { data: pedidoId, error: erroDoPedido } = await artista.rpc('criar_pedido_clave', {
    p_pacote_id: pacote.id,
    p_meio: 'pix',
  });
  estourar('criar o pedido de recarga', erroDoPedido);

  const { error: erroDaConfirmacao } = await servico.rpc('confirmar_pedido_clave', {
    p_pedido_id: pedidoId,
  });
  estourar('confirmar o pedido de recarga', erroDaConfirmacao);

  console.log('· carteira recarregada');
}

await recarregarSePreciso();

let repostas = 0;
let jaEstavam = 0;

for (const cenario of CENARIOS) {
  const { data: usuarios } = await servico.auth.admin.listUsers({ page: 1, perPage: 200 });
  const perfilDoCurador = usuarios.users.find((u) => u.email === cenario.curador)?.id;
  if (perfilDoCurador === undefined) {
    console.log(`· ${cenario.curador} não existe ainda — rode dados-e2e.sql`);
    continue;
  }

  const { data: curador, error: erroDoCurador } = await servico
    .from('perfil_curador')
    .select('id')
    .eq('perfil_id', perfilDoCurador)
    .maybeSingle();
  estourar(`perfil_curador de ${cenario.curador}`, erroDoCurador);
  if (curador === null) {
    console.log(`· ${cenario.curador} sem perfil_curador — rode dados-e2e.sql`);
    continue;
  }

  for (const titulo of cenario.faixas) {
    const { data: existente, error: erroDaBusca } = await servico
      .from('envio')
      .select('id, faixa!inner(titulo)')
      .eq('perfil_curador_id', curador.id)
      .eq('faixa.titulo', titulo)
      .in('situacao', ativos)
      .limit(1);
    estourar(`procurar envio ativo de "${titulo}"`, erroDaBusca);

    if ((existente ?? []).length > 0) {
      await restaurarSemRascunho(titulo, existente[0].id);
      await renovarPrazos(titulo, existente[0].id);
      jaEstavam += 1;
      continue;
    }

    // A faixa é criada **pelo artista**, sob RLS — o mesmo caminho da tela.
    const caminho = `${perfilDoArtista}/${titulo.toLowerCase().replaceAll(' ', '-')}.mp3`;
    const { data: faixa, error: erroDaFaixa } = await artista
      .from('faixa')
      .insert({
        perfil_artista_id: linhaDoArtista.id,
        titulo,
        genero: 'Indie',
        origem: 'arquivo',
        arquivo_caminho: caminho,
        duracao_segundos: 201,
        contexto_curador: 'Faixa da suite automatizada: um cenario por envio.',
        situacao: 'rascunho',
      })
      .select('id')
      .single();
    estourar(`criar a faixa "${titulo}"`, erroDaFaixa);

    const { data: envios, error: erroDaSelecao } = await artista.rpc(
      'confirmar_selecao_curadores',
      {
        p_faixa_id: faixa.id,
        p_selecao: [{ perfil_curador_id: curador.id, servicos: ['feedback'] }],
      },
    );
    estourar(`confirmar seleção de "${titulo}"`, erroDaSelecao);

    const envioId = Array.isArray(envios) ? envios[0] : envios;

    if (!SEM_RASCUNHO.has(titulo)) {
      const { error: erroDoRascunho } = await servico.from('avaliacao').insert({
        envio_id: envioId,
        perfil_curador_id: curador.id,
        escuta_percentual: 100,
        passo_atual: 1,
      });
      estourar(`criar o rascunho de "${titulo}"`, erroDoRascunho);
    }

    repostas += 1;
    console.log(`· ${titulo} → ${cenario.curador}`);
  }
}

console.log(
  repostas === 0
    ? `Nada a repor: ${jaEstavam} cenários já estavam no lugar.`
    : `${repostas} cenário(s) reposto(s); ${jaEstavam} já estavam no lugar.`,
);
