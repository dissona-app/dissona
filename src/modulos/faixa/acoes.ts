'use server';

/**
 * Server Actions do envio (módulo 3).
 *
 * Entrada por `FormData`: são formulários de verdade, com arquivo. O padrão é
 * o do wizard do curador — um `<form>`, `redirect` na última instrução, e o
 * progresso persistido a cada passo.
 */

import { randomUUID } from 'node:crypto';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { executar, falha, falhaDeCampos, sucesso } from '@/lib/acoes';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { CodigoErro, falhar } from '@/lib/erros';
import { ROTA } from '@/lib/guarda-rota';
import { usuarioAtual } from '@/lib/supabase/servidor';

import { lerLimitesDeUpload } from './consultas';
import { detectarPorLink } from './deteccao';
import { esquemaContexto, esquemaDeteccao, esquemaDetalhes } from './esquemas';
import {
  atualizarContexto,
  atualizarDetalhes,
  buscar,
  inserir,
  meuPerfilArtista,
  subirAudio,
  subirCapa,
} from './repositorio';
import { lerMetadados, provedorDoLink, validarAudio } from './servico';
import type { MetadadosDetectados } from './tipos';

function texto(dados: FormData, campo: string): string {
  const valor = dados.get(campo);
  return typeof valor === 'string' ? valor : '';
}

function arquivoDe(dados: FormData, campo: string): File | null {
  const valor = dados.get(campo);
  return valor instanceof File && valor.size > 0 ? valor : null;
}

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

async function usuarioDaSessao(): Promise<string> {
  const usuario = await usuarioAtual();
  if (usuario === null) falhar(CodigoErro.NAO_AUTENTICADO);
  return usuario.id;
}

function metadadosDoFormulario(
  bruto: string,
  urlSpotify: string | null,
  urlYoutube: string | null,
): MetadadosDetectados | null {
  const metadados = lerMetadados(bruto);
  if (metadados === null) return null;
  return metadados.url === urlSpotify || metadados.url === urlYoutube ? metadados : null;
}

/**
 * 3.1 · "Detectar faixa".
 *
 * Não grava nada: devolve o que o provedor disse, e a tela preenche o
 * formulário. Gravar é do "Continuar", junto com o arquivo — detectar e
 * desistir não pode deixar faixa em rascunho para trás.
 *
 * Sessão exigida: sem ela, a ação seria um proxy anônimo para o oEmbed.
 */
export async function detectarFaixa(link: string): Promise<ResultadoDeAcao<MetadadosDetectados>> {
  return executar(async () => {
    await usuarioDaSessao();

    const analise = esquemaDeteccao.safeParse({ url: link });
    if (!analise.success || provedorDoLink(analise.data.url) === null) {
      return falha(CodigoErro.ENTRADA_INVALIDA, 'link', {
        motivo: analise.success
          ? 'link_nao_suportado'
          : (analise.error.issues[0]?.message ?? 'link_invalido'),
      });
    }

    const metadados = await detectarPorLink(analise.data.url);
    if (metadados === null) return falha(CodigoErro.NAO_ENCONTRADO, 'link');
    return sucesso(metadados);
  });
}

/**
 * Passo 1 — a faixa.
 *
 * Cria a faixa na primeira submissão e a atualiza nas seguintes: reenviar o
 * passo 1 depois de voltar da revisão tem de editar, não duplicar.
 *
 * O **arquivo é obrigatório na criação**, inclusive quando há link. Ver
 * `ENVIAR.arquivoSempreNecessario` para o porquê — em resumo, é ele que o
 * curador ouve e é o que torna a escuta mensurável.
 */
