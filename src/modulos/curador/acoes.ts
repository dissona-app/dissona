'use server';

/**
 * Server Actions do cadastro do curador — módulo 12.
 *
 * Uma por passo. Cada uma lê o `FormData`, valida com o Zod do passo, chama o
 * serviço e redireciona — e nada mais: a sequência dos oito passos e o que cada
 * um grava são regra, e vivem em `servico.ts`.
 *
 * O erro volta como `ResultadoDeAcao` com **códigos**, e a View traduz. É o que
 * permite as catorze mensagens de `cadStepOk` existirem num só lugar
 * (`textos/curador.ts`) e não espalhadas por oito ações.
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { falha, falhaDeCampos, sucesso } from '@/lib/acoes';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { CodigoErro } from '@/lib/erros';
import { ROTA } from '@/lib/guarda-rota';

import {
  esquemaAtuacao,
  esquemaBio,
  esquemaCanais,
  esquemaCredenciais,
  esquemaGeneros,
  esquemaMidia,
  esquemaPreco,
  esquemaRemocaoDeMidia,
  esquemaServicos,
  normalizarLink,
} from './esquemas';
import type { ServicoParaSalvar } from './repositorio';
import {
  enviarCadastro as enviarCadastroDoCurador,
  pularPasso as pularPassoDoCadastro,
  reeditarServicos,
  removerMidia,
  salvarAtuacao,
  salvarBio,
  salvarCanais,
  salvarCredenciais,
  salvarDadosBasicos,
  salvarGeneros,
  salvarMidia,
  salvarServicosDoCurador,
} from './servico';
import type { CredencialMarcada, ResultadoDaManutencao, ResultadoDoPasso } from './servico';
import type { PassoDoCadastro, TipoDeCredencial, TipoDeMidia, TipoDeServico } from './tipos';
import { CREDENCIAL_POR_ANEXO, ehPasso, TIPOS_DE_CREDENCIAL } from './tipos';

/**
 * Traduz o resultado do serviço em redirecionamento ou falha.
 *
 * `redirect` lança, então tem de ser a última instrução de quem a chama — e é
 * por isso que esta função **devolve** em vez de redirecionar: quem chama é a
 * ação, e é lá que o `redirect` precisa estar no fim.
 */
function concluir(resultado: ResultadoDoPasso): ResultadoDeAcao | string {
  if (resultado.estado === 'sem_cadastro') return falha(CodigoErro.NAO_AUTENTICADO);
  if (resultado.estado === 'arquivo_invalido') {
    return falha(
      resultado.motivo === 'tipo'
        ? CodigoErro.FORMATO_NAO_SUPORTADO
        : CodigoErro.ARQUIVO_MUITO_GRANDE,
      'arquivo',
    );
  }
  return resultado.destino;
}

/** Um motivo por campo, para o formulário mostrar todos de uma vez. */
function motivosPorCampo(
  issues: readonly { readonly path: readonly PropertyKey[]; readonly message: string }[],
): Record<string, string> {
  const motivos: Record<string, string> = {};
  for (const issue of issues) {
    const campo = issue.path[0];
    if (typeof campo !== 'string' || campo in motivos) continue;
    motivos[campo] = issue.message;
  }
  return motivos;
}

/** Todos os valores de um campo repetido, como texto. */
function todos(dados: FormData, campo: string): string[] {
  return dados.getAll(campo).map((valor) => (typeof valor === 'string' ? valor : ''));
}

/* ---------------------------------------------------------- passo 1 ------- */

export async function salvarPasso1(dados: FormData): Promise<ResultadoDeAcao> {
  const saida = concluir(await salvarDadosBasicos(dados.get('foto')));
  if (typeof saida !== 'string') return saida;
  redirect(saida);
}

/* ---------------------------------------------------------- passo 2 ------- */

export async function salvarPasso2(dados: FormData): Promise<ResultadoDeAcao> {
  const analise = esquemaGeneros.safeParse({ generos: todos(dados, 'genero') });
  if (!analise.success) {
    return falha(CodigoErro.ENTRADA_INVALIDA, 'generos', {
      motivo: analise.error.issues[0]?.message ?? 'entrada_invalida',
    });
  }

  const saida = concluir(await salvarGeneros(analise.data.generos));
  if (typeof saida !== 'string') return saida;
  redirect(saida);
}

