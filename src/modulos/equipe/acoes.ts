'use server';

/**
 * Server Actions do módulo 27 — equipe, convites e permissões.
 *
 * Finas: leem o `FormData`, validam e chamam o serviço. O motivo da auditoria
 * é o único valor que elas **acrescentam** — e ele é declarado aqui, por ação,
 * porque é a ação que sabe o que aconteceu ("papel alterado por quem gere
 * equipe") melhor que o serviço, que só recebe um `string`.
 */

import { revalidatePath } from 'next/cache';

import { falha, falhaDeCampos, sucesso } from '@/lib/acoes';
import type { FalhaDeAcao, ResultadoDeAcao } from '@/lib/acoes';
import { FOTO_MAX_BYTES, FOTO_TIPOS } from '@/lib/arquivos';
import { CodigoErro } from '@/lib/erros';
import { ROTA } from '@/lib/guarda-rota';
import { origemDaRequisicao } from '@/lib/origem';
import { usuarioAtual } from '@/lib/supabase/servidor';
import { resolverArquivoDoFormulario } from '@/lib/supabase/upload-de-perfil';
import type { MotivoDeArquivo } from '@/lib/supabase/upload-de-perfil';
import { esquemaNovaSenha, motivosPorCampo } from '@/modulos/autenticacao/esquemas';

import {
  esquemaAlterarAcesso,
  esquemaAlterarPapel,
  esquemaConvite,
  esquemaDadosPessoais,
  esquemaMatriz,
} from './esquemas';
import {
  aceitarConviteDaEquipe,
  alterarAcessoDoMembro,
  alterarPapelDoMembro,
  convidarMembro,
  gravarMatrizDePermissoes,
  salvarMeusDados,
} from './servico';
import type { FalhaDeEquipe } from './servico';
import type { CelulaParaGravar } from './repositorio';
import { ehNivel, rotuloDoPapel } from './tipos';
import type { PapelAdmin } from './tipos';

/**
 * As duas negações de permissão, traduzidas para código de erro.
 *
 * Devolve `FalhaDeAcao`, e não `ResultadoDeAcao`: aquele é o tipo que cabe em
 * `ResultadoDeAcao<T>` para **qualquer** `T`, e é o que permite usá-la tanto na
 * ação que devolve o link do convite quanto nas que não devolvem nada.
 */
function traduzirFalha(resultado: FalhaDeEquipe): FalhaDeAcao {
  return resultado.estado === 'sem_sessao'
    ? falha(CodigoErro.NAO_AUTENTICADO)
    : falha(CodigoErro.NAO_AUTORIZADO);
}

/* -------------------------------------------------------------- convite --- */

export type DadosDoConvite = {
  readonly email: string;
  readonly link: string;
  /** A conta já existia no Auth — o convite vale, e a tela explica isso. */
  readonly jaTinhaConta: boolean;
};

/**
 * Convida um membro (27.3).
 *
 * Devolve o link do convite. Ver o comentário de `convidarMembro` sobre por que
 * ele aparece na tela enquanto o SMTP é o embutido do Supabase.
 */
export async function convidarMembroDaEquipe(
  dadosDoFormulario: FormData,
): Promise<ResultadoDeAcao<DadosDoConvite>> {
  const analise = esquemaConvite.safeParse({
    email: dadosDoFormulario.get('email'),
    papel: dadosDoFormulario.get('papel'),
  });

  if (!analise.success) {
    return falhaDeCampos(CodigoErro.ENTRADA_INVALIDA, motivosPorCampo(analise.error.issues));
  }

  const origem = await origemDaRequisicao();
  const resultado = await convidarMembro(
    analise.data.email,
    analise.data.papel as PapelAdmin,
    `${origem}${ROTA.ADMIN_CONVITE}`,
  );

  if (resultado.estado === 'sem_sessao' || resultado.estado === 'sem_permissao') {
    return traduzirFalha(resultado);
  }
  if (resultado.estado === 'limite_de_envio') return falha(CodigoErro.LIMITE_DE_ENVIO);

  revalidatePath(ROTA.ADMIN_EQUIPE);

  return sucesso({
    email: analise.data.email,
    link: `${origem}${ROTA.ADMIN_CONVITE}?token=${encodeURIComponent(resultado.token)}`,
    jaTinhaConta: resultado.jaTinhaConta,
  });
}

