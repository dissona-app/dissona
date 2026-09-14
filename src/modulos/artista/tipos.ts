/**
 * Perfil do artista — tela 7.1.
 *
 * O perfil vive em **duas** tabelas: o que é da conta (nome de exibição,
 * handle, cidade) está em `perfil`, e o que é do papel de artista (bio,
 * gêneros, links) está em `perfil_artista`. A tela é uma só, e por isso o tipo
 * de domínio também — a divisão é do schema, não do produto.
 */

/** O perfil como a tela o lê. */
export type PerfilDoArtista = {
  readonly perfilId: string;
  readonly perfilArtistaId: string;
  /** De `perfil.nome_completo`. Não é editável aqui — é dado de conta. */
  readonly nomeCompleto: string;
  readonly nomeExibicao: string | null;
  readonly handle: string | null;
  readonly cidade: string | null;
  readonly bio: string | null;
  readonly generos: readonly string[];
  readonly linkInstagram: string | null;
  readonly linkSpotify: string | null;
  readonly linkYoutube: string | null;
  readonly linkSite: string | null;
};

/** O que a tela 7.1 grava. Já validado e normalizado pelo schema. */
export type DadosDoPerfil = {
  readonly nomeExibicao: string | null;
  readonly handle: string | null;
  readonly cidade: string | null;
  readonly bio: string | null;
  readonly generos: readonly string[];
  readonly linkInstagram: string | null;
  readonly linkSpotify: string | null;
  readonly linkYoutube: string | null;
  readonly linkSite: string | null;
};

/**
 * Teto de gêneros do perfil do artista.
 *
 * Espelha `check (coalesce(array_length(generos, 1), 0) <= 3)` da migration
 * `0002`. Fica aqui, e não em `configuracao`, porque é **forma do schema** e
 * não número de negócio: mudar o teto exige migration de qualquer jeito, então
 * uma chave de configuração daria a impressão falsa de ser ajustável sem
 * deploy.
 */
export const MAXIMO_DE_GENEROS = 3;

/** Espelha `check (char_length(bio) <= 280)` da mesma migration. */
export const MAXIMO_DA_BIO = 280;