/* ---------------------------------------------------------- passo 3 ------- */

export async function salvarPasso3(dados: FormData): Promise<ResultadoDeAcao> {
  const analise = esquemaAtuacao.safeParse({
    frentes: todos(dados, 'frente'),
    tempo: dados.get('tempo'),
  });

  if (!analise.success) {
    return falhaDeCampos(CodigoErro.ENTRADA_INVALIDA, motivosDe(analise.error.issues));
  }

  const saida = concluir(await salvarAtuacao(analise.data.frentes, analise.data.tempo));
  if (typeof saida !== 'string') return saida;
  redirect(saida);
}

/* ---------------------------------------------------------- passo 4 ------- */

export async function salvarPasso4(dados: FormData): Promise<ResultadoDeAcao> {
  const tipos = todos(dados, 'canal_tipo');
  const nomes = todos(dados, 'canal_nome');
  const links = todos(dados, 'canal_link');

  const analise = esquemaCanais.safeParse({ tipos, nomes, links });
  if (!analise.success) {
    return falha(CodigoErro.ENTRADA_INVALIDA, 'canais', {
      motivo: analise.error.issues[0]?.message ?? 'entrada_invalida',
    });
  }

  // Só as linhas preenchidas viram canal. A tela nasce com uma linha em branco,
  // e gravá-la produziria uma mídia sem nome nem link — que o `not null` da
  // tabela recusaria com uma mensagem que não diz nada à pessoa.
  const canais = tipos
    .map((tipo, indice) => ({
      tipo: tipo as TipoDeMidia,
      nome: (nomes[indice] ?? '').trim(),
      url: (links[indice] ?? '').trim(),
    }))
    // O filtro vem **antes** da normalização: `normalizarLink('')` devolve
    // `https://`, que não é vazio, e a linha em branco passaria por preenchida.
    .filter((canal) => canal.nome !== '' && canal.url !== '')
    .map((canal) => ({ ...canal, url: normalizarLink(canal.url) }));

  const saida = concluir(await salvarCanais(canais));
  if (typeof saida !== 'string') return saida;
  redirect(saida);
}

/* ---------------------------------------------------------- passo 5 ------- */

const OPCIONAIS = ['playlist', 'post', 'materia'] as const;

/**
 * Lê e valida o formulário de serviços.
 *
 * Compartilhado entre o passo 5 do wizard e a reedição de 12.6, porque é o
 * **mesmo** formulário nas duas telas. Duplicá-lo daria duas leituras do
 * mesmo `FormData` para manter em sincronia — e é aqui que mora a regra de que
 * o feedback vai sempre ativo.
 */
function lerServicosDoFormulario(
  dados: FormData,
):
  | { readonly ok: true; readonly servicos: readonly ServicoParaSalvar[] }
  | { readonly ok: false; readonly falha: ResultadoDeAcao } {
  const opcionais = OPCIONAIS.map((tipo) => ({
    tipo,
    ativo: dados.get(`servico_${tipo}`) === 'on',
    preco: String(dados.get(`preco_${tipo}`) ?? ''),
  }));

  const analise = esquemaServicos.safeParse({
    precoFeedback: dados.get('preco_feedback'),
    opcionais,
  });

  if (!analise.success) {
    return {
      ok: false,
      falha: falha(CodigoErro.ENTRADA_INVALIDA, 'servicos', {
        motivo: analise.error.issues[0]?.message ?? 'entrada_invalida',
      }),
    };
  }

  // O feedback vai **sempre** ativo: é o serviço obrigatório (12.2), e sem ele
  // `confirmar_selecao_curadores` (0010) recusa a contratação. Os opcionais
  // desmarcados vão com `ativo = false` e o preço preservado — quem religa o
  // serviço depois não redigita o valor.
  return {
    ok: true,
    servicos: [
      {
        tipo: 'feedback' as TipoDeServico,
        precoClaves: analise.data.precoFeedback,
        ativo: true,
      },
      ...analise.data.opcionais.map((servico) => ({
        tipo: servico.tipo as TipoDeServico,
        precoClaves: esquemaPreco.safeParse(servico.preco).data ?? 1,
        ativo: servico.ativo,
      })),
    ],
  };
}