export async function salvarFaixa(dados: FormData): Promise<ResultadoDeAcao> {
  const destino = await executar(async () => {
    const analise = esquemaDetalhes.safeParse({
      titulo: texto(dados, 'titulo'),
      estilo: texto(dados, 'estilo'),
      urlSpotify: texto(dados, 'urlSpotify'),
      urlYoutube: texto(dados, 'urlYoutube'),
      lancada: texto(dados, 'lancada') === '' ? null : texto(dados, 'lancada'),
      dataLancamento: texto(dados, 'dataLancamento'),
    });

    if (!analise.success) {
      return falhaDeCampos(CodigoErro.ENTRADA_INVALIDA, motivosPorCampo(analise.error.issues));
    }

    const faixaId = texto(dados, 'faixaId');
    const existente = faixaId === '' ? null : await buscar(faixaId);

    const audio = arquivoDe(dados, 'audio');
    const limites = await lerLimitesDeUpload();

    // Na criação o áudio é obrigatório. Na edição, só se veio um novo — quem
    // voltou para corrigir o título não precisa reenviar 40 MB.
    if (existente === null || audio !== null) {
      const falhaDoAudio = validarAudio(audio, limites);
      if (falhaDoAudio !== null) {
        return falha(CodigoErro.ARQUIVO_MUITO_GRANDE, 'audio', { motivo: falhaDoAudio });
      }
    }

    const usuarioId = await usuarioDaSessao();
    // Referência estável do arquivo no bucket. Gerada antes do insert para o
    // caminho não depender do id da linha — assim a criação é uma ida só.
    const referencia = existente?.id ?? randomUUID();

    const capa = arquivoDe(dados, 'capa');
    const capaCaminho =
      capa === null
        ? (existente?.capaCaminho ?? null)
        : await subirCapa(usuarioId, referencia, capa);

    const audioCaminho =
      audio === null ? undefined : await subirAudio(usuarioId, referencia, audio);

    const lancada = analise.data.lancada === null ? null : analise.data.lancada === 'sim';
    const temLink = analise.data.urlSpotify !== null || analise.data.urlYoutube !== null;

    const comuns = {
      titulo: analise.data.titulo,
      estilo: analise.data.estilo,
      origem: temLink ? ('link' as const) : ('arquivo' as const),
      urlSpotify: analise.data.urlSpotify,
      urlYoutube: analise.data.urlYoutube,
      capaCaminho,
      lancada,
      dataLancamento: analise.data.dataLancamento,
      duracaoSegundos: null,
      // Só vale se o link detectado ainda é um dos links gravados — quem
      // detectou e depois trocou o link não pode carregar metadado alheio.
      metadadosDetectados: metadadosDoFormulario(
        texto(dados, 'metadados'),
        analise.data.urlSpotify,
        analise.data.urlYoutube,
      ),
    };

    if (existente === null) {
      const perfilArtistaId = await meuPerfilArtista();
      if (perfilArtistaId === null) return falha(CodigoErro.PAPEL_AUSENTE);
      if (audioCaminho === undefined) return falha(CodigoErro.ARQUIVO_MUITO_GRANDE, 'audio');

      const novoId = await inserir({ ...comuns, perfilArtistaId, arquivoCaminho: audioCaminho });
      return sucesso(`${ROTA.ARTISTA_ENVIAR}/${novoId}/contexto`);
    }

    await atualizarDetalhes(existente.id, {
      ...comuns,
      ...(audioCaminho === undefined ? {} : { arquivoCaminho: audioCaminho }),
    });
    return sucesso(`${ROTA.ARTISTA_ENVIAR}/${existente.id}/contexto`);
  });

  if (!destino.ok) return destino;
  revalidatePath(ROTA.ARTISTA_ENVIAR);
  redirect(destino.dados);
}

/** Passo 2 — gênero e contexto. */
export async function salvarContexto(dados: FormData): Promise<ResultadoDeAcao> {
  const faixaId = texto(dados, 'faixaId');

  const resultado = await executar(async () => {
    const analise = esquemaContexto.safeParse({
      genero: texto(dados, 'genero'),
      contexto: texto(dados, 'contexto'),
    });

    if (!analise.success) {
      return falhaDeCampos(CodigoErro.ENTRADA_INVALIDA, motivosPorCampo(analise.error.issues));
    }

    await atualizarContexto(faixaId, analise.data.genero, analise.data.contexto);
    return sucesso(undefined);
  });

  if (!resultado.ok) return resultado;
  revalidatePath(`${ROTA.ARTISTA_ENVIAR}/${faixaId}/revisao`);
  redirect(`${ROTA.ARTISTA_ENVIAR}/${faixaId}/revisao`);
}
