import { describe, expect, it } from 'vitest';

import { paraUserinfo } from '../userinfo';

/**
 * O `/me` real, recortado nos campos que traduzimos. Os outros (`city`,
 * `followers_count`, `primary_email_confirmed`…) existem e são ignorados de
 * propósito — `primary_email_confirmed` é booleano e não serve de e-mail.
 */
const ME = {
  id: 3207,
  urn: 'soundcloud:users:3207',
  username: 'dj_marina',
  full_name: 'Marina Alves',
  avatar_url: 'https://i1.sndcdn.com/avatars-000000-large.jpg',
  permalink_url: 'https://soundcloud.com/dj_marina',
  plan: 'Pro Unlimited',
  primary_email_confirmed: true,
};

/** O `/me` sem as chaves indicadas — para provar os degraus de fallback. */
function semAsChaves(chaves: readonly (keyof typeof ME)[]): Record<string, unknown> {
  const copia: Record<string, unknown> = { ...ME };
  for (const chave of chaves) delete copia[chave];
  return copia;
}

describe('paraUserinfo', () => {
  it('usa o urn como sub — é o identificador estável deles', () => {
    expect(paraUserinfo(ME)?.sub).toBe('soundcloud:users:3207');
  });

  it('cai para o id numérico quando não há urn', () => {
    expect(paraUserinfo(semAsChaves(['urn']))?.sub).toBe('3207');
  });

  it('devolve null sem urn e sem id — é o que impede um 200 sem sub', () => {
    expect(paraUserinfo(semAsChaves(['id', 'urn']))).toBeNull();
  });

  it('nomeia pelo full_name, e cai para o username quando ele falta', () => {
    expect(paraUserinfo(ME)?.name).toBe('Marina Alves');
    expect(paraUserinfo({ ...ME, full_name: '   ' })?.name).toBe('dj_marina');
    expect(paraUserinfo({ ...ME, full_name: null, username: null })?.name).toBeUndefined();
  });

  it('leva urn, permalink e plano em custom_claims — fora dele o parse os descarta', () => {
    expect(paraUserinfo(ME)?.custom_claims).toEqual({
      urn: 'soundcloud:users:3207',
      permalink_url: 'https://soundcloud.com/dj_marina',
      plan: 'Pro Unlimited',
    });
  });

  it('omite custom_claims quando não há nenhum extra', () => {
    expect(paraUserinfo({ id: 1 })?.custom_claims).toBeUndefined();
  });

  it('publica a foto nas duas chaves que o GoTrue conhece', () => {
    const userinfo = paraUserinfo(ME);
    expect(userinfo?.picture).toBe(ME.avatar_url);
    expect(userinfo?.avatar_url).toBe(ME.avatar_url);
  });

  it('nunca devolve e-mail — a API deles não tem o campo', () => {
    expect(paraUserinfo({ ...ME, email: 'nao@deveria.vir' })).not.toHaveProperty('email');
  });

  it('não estoura com corpo inesperado', () => {
    expect(paraUserinfo(null)).toBeNull();
    expect(paraUserinfo('texto')).toBeNull();
    expect(paraUserinfo([])).toBeNull();
    expect(paraUserinfo({})).toBeNull();
    expect(paraUserinfo({ id: Number.NaN })).toBeNull();
    expect(paraUserinfo({ urn: '   ', id: 7 })?.sub).toBe('7');
  });
});