export async function salvarPasso5(dados: FormData): Promise<ResultadoDeAcao> {
  const lidos = lerServicosDoFormulario(dados);
  if (!lidos.ok) return lidos.falha;

  const saida = concluir(await salvarServicosDoCurador(lidos.servicos));
  if (typeof saida !== 'string') return saida;
  redirect(saida);
}

/* ---------------------------------------------------------- passo 6 ------- */

export async function salvarPasso6(dados: FormData): Promise<ResultadoDeAcao> {
  const marcadas = TIPOS_DE_CREDENCIAL.filter((tipo) => dados.get(`credencial_${tipo}`) === 'on');

  const links: Record<string, string> = {};
  for (const tipo of TIPOS_DE_CREDENCIAL) {
    links[tipo] = String(dados.get(`link_${tipo}`) ?? '');
  }

  const anexoNovo = dados.get('anexo_formacao');
  const temAnexoNovo = anexoNovo instanceof File && anexoNovo.size > 0;
  const temAnexoGravado = dados.get('anexo_formacao_existente') === '1';

  const analise = esquemaCredenciais.safeParse({
    marcadas,
    links,
    temAnexoDeFormacao: temAnexoNovo || temAnexoGravado,
  });

  if (!analise.success) {
    return falha(CodigoErro.ENTRADA_INVALIDA, 'credenciais', {
      motivo: analise.error.issues[0]?.message ?? 'entrada_invalida',
    });
  }

  const paraSalvar: readonly CredencialMarcada[] = marcadas.map((tipo: TipoDeCredencial) => ({
    tipo,
    link: tipo === CREDENCIAL_POR_ANEXO ? null : (links[tipo] ?? '').trim(),
  }));

  const saida = concluir(await salvarCredenciais(paraSalvar, anexoNovo));
  if (typeof saida !== 'string') return saida;
  redirect(saida);
}

/* ---------------------------------------------------------- passo 7 ------- */

export async function salvarPasso7(dados: FormData): Promise<ResultadoDeAcao> {
  const analise = esquemaBio.safeParse({
    bio: dados.get('bio'),
    especialidade: dados.get('especialidade'),
  });

  if (!analise.success) {
    return falhaDeCampos(CodigoErro.ENTRADA_INVALIDA, motivosDe(analise.error.issues));
  }

  const saida = concluir(await salvarBio(analise.data.bio, analise.data.especialidade));
  if (typeof saida !== 'string') return saida;
  redirect(saida);
}

/* ---------------------------------------------------------- passo 8 ------- */

/**
 * Envia o cadastro (passo 8).
 *
 * Recebe `FormData` e não a usa: a assinatura é a que `<form action>` exige, e
 * a revisão não tem campo nenhum — ela só confirma o que os sete passos
 * anteriores gravaram.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura de `<form action>`
export async function enviarCadastro(dados: FormData): Promise<ResultadoDeAcao> {
  const resultado = await enviarCadastroDoCurador();

  if (resultado.estado === 'sem_cadastro') return falha(CodigoErro.NAO_AUTENTICADO);
  if (resultado.estado === 'sem_feedback') {
    return falha(CodigoErro.SERVICO_FEEDBACK_OBRIGATORIO, 'servicos');
  }

  redirect(resultado.destino);
}

/* ------------------------------------------------------- navegação -------- */

/**
 * Pular e voltar **sempre redirecionam** — daí `Promise<never>`.
 *
 * Os dois são `formAction` de um `<button type="submit">`, e o atributo exige
 * uma ação que devolva `void`: um valor de retorno ali seria descartado em
 * silêncio. Então o caminho de erro também navega — e navega para a retomada,
 * que é onde a pessoa consegue continuar.
 *
 * `passo` inválido só chega por campo escondido forjado. A retomada resolve o
 * caso sem inventar um erro para ele.
 */
/* --------------------------------------------- 12.6 · manutenção ---------- */

/** Traduz o resultado da manutenção; `string` significa "redirecione". */
function concluirManutencao(resultado: ResultadoDaManutencao): ResultadoDeAcao | string {
  if (resultado.estado === 'sem_cadastro') return falha(CodigoErro.NAO_AUTENTICADO);
  if (resultado.estado === 'cadastro_pendente') return resultado.destino;
  return sucesso();
}