/**
 * Reenvia o convite (27.2).
 *
 * É o mesmo caminho do convite novo: `criar_convite_admin` apaga o pendente e
 * **rotaciona** o token (0003b). Uma ação separada existiria para chamar a
 * mesma coisa com outro nome.
 */
export async function reenviarConviteDaEquipe(
  dadosDoFormulario: FormData,
): Promise<ResultadoDeAcao<DadosDoConvite>> {
  return convidarMembroDaEquipe(dadosDoFormulario);
}

/**
 * Aceita o convite e define a senha (27.3).
 *
 * O token vem no `FormData`, e não da URL lida no servidor, porque a ação é
 * chamada pelo formulário — e é o que faz a tela funcionar sem JavaScript. A
 * página o coloca num `input` oculto a partir de `?token=`.
 */
export async function concluirAceiteDoConvite(
  dadosDoFormulario: FormData,
): Promise<ResultadoDeAcao> {
  const token = String(dadosDoFormulario.get('token') ?? '').trim();
  if (token === '') return falha(CodigoErro.TOKEN_INVALIDO);

  const analise = esquemaNovaSenha.safeParse({
    senha: dadosDoFormulario.get('senha'),
    confirmar: dadosDoFormulario.get('confirmar'),
  });

  if (!analise.success) {
    return falhaDeCampos(CodigoErro.ENTRADA_INVALIDA, motivosPorCampo(analise.error.issues));
  }

  const resultado = await aceitarConviteDaEquipe(token, analise.data.senha);

  if (resultado.estado === 'sem_sessao') return falha(CodigoErro.NAO_AUTENTICADO);
  if (resultado.estado === 'token_invalido') return falha(CodigoErro.TOKEN_INVALIDO);
  if (resultado.estado === 'senha_fraca') return falha(CodigoErro.SENHA_FRACA, 'senha');

  return sucesso();
}

/* --------------------------------------------------------- integrantes ---- */

export async function alterarPapel(dadosDoFormulario: FormData): Promise<ResultadoDeAcao> {
  const analise = esquemaAlterarPapel.safeParse({
    membroId: dadosDoFormulario.get('membroId'),
    papel: dadosDoFormulario.get('papel'),
  });

  if (!analise.success) return falha(CodigoErro.ENTRADA_INVALIDA, 'papel');

  const papel = analise.data.papel as PapelAdmin;
  const resultado = await alterarPapelDoMembro(
    analise.data.membroId,
    papel,
    `papel alterado para ${rotuloDoPapel(papel)} em Conta e equipe (27.2)`,
  );

  if (resultado.estado !== 'ok') return traduzirFalha(resultado);

  revalidatePath(ROTA.ADMIN_EQUIPE);
  return sucesso();
}

export async function alterarAcesso(dadosDoFormulario: FormData): Promise<ResultadoDeAcao> {
  const analise = esquemaAlterarAcesso.safeParse({
    membroId: dadosDoFormulario.get('membroId'),
    ativo: dadosDoFormulario.get('ativo'),
  });

  if (!analise.success) return falha(CodigoErro.ENTRADA_INVALIDA, 'ativo');

  const resultado = await alterarAcessoDoMembro(
    analise.data.membroId,
    analise.data.ativo,
    analise.data.ativo
      ? 'acesso reativado em Conta e equipe (27.2)'
      : 'acesso desativado em Conta e equipe (27.2)',
  );

  if (resultado.estado !== 'ok') return traduzirFalha(resultado);

  revalidatePath(ROTA.ADMIN_EQUIPE);
  return sucesso();
}

/* ------------------------------------------------------------- matriz ----- */

