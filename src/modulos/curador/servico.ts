import 'server-only';

/**
 * Regra do cadastro do curador — módulo 12.
 *
 * Cada passo tem uma função, e todas terminam do mesmo jeito: gravam, avançam o
 * marcador de retomada e devolvem o destino. O destino vem daqui, e não da
 * ação, porque a sequência dos oito passos é regra de negócio — é ela que
 * define que o passo 8 leva à classificação e não ao painel.
 *
 * Nada aqui escreve `classe`, `situacao` ou `classificado_em`: o trigger da
 * `0002` recusa, e o único caminho é `concluir_cadastro_curador` (0002c).
 */

import { caminhoEhDoUsuario } from '@/lib/armazenamento';
import { ROTA } from '@/lib/guarda-rota';
import { usuarioAtual } from '@/lib/supabase/servidor';
import { CURADOR_CADASTRO } from '@/textos/curador';

import {
  ANEXO_MAX_BYTES,
  ANEXO_TIPOS,
  FOTO_MAX_BYTES,
  FOTO_TIPOS,
  conferirArquivo,
  conferirObjeto,
} from './esquemas';
import {
  atualizarCanal,
  avancarPasso,
  concluirCadastro,
  inserirCanal,
  lerEstadoDoCadastro,
  metadadosDoArquivo,
  removerCanal,
  salvarAtuacaoDoCurador,
  salvarBioDoCurador,
  salvarFotoDoPerfil,
  salvarGenerosDoCurador,
  salvarServicos,
  subirArquivo,
  substituirCanais,
  substituirCredenciais,
} from './repositorio';
import type { CanalParaSalvar, CredencialParaSalvar, ServicoParaSalvar } from './repositorio';
import type { EstadoDoCadastro, PassoDoCadastro, TipoDeCredencial } from './tipos';
import { CREDENCIAL_POR_ANEXO, TOTAL_DE_PASSOS } from './tipos';

/**
 * Por que a recusa de arquivo tem quatro motivos e não dois.
 *
 * `tipo` e `tamanho` são a validação de sempre. Os outros dois nasceram com o
 * upload direto ao Storage, e respondem a perguntas diferentes:
 *
 * - `alheio` — o caminho informado não está sob a pasta da pessoa. É checagem
 *   determinística e local: ninguém digita isso por engano, então é fraude, e a
 *   resposta é `NAO_AUTORIZADO`.
 * - `ausente` — o caminho tem a forma certa, mas o Storage não devolve objeto.
 *   Pode ser upload que falhou em silêncio, corrida entre abas, ou objeto de
 *   outra pessoa escondido pela RLS. É ambíguo por construção, e o remédio de
 *   quem é honesto é recarregar.
 */
export type MotivoDeArquivo = 'tipo' | 'tamanho' | 'ausente' | 'alheio';

export type ResultadoDoPasso =
  | { readonly estado: 'ok'; readonly destino: string }
  | { readonly estado: 'sem_cadastro' }
  | { readonly estado: 'arquivo_invalido'; readonly motivo: MotivoDeArquivo };

/** A rota de um passo. Um lugar só monta a URL do wizard. */
export function rotaDoPasso(passo: PassoDoCadastro): string {
  return `${ROTA.CURADOR_CADASTRO}/${passo}`;
}

/**
 * Onde ir depois de gravar um passo.
 *
 * O passo 8 leva à classificação; os outros, ao seguinte. É a única regra de
 * sequência do wizard, e ela mora aqui em vez de em oito ações.
 */
function proximoDestino(passo: PassoDoCadastro): string {
  if (passo >= TOTAL_DE_PASSOS) return ROTA.CURADOR_CADASTRO_CLASSIFICACAO;
  return rotaDoPasso((passo + 1) as PassoDoCadastro);
}

/**
 * Grava o avanço e devolve o destino.
 *
 * O marcador vai para o passo **seguinte**, e não para o atual: `passo_cadastro`
 * responde "onde retomar", e retomar no passo que a pessoa acabou de concluir a
 * faria refazê-lo.
 */
async function avancarDe(
  estado: EstadoDoCadastro,
  passo: PassoDoCadastro,
): Promise<ResultadoDoPasso> {
  if (passo < TOTAL_DE_PASSOS) {
    await avancarPasso(estado.perfilCuradorId, (passo + 1) as PassoDoCadastro);
  }
  return { estado: 'ok', destino: proximoDestino(passo) };
}

async function estadoOuFalha(): Promise<EstadoDoCadastro | null> {
  return lerEstadoDoCadastro();
}

