import 'server-only';

/** Leituras do perfil do artista para Server Components. */

import { contarIndicacoes, lerMeuPerfil, listarFaixasDoArtista } from './repositorio';
import { faixasEnviadas, leiturasConcluidas, statusDaFaixa } from './servico';
import type { StatusNaVitrine } from './servico';
import type { PerfilDoArtista } from './tipos';

export type { PerfilDoArtista } from './tipos';

/** O perfil da sessão, ou `null` se a conta não tem o papel de artista. */
export async function lerPerfilDoArtista(): Promise<PerfilDoArtista | null> {
  return lerMeuPerfil();
}

export type EstatisticasDoArtista = {
  /** Faixas enviadas para curadoria. */
  readonly faixas: number;
  /** Curadorias concluídas. */
  readonly leituras: number;
  /** Compartilhadas por curadores. */
  readonly indicacoes: number;
};

export type LinhaDaVitrine = {
  readonly id: string;
  readonly titulo: string;
  readonly genero: string | null;
  readonly status: StatusNaVitrine;
};

export type Vitrine = {
  readonly perfil: PerfilDoArtista;
  readonly estatisticas: EstatisticasDoArtista;
  readonly faixas: readonly LinhaDaVitrine[];
  /** Há faixas além das que a vitrine mostra. */
  readonly temMais: boolean;
};

/** Quantas faixas o bloco "Suas faixas" mostra — o protótipo mostra três. */
const FAIXAS_NA_VITRINE = 3;

/**
 * 7.1 · a vitrine do perfil, numa ida só por bloco.
 *
 * As três estatísticas e a lista saem de tabelas que já existem (`faixa`,
 * `envio`, `compartilhamento`) e que a RLS já restringe ao dono — nenhuma view
 * nova foi criada. O que **não** está aqui é o catálogo (módulo 6, R4): a
 * vitrine mostra as últimas faixas e o "Ver todas" segue desabilitado.
 */
export async function lerVitrineDoArtista(): Promise<Vitrine | null> {
  const perfil = await lerMeuPerfil();
  if (perfil === null) return null;

  const [faixas, indicacoes] = await Promise.all([
    listarFaixasDoArtista(perfil.perfilArtistaId),
    contarIndicacoes(perfil.perfilArtistaId),
  ]);

  return {
    perfil,
    estatisticas: {
      faixas: faixasEnviadas(faixas),
      leituras: leiturasConcluidas(faixas),
      indicacoes,
    },
    faixas: faixas.slice(0, FAIXAS_NA_VITRINE).map((faixa) => ({
      id: faixa.id,
      titulo: faixa.titulo,
      genero: faixa.genero,
      status: statusDaFaixa(faixa),
    })),
    temMais: faixas.length > FAIXAS_NA_VITRINE,
  };
}