export async function salvarMatriz(dadosDoFormulario: FormData): Promise<ResultadoDeAcao> {
  const celulas = dadosDoFormulario.getAll('celula').map(String);
  const niveis = dadosDoFormulario.getAll('nivel').map(String);

  const analise = esquemaMatriz.safeParse({ celulas, niveis });
  if (!analise.success) {
    return falha(CodigoErro.ENTRADA_INVALIDA, 'matriz', {
      motivo: analise.error.issues[0]?.message ?? 'entrada_invalida',
    });
  }

  // `papel:modulo` de volta em duas partes. `split(':', 2)` não serve — um
  // módulo com dois-pontos no nome perderia o resto —, então o corte é no
  // primeiro separador e o resto é o módulo.
  const paraGravar: CelulaParaGravar[] = [];
  for (const [indice, celula] of analise.data.celulas.entries()) {
    const corte = celula.indexOf(':');
    const papel = celula.slice(0, corte);
    const modulo = celula.slice(corte + 1);
    const nivel = analise.data.niveis[indice];

    if (papel === '' || modulo === '' || !ehNivel(nivel)) {
      return falha(CodigoErro.ENTRADA_INVALIDA, 'matriz', { motivo: 'matriz_invalida' });
    }

    paraGravar.push({ papel: papel as PapelAdmin, modulo, nivel });
  }

  const resultado = await gravarMatrizDePermissoes(
    paraGravar,
    'matriz de permissoes alterada em Papeis e permissoes (27.4)',
  );

  if (resultado.estado !== 'ok') return traduzirFalha(resultado);

  revalidatePath(ROTA.ADMIN_EQUIPE);
  return sucesso();
}

/* ------------------------------------------------------ dados pessoais ---- */

/**
 * A recusa da foto é do campo `foto`, como no perfil do artista.
 *
 * `DadosDoMembro` lê `resultado.campos`; uma falha só no código sairia como
 * erro geral e o campo ficaria sem aviso nenhum.
 */
const MOTIVO_DA_FOTO: Readonly<Record<MotivoDeArquivo, string>> = {
  tipo: 'foto_tipo',
  tamanho: 'foto_tamanho',
  ausente: 'foto_ausente',
  alheio: 'foto_alheia',
};

export async function salvarDadosPessoais(dadosDoFormulario: FormData): Promise<ResultadoDeAcao> {
  const analise = esquemaDadosPessoais.safeParse({
    nome: dadosDoFormulario.get('nome'),
    cargo: dadosDoFormulario.get('cargo'),
  });

  if (!analise.success) {
    return falhaDeCampos(CodigoErro.ENTRADA_INVALIDA, motivosPorCampo(analise.error.issues));
  }

  // A foto vem por caminho (o navegador subiu direto) ou no `multipart`, para
  // quem está sem JavaScript — o mesmo caminho do wizard do curador e do
  // perfil do artista.
  const usuario = await usuarioAtual();
  const foto =
    usuario === null
      ? ({ ok: true, caminho: null } as const)
      : await resolverArquivoDoFormulario(
          usuario.id,
          'avatares',
          'perfil',
          typeof dadosDoFormulario.get('foto_caminho') === 'string'
            ? (dadosDoFormulario.get('foto_caminho') as string)
            : '',
          dadosDoFormulario.get('foto'),
          FOTO_TIPOS,
          FOTO_MAX_BYTES,
        );

  if (!foto.ok) {
    return falhaDeCampos(CodigoErro.ENTRADA_INVALIDA, { foto: MOTIVO_DA_FOTO[foto.motivo] });
  }

  const resultado = await salvarMeusDados(analise.data.nome, analise.data.cargo, foto.caminho);

  if (resultado.estado === 'sem_sessao') return falha(CodigoErro.NAO_AUTENTICADO);
  if (resultado.estado === 'sem_vinculo') return falha(CodigoErro.NAO_AUTORIZADO);

  // O layout inteiro, e não só a Equipe: nome e foto também estão no header de
  // todas as telas do painel.
  revalidatePath(ROTA.ADMIN, 'layout');
  return sucesso();
}