type ArquivoResolvido =
  | { readonly ok: true; readonly caminho: string | null }
  | { readonly ok: false; readonly motivo: MotivoDeArquivo };

/**
 * As duas origens possíveis de um arquivo do wizard, resolvidas num caminho.
 *
 * **Caminho** é o navegador tendo subido direto ao bucket — o normal desde que
 * o anexo de 5 MB deixou de caber no corpo de uma Server Action na Vercel.
 * **Arquivo** é o `multipart` de sempre, que continua existindo para quem está
 * sem JavaScript.
 *
 * A ordem interna importa. `caminhoEhDoUsuario` vem **antes** da leitura do
 * Storage: sem isso o servidor iria ao bucket por causa de uma string arbitrária
 * vinda do formulário, e o próprio pedido já contaria se o objeto existe.
 *
 * No sucesso devolve o caminho **que o cliente mandou**, e não um recalculado. É
 * o `data.path` que o Storage respondeu; remontá-lo aqui reintroduziria a chance
 * de cliente e servidor discordarem sobre a extensão.
 */
async function resolverArquivo(
  usuarioId: string,
  balde: 'avatares' | 'materiais',
  nomeBase: 'perfil' | 'formacao',
  caminhoEnviado: string | null,
  arquivoBruto: unknown,
  tiposAceitos: readonly string[],
  maxBytes: number,
): Promise<ArquivoResolvido> {
  if (caminhoEnviado !== null && caminhoEnviado !== '') {
    if (!caminhoEhDoUsuario(caminhoEnviado, usuarioId)) return { ok: false, motivo: 'alheio' };

    const objeto = await metadadosDoArquivo(balde, caminhoEnviado);
    const conferido = conferirObjeto(objeto, tiposAceitos, maxBytes);
    if (!conferido.ok) return { ok: false, motivo: conferido.motivo };

    return { ok: true, caminho: caminhoEnviado };
  }

  const conferido = conferirArquivo(arquivoBruto, tiposAceitos, maxBytes);
  if (!conferido.ok) return { ok: false, motivo: conferido.motivo };
  if (conferido.arquivo === null) return { ok: true, caminho: null };

  return { ok: true, caminho: await subirArquivo(balde, usuarioId, nomeBase, conferido.arquivo) };
}

/* ---------------------------------------------------------- passo 1 ------- */

/**
 * Dados básicos: só a foto é gravável.
 *
 * Nome e e-mail vêm da conta e são exibidos em leitura — "Nome e e-mail vêm da
 * conta em que você já está. A senha segue a mesma". O protótipo tem uma
 * variante com campo de senha, para quem chega sem estar logado; no produto o
 * wizard exige sessão (a guarda de `(app)/curador` exige o papel), então essa
 * variante não tem como acontecer.
 *
 * A foto é opcional, e um passo sem nada obrigatório ainda precisa existir: é
 * onde a pessoa confirma que está na conta certa antes de responder oito
 * perguntas.
 */
export async function salvarDadosBasicos(
  foto: unknown,
  fotoCaminho: string | null,
): Promise<ResultadoDoPasso> {
  const estado = await estadoOuFalha();
  if (estado === null) return { estado: 'sem_cadastro' };

  const usuario = await usuarioAtual();
  if (usuario === null) return { estado: 'sem_cadastro' };

  const resolvida = await resolverArquivo(
    usuario.id,
    'avatares',
    'perfil',
    fotoCaminho,
    foto,
    FOTO_TIPOS,
    FOTO_MAX_BYTES,
  );
  if (!resolvida.ok) return { estado: 'arquivo_invalido', motivo: resolvida.motivo };

  if (resolvida.caminho !== null) await salvarFotoDoPerfil(usuario.id, resolvida.caminho);

  return avancarDe(estado, 1);
}

/* ---------------------------------------------------------- passo 2 ------- */

export async function salvarGeneros(generos: readonly string[]): Promise<ResultadoDoPasso> {
  const estado = await estadoOuFalha();
  if (estado === null) return { estado: 'sem_cadastro' };

  await salvarGenerosDoCurador(estado.perfilCuradorId, generos);
  return avancarDe(estado, 2);
}

/* ---------------------------------------------------------- passo 3 ------- */

export async function salvarAtuacao(
  frentes: readonly string[],
  tempo: string,
): Promise<ResultadoDoPasso> {
  const estado = await estadoOuFalha();
  if (estado === null) return { estado: 'sem_cadastro' };

  await salvarAtuacaoDoCurador(estado.perfilCuradorId, frentes, tempo);
  return avancarDe(estado, 3);
}

/* ---------------------------------------------------------- passo 4 ------- */

