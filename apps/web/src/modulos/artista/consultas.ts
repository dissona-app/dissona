import 'server-only';

/** Leituras do perfil do artista para Server Components. */

import {
  contarIndicacoes,
  lerMeuPerfil,
  listarFaixasDoArtista,
  listarFaixasEnviadas,
  notasDasFaixas,
} from './repositorio';
import {
  etapaDaLeitura,
  faixasEnviadas,
  leiturasConcluidas,
  situacaoNaLista,
  statusDaFaixa,
} from './servico';
import type { SituacaoNaLista, StatusNaVitrine } from './servico';
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
  /** NF média (0–10) das leituras concluídas; `null` sem leitura. */
  readonly nota: number | null;
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

  // O Perfil é o que os curadores veem: rascunho (faixa começada e não
  // enviada) não entra. Os rascunhos ficam em "Minhas faixas".
  const enviadas = faixas.filter((faixa) => faixa.envios > 0);
  const notas = await notasDasFaixas(enviadas.slice(0, FAIXAS_NA_VITRINE));

  return {
    perfil,
    estatisticas: {
      faixas: faixasEnviadas(faixas),
      leituras: leiturasConcluidas(faixas),
      indicacoes,
    },
    faixas: enviadas.slice(0, FAIXAS_NA_VITRINE).map((faixa) => ({
      id: faixa.id,
      titulo: faixa.titulo,
      genero: faixa.genero,
      status: statusDaFaixa(faixa),
      nota: notas.get(faixa.id) ?? null,
    })),
    temMais: enviadas.length > FAIXAS_NA_VITRINE,
  };
}

/* ------------------------------------------------- minhas faixas (3.4) --- */

export type FaixaNaLista = {
  readonly id: string;
  readonly titulo: string;
  readonly genero: string | null;
  readonly situacao: SituacaoNaLista;
  readonly curadores: number;
  readonly prontos: number;
  readonly etapa: 1 | 2 | 3 | 4;
  readonly media: number | null;
};

export type RascunhoNaLista = {
  readonly id: string;
  readonly titulo: string;
  readonly genero: string | null;
};

export type MinhasFaixas = {
  readonly enviadas: readonly FaixaNaLista[];
  /** Faixas começadas e não enviadas — continuam pelo wizard. */
  readonly rascunhos: readonly RascunhoNaLista[];
};

/** Tudo que "Minhas faixas" mostra, numa ida. */
export async function lerMinhasFaixas(): Promise<MinhasFaixas | null> {
  const perfil = await lerMeuPerfil();
  if (perfil === null) return null;

  const todas = await listarFaixasEnviadas(perfil.perfilArtistaId);
  const faixas = todas.filter((faixa) => faixa.envios.length > 0);
  const rascunhos = todas
    .filter((faixa) => faixa.envios.length === 0)
    .map((faixa) => ({ id: faixa.id, titulo: faixa.titulo, genero: faixa.genero }));
  const notas = await notasDasFaixas(
    faixas.map((faixa) => ({ id: faixa.id, envioIds: faixa.envios.map((envio) => envio.id) })),
  );
  const agora = new Date();

  const enviadas = faixas.map((faixa) => {
    const validos = faixa.envios.filter((envio) => envio.situacao !== 'cancelado');
    return {
      id: faixa.id,
      titulo: faixa.titulo,
      genero: faixa.genero,
      situacao: situacaoNaLista(faixa.envios, agora),
      curadores: validos.length,
      prontos: validos.filter((envio) => envio.situacao === 'pronto').length,
      etapa: etapaDaLeitura(faixa.envios),
      media: notas.get(faixa.id) ?? null,
    };
  });

  return { enviadas, rascunhos };
}