/**
 * Insere ou edita uma mídia (12.6).
 *
 * Um formulário só para os dois casos, distinguidos pela presença de
 * `midiaId` — que é o que o modal manda ou omite. Duas ações quase idênticas
 * dariam duas validações para manter em sincronia.
 */
export async function salvarMidiaDoCurador(dados: FormData): Promise<ResultadoDeAcao> {
  const bruto = dados.get('midiaId');
  const analise = esquemaMidia.safeParse({
    midiaId: typeof bruto === 'string' && bruto !== '' ? bruto : undefined,
    tipo: dados.get('tipo'),
    nome: dados.get('nome'),
    link: dados.get('link'),
  });

  if (!analise.success) {
    return falhaDeCampos(CodigoErro.ENTRADA_INVALIDA, motivosPorCampo(analise.error.issues));
  }

  const saida = concluirManutencao(
    await salvarMidia(analise.data.midiaId, {
      tipo: analise.data.tipo as TipoDeMidia,
      nome: analise.data.nome,
      url: normalizarLink(analise.data.link),
    }),
  );

  if (typeof saida === 'string') redirect(saida);
  if (saida.ok) revalidatePath(ROTA.CURADOR_MEU_CADASTRO);
  return saida;
}

export async function removerMidiaDoCurador(dados: FormData): Promise<ResultadoDeAcao> {
  const analise = esquemaRemocaoDeMidia.safeParse({ midiaId: dados.get('midiaId') });
  if (!analise.success) return falha(CodigoErro.ENTRADA_INVALIDA, 'midiaId');

  const saida = concluirManutencao(await removerMidia(analise.data.midiaId));

  if (typeof saida === 'string') redirect(saida);
  if (saida.ok) revalidatePath(ROTA.CURADOR_MEU_CADASTRO);
  return saida;
}

/**
 * Reedita serviços e preços (12.6).
 *
 * Mesma leitura e mesma validação do passo 5 — o formulário é o mesmo. O que
 * muda é o fim: aqui não há passo seguinte, então a tela recarrega no lugar com
 * o aviso de que salvou.
 */
export async function salvarServicosNaManutencao(dados: FormData): Promise<ResultadoDeAcao> {
  const lidos = lerServicosDoFormulario(dados);
  if (!lidos.ok) return lidos.falha;

  const saida = concluirManutencao(await reeditarServicos(lidos.servicos));

  if (typeof saida === 'string') redirect(saida);
  if (saida.ok) revalidatePath(ROTA.CURADOR_MEU_CADASTRO);
  return saida;
}

export async function pularPasso(dados: FormData): Promise<never> {
  const passo = dados.get('passo');
  if (!ehPasso(passo)) redirect(ROTA.CURADOR_CADASTRO);

  const resultado = await pularPassoDoCadastro(Number(passo) as PassoDoCadastro);
  if (resultado.estado !== 'ok') redirect(ROTA.CURADOR_CADASTRO);

  redirect(resultado.destino);
}

/**
 * "Voltar" é navegação, não gravação — mas é um `<form>` de propósito.
 *
 * Um `<Link>` funcionaria e seria mais simples. O problema é o par com
 * "Continuar": os dois ficam no rodapé, um ao lado do outro, e um deles ser
 * link e o outro botão faz o teclado e o leitor de tela tratarem de forma
 * diferente duas coisas que a pessoa vê como iguais.
 */
export async function voltarPasso(dados: FormData): Promise<never> {
  const passo = dados.get('passo');
  if (!ehPasso(passo)) redirect(ROTA.CURADOR_CADASTRO);

  const atual = Number(passo);
  // O "Voltar" do passo 1 sai do wizard, como no protótipo ("Voltar ao login").
  // Aqui ele volta ao login de verdade, porque é de lá que a pessoa veio.
  if (atual <= 1) redirect(ROTA.ENTRAR);

  redirect(`${ROTA.CURADOR_CADASTRO}/${atual - 1}`);
}

/** Um motivo por campo, para o formulário mostrar todos de uma vez. */
function motivosDe(
  issues: readonly { readonly path: readonly PropertyKey[]; readonly message: string }[],
): Record<string, string> {
  const motivos: Record<string, string> = {};
  for (const issue of issues) {
    const campo = issue.path[0];
    if (typeof campo !== 'string' || campo in motivos) continue;
    motivos[campo] = issue.message;
  }
  return motivos;
}