export async function salvarCanais(canais: readonly CanalParaSalvar[]): Promise<ResultadoDoPasso> {
  const estado = await estadoOuFalha();
  if (estado === null) return { estado: 'sem_cadastro' };

  await substituirCanais(estado.perfilCuradorId, canais);
  return avancarDe(estado, 4);
}

/* ---------------------------------------------------------- passo 5 ------- */

export async function salvarServicosDoCurador(
  servicos: readonly ServicoParaSalvar[],
): Promise<ResultadoDoPasso> {
  const estado = await estadoOuFalha();
  if (estado === null) return { estado: 'sem_cadastro' };

  await salvarServicos(estado.perfilCuradorId, servicos);
  return avancarDe(estado, 5);
}

/* ---------------------------------------------------------- passo 6 ------- */

export type CredencialMarcada = {
  readonly tipo: TipoDeCredencial;
  readonly link: string | null;
};

/**
 * Credenciais — o passo que decide a classe.
 *
 * O anexo de `formacao` sobe antes de gravar, e o caminho anterior é
 * reaproveitado quando não veio arquivo novo: quem volta ao passo para marcar
 * outra credencial não deve perder o certificado que já anexou.
 *
 * `descricao` é `not null` na tabela e recebe o **rótulo da tela** — é o que a
 * amostragem antifraude do admin (20.3) vai ler, e "3 anos ou mais de atuação"
 * diz mais que a chave `anos`.
 */
export async function salvarCredenciais(
  marcadas: readonly CredencialMarcada[],
  anexoNovo: unknown,
  anexoCaminho: string | null,
): Promise<ResultadoDoPasso> {
  const estado = await estadoOuFalha();
  if (estado === null) return { estado: 'sem_cadastro' };

  const usuario = await usuarioAtual();
  if (usuario === null) return { estado: 'sem_cadastro' };

  const resolvido = await resolverArquivo(
    usuario.id,
    'materiais',
    'formacao',
    anexoCaminho,
    anexoNovo,
    ANEXO_TIPOS,
    ANEXO_MAX_BYTES,
  );
  if (!resolvido.ok) return { estado: 'arquivo_invalido', motivo: resolvido.motivo };

  const anexoAnterior =
    estado.credenciais.find((credencial) => credencial.tipo === CREDENCIAL_POR_ANEXO)
      ?.anexoCaminho ?? null;

  // Três fontes, nesta ordem: o que subiu agora (por caminho ou por arquivo) e,
  // só então, o que já estava gravado. Inverter faria quem trocou o certificado
  // gravar o antigo.
  const caminhoDoAnexo = resolvido.caminho ?? anexoAnterior;

  const paraSalvar: readonly CredencialParaSalvar[] = marcadas.map((marcada) => ({
    tipo: marcada.tipo,
    descricao: rotuloDaCredencial(marcada.tipo),
    url: marcada.tipo === CREDENCIAL_POR_ANEXO ? null : marcada.link,
    anexoCaminho: marcada.tipo === CREDENCIAL_POR_ANEXO ? caminhoDoAnexo : null,
  }));

  await substituirCredenciais(estado.perfilCuradorId, paraSalvar);
  return avancarDe(estado, 6);
}

function rotuloDaCredencial(tipo: TipoDeCredencial): string {
  return CURADOR_CADASTRO.credenciais.find((item) => item.valor === tipo)?.rotulo ?? tipo;
}

/* ---------------------------------------------------------- passo 7 ------- */

export async function salvarBio(bio: string, especialidade: string): Promise<ResultadoDoPasso> {
  const estado = await estadoOuFalha();
  if (estado === null) return { estado: 'sem_cadastro' };

  await salvarBioDoCurador(estado.perfilCuradorId, bio, especialidade);
  return avancarDe(estado, 7);
}

/* ---------------------------------------------------------- passo 8 ------- */

export type ResultadoDoEnvio =
  | { readonly estado: 'ok'; readonly destino: string }
  | { readonly estado: 'sem_cadastro' }
  | { readonly estado: 'sem_feedback' }
  | { readonly estado: 'ja_concluido'; readonly destino: string };

/**
 * Envia o cadastro (12.4 + 12.5).
 *
 * A classificação e as notificações acontecem **dentro** da RPC, numa
 * transação: ou o curador é classificado e a equipe avisada, ou nada acontece.
 * Fazer isso em duas etapas deixaria a porta aberta para um Bronze aprovado sem
 * boas-vindas, ou um Prata em análise sem ninguém sabendo.
 */
