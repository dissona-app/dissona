'use server';

/**
 * Server Actions do perfil do artista (7.1).
 *
 * Entrada por `FormData`, e não por objeto: a tela é um `<form action={...}>`
 * de verdade, que funciona sem JavaScript — é o padrão do wizard do curador e
 * da equipe, e o certo para um formulário grande com campo repetido (os
 * gêneros chegam como N entradas `genero`).
 */

import { revalidatePath } from 'next/cache';

import { executar, falhaDeCampos, sucesso } from '@/lib/acoes';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { FOTO_MAX_BYTES, FOTO_TIPOS } from '@/lib/arquivos';
import { CodigoErro } from '@/lib/erros';
import { ROTA } from '@/lib/guarda-rota';
import { usuarioAtual } from '@/lib/supabase/servidor';
import { resolverArquivoDoFormulario } from '@/lib/supabase/upload-de-perfil';
import type { MotivoDeArquivo } from '@/lib/supabase/upload-de-perfil';

import { esquemaDadosDoPerfil } from './esquemas';
import { atualizarPerfil, lerMeuPerfil } from './repositorio';

/** Um motivo por campo — o primeiro, que é o que a borda vermelha mostra. */
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

/**
 * A recusa da foto é do **campo** `foto`, e não geral.
 *
 * `FormularioDePerfil` lê `falha.campos`, e não `falha.codigo`: uma falha
 * gravada só no código sairia como erro geral, e o campo ficaria sem borda
 * vermelha nenhuma — o defeito que o AGENTS.md chama de "falha sem mensagem".
 */
const MOTIVO_DA_FOTO: Readonly<Record<MotivoDeArquivo, string>> = {
  tipo: 'foto_tipo',
  tamanho: 'foto_tamanho',
  ausente: 'foto_ausente',
  alheio: 'foto_alheia',
};

function texto(dados: FormData, campo: string): string {
  const valor = dados.get(campo);
  return typeof valor === 'string' ? valor : '';
}

function todos(dados: FormData, campo: string): string[] {
  return dados.getAll(campo).map((valor) => (typeof valor === 'string' ? valor : ''));
}

export async function salvarPerfilDoArtista(dados: FormData): Promise<ResultadoDeAcao> {
  return executar(async () => {
    const analise = esquemaDadosDoPerfil.safeParse({
      nomeExibicao: texto(dados, 'nomeExibicao'),
      cidade: texto(dados, 'cidade'),
      handle: texto(dados, 'handle'),
      bio: texto(dados, 'bio'),
      generos: todos(dados, 'genero'),
      linkInstagram: texto(dados, 'linkInstagram'),
      linkSpotify: texto(dados, 'linkSpotify'),
      linkYoutube: texto(dados, 'linkYoutube'),
      linkSite: texto(dados, 'linkSite'),
    });

    if (!analise.success) {
      return falhaDeCampos(CodigoErro.ENTRADA_INVALIDA, motivosPorCampo(analise.error.issues));
    }

    // Relido do banco em vez de vir do formulário: os dois ids são a chave das
    // duas escritas, e aceitá-los do cliente seria deixar alguém editar o
    // perfil de outra pessoa se a RLS um dia afrouxasse.
    const perfil = await lerMeuPerfil();
    if (perfil === null) {
      return falhaDeCampos(CodigoErro.PAPEL_AUSENTE, {});
    }

    // A foto vem por caminho (o navegador já subiu) ou no `multipart` (sem
    // JavaScript). `caminho: null` é "não mandou foto" — e aí a atual fica.
    const usuario = await usuarioAtual();
    const foto =
      usuario === null
        ? ({ ok: true, caminho: null } as const)
        : await resolverArquivoDoFormulario(
            usuario.id,
            'avatares',
            'perfil',
            texto(dados, 'foto_caminho'),
            dados.get('foto'),
            FOTO_TIPOS,
            FOTO_MAX_BYTES,
          );

    if (!foto.ok) {
      return falhaDeCampos(CodigoErro.ENTRADA_INVALIDA, { foto: MOTIVO_DA_FOTO[foto.motivo] });
    }

    await atualizarPerfil(perfil, analise.data, foto.caminho);

    // As duas telas do módulo leem o mesmo perfil: a vitrine mostra o que o
    // formulário acabou de gravar, e sem revalidar as duas a foto trocada
    // continuaria a antiga na vitrine.
    revalidatePath(ROTA.ARTISTA_PERFIL);
    revalidatePath(ROTA.ARTISTA_PERFIL_EDITAR);
    // E o header, que também mostra a foto em todas as telas do ambiente.
    revalidatePath(ROTA.ARTISTA, 'layout');
    return sucesso();
  });
}
