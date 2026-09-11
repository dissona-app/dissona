/**
 * Tradução do `/me` do SoundCloud para a forma que o GoTrue espera.
 *
 * Existe por um detalhe do Supabase Auth que não tem contorno por configuração:
 * `models.NewIdentity` lê `identityData["sub"]` e, se não achar, aborta o login
 * com `missing provider id`. O `/me` do SoundCloud devolve `id` e `urn`, nunca
 * `sub`.
 *
 * O `attribute_mapping` do provider **não** resolve: ele roda depois do parse
 * do userinfo para a struct `Claims` do GoTrue, e `id`/`urn` não existem nessa
 * struct — somem antes de o mapeamento ver qualquer coisa (issue
 * supabase/auth#2519). A saída é traduzir antes, e é isto aqui.
 *
 * Módulo puro de propósito: nenhuma API do Deno, nenhuma rede. É o que os
 * testes cobrem, e é por isso que ele não vive dentro do `index.ts`.
 */

/** Os campos do `/me` que nos interessam. O resto do payload é ignorado. */
export type PerfilSoundCloud = {
  readonly id?: unknown;
  readonly urn?: unknown;
  readonly username?: unknown;
  readonly full_name?: unknown;
  readonly avatar_url?: unknown;
  readonly permalink_url?: unknown;
  readonly plan?: unknown;
};

/**
 * O que devolvemos. Os nomes são os da struct `Claims` do GoTrue — qualquer
 * chave fora dela é descartada no parse, e é por isso que `urn` e
 * `permalink_url` viajam dentro de `custom_claims`, que é campo dela.
 */
export type UserinfoOidc = {
  readonly sub: string;
  readonly name?: string;
  readonly full_name?: string;
  readonly preferred_username?: string;
  readonly picture?: string;
  readonly avatar_url?: string;
  readonly custom_claims?: Readonly<Record<string, string>>;
};

/** Texto não-vazio, ou `undefined`. Número vira texto: o `id` deles é inteiro. */
function textoDe(valor: unknown): string | undefined {
  if (typeof valor === 'string') {
    const limpo = valor.trim();
    return limpo === '' ? undefined : limpo;
  }
  if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor);
  return undefined;
}

/**
 * Traduz o corpo do `/me`. Devolve `null` quando não há identificador algum —
 * e quem chama **tem** de tratar isso como erro em vez de responder 200 sem
 * `sub`, porque o erro que o GoTrue devolveria depois é opaco para quem estiver
 * tentando entrar.
 */
export function paraUserinfo(corpo: unknown): UserinfoOidc | null {
  if (typeof corpo !== 'object' || corpo === null) return null;

  const perfil = corpo as PerfilSoundCloud;

  // `urn` primeiro: é o identificador estável deles (`soundcloud:users:123`),
  // e sobrevive a uma eventual troca de representação do `id` numérico.
  const sub = textoDe(perfil.urn) ?? textoDe(perfil.id);
  if (sub === undefined) return null;

  const nomeCompleto = textoDe(perfil.full_name);
  const usuario = textoDe(perfil.username);
  const foto = textoDe(perfil.avatar_url);

  // `name` é o que a migration 0002e consome para nomear o perfil, então ele
  // cai para o `username` quando a pessoa não preencheu o nome no SoundCloud.
  const nome = nomeCompleto ?? usuario;

  const extras: Record<string, string> = {};
  const urn = textoDe(perfil.urn);
  const permalink = textoDe(perfil.permalink_url);
  const plano = textoDe(perfil.plan);
  if (urn !== undefined) extras['urn'] = urn;
  if (permalink !== undefined) extras['permalink_url'] = permalink;
  if (plano !== undefined) extras['plan'] = plano;

  return {
    sub,
    ...(nome === undefined ? {} : { name: nome }),
    ...(nomeCompleto === undefined ? {} : { full_name: nomeCompleto }),
    ...(usuario === undefined ? {} : { preferred_username: usuario }),
    ...(foto === undefined ? {} : { picture: foto, avatar_url: foto }),
    ...(Object.keys(extras).length === 0 ? {} : { custom_claims: extras }),
  };
}