export async function enviarCadastro(): Promise<ResultadoDoEnvio> {
  const estado = await estadoOuFalha();
  if (estado === null) return { estado: 'sem_cadastro' };

  // Já concluído não é erro: é alguém que voltou pelo histórico ou recarregou.
  // A classificação é a tela que responde "e agora?".
  if (estado.concluido) {
    return { estado: 'ja_concluido', destino: ROTA.CURADOR_CADASTRO_CLASSIFICACAO };
  }

  const temFeedback = estado.servicos.some(
    (servico) => servico.tipo === 'feedback' && servico.ativo,
  );
  if (!temFeedback) return { estado: 'sem_feedback' };

  await concluirCadastro();
  return { estado: 'ok', destino: ROTA.CURADOR_CADASTRO_CLASSIFICACAO };
}

/* --------------------------------------------- 12.6 · manutenção ---------- */

export type ResultadoDaManutencao =
  | { readonly estado: 'ok' }
  | { readonly estado: 'sem_cadastro' }
  /** A tela de manutenção só existe depois de o cadastro estar concluído. */
  | { readonly estado: 'cadastro_pendente'; readonly destino: string };

/**
 * Guarda das três operações de 12.6.
 *
 * Manutenção pressupõe cadastro concluído. Quem tem cadastro pendente e chega
 * aqui — por URL antiga, por histórico — é devolvido ao wizard, que é onde a
 * edição dele acontece. Sem esta guarda, mexer nas mídias antes de concluir
 * daria dois caminhos de escrita para a mesma tabela, e o passo 4 (que
 * substitui a lista inteira) apagaria o que esta tela inseriu.
 */
type GuardaDaManutencao =
  | { readonly ok: true; readonly estado: EstadoDoCadastro }
  | { readonly ok: false; readonly falha: ResultadoDaManutencao };

async function paraManutencao(): Promise<GuardaDaManutencao> {
  const estado = await estadoOuFalha();
  if (estado === null) return { ok: false, falha: { estado: 'sem_cadastro' } };
  if (!estado.concluido) {
    return {
      ok: false,
      falha: { estado: 'cadastro_pendente', destino: ROTA.CURADOR_CADASTRO },
    };
  }
  return { ok: true, estado };
}

/**
 * Insere ou atualiza uma mídia (12.6).
 *
 * **Não** toca em classe nem em credencial, e é a regra que o PRD grifa:
 * "alterar mídia não altera a classe". Ela é sustentada em três camadas — este
 * serviço não chama a RPC de classificação, o repositório não escreve as
 * colunas, e o trigger `proibir_autopromocao_de_classe` recusaria se
 * escrevesse. A regra vive nas três porque uma tela futura pode esquecer as
 * duas primeiras.
 */
export async function salvarMidia(
  midiaId: string | undefined,
  canal: CanalParaSalvar,
): Promise<ResultadoDaManutencao> {
  const guarda = await paraManutencao();
  if (!guarda.ok) return guarda.falha;

  if (midiaId === undefined) {
    await inserirCanal(guarda.estado.perfilCuradorId, canal);
  } else {
    await atualizarCanal(guarda.estado.perfilCuradorId, midiaId, canal);
  }

  return { estado: 'ok' };
}

export async function removerMidia(midiaId: string): Promise<ResultadoDaManutencao> {
  const guarda = await paraManutencao();
  if (!guarda.ok) return guarda.falha;

  await removerCanal(guarda.estado.perfilCuradorId, midiaId);
  return { estado: 'ok' };
}

/**
 * Reedita serviços e preços (12.6).
 *
 * O mesmo `salvarServicos` do passo 5 — o upsert por `(perfil_curador_id,
 * tipo)` já é feito para reescrita, e o trigger que impede remover o
 * `feedback` continua valendo. O que muda é só não avançar passo nenhum.
 */
export async function reeditarServicos(
  servicos: readonly ServicoParaSalvar[],
): Promise<ResultadoDaManutencao> {
  const guarda = await paraManutencao();
  if (!guarda.ok) return guarda.falha;

  await salvarServicos(guarda.estado.perfilCuradorId, servicos);
  return { estado: 'ok' };
}

/* ------------------------------------------------------- navegação -------- */

/**
 * Pular um passo (4, 6 e 7).
 *
 * Avança o marcador **sem gravar nada** — e é isso que "pular" significa. Não
 * apaga o que já estava lá: quem passou pelo passo, preencheu e voltou para
 * pular não deve perder o que preencheu.
 */
export async function pularPasso(passo: PassoDoCadastro): Promise<ResultadoDoPasso> {
  const estado = await estadoOuFalha();
  if (estado === null) return { estado: 'sem_cadastro' };
  return avancarDe(estado, passo);
}
