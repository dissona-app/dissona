import { describe, expect, it } from 'vitest';

import { destinoSeguro, levaAoAceiteDeConvite } from '../esquemas';

/**
 * A exceção do login administrativo (19) para quem vem aceitar convite (27.3).
 *
 * Só o aceite abre a porta: qualquer outro destino segue recusando a conta sem
 * papel `admin`, e um prefixo parecido não pode passar por ele.
 */
describe('levaAoAceiteDeConvite', () => {
  it('aceita o aceite com token', () => {
    expect(levaAoAceiteDeConvite('/admin/convite?token=abc')).toBe(true);
  });

  it('aceita o aceite sem query', () => {
    expect(levaAoAceiteDeConvite('/admin/convite')).toBe(true);
  });

  it('recusa o painel e as demais telas do admin', () => {
    expect(levaAoAceiteDeConvite('/admin')).toBe(false);
    expect(levaAoAceiteDeConvite('/admin/equipe')).toBe(false);
  });

  it('recusa caminho que só começa igual', () => {
    expect(levaAoAceiteDeConvite('/admin/convites')).toBe(false);
    expect(levaAoAceiteDeConvite('/admin/convite-falso?token=abc')).toBe(false);
  });

  it('recusa o destino externo que destinoSeguro já descarta', () => {
    expect(levaAoAceiteDeConvite(destinoSeguro('//exemplo.invalido/admin/convite', '/admin'))).toBe(
      false,
    );
  });
});
