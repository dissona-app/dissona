import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { temCookieDeSessao } from '../middleware';

function requisicaoCom(...nomes: string[]): NextRequest {
  return new NextRequest('https://dissona.com.br/artista', {
    headers: { cookie: nomes.map((nome) => `${nome}=x`).join('; ') },
  });
}

describe('temCookieDeSessao', () => {
  it('reconhece o cookie de sessão inteiro e em pedaços', () => {
    expect(temCookieDeSessao(requisicaoCom('sb-abc123-auth-token'))).toBe(true);
    expect(temCookieDeSessao(requisicaoCom('sb-abc123-auth-token.0'))).toBe(true);
  });

  it('não confunde o code-verifier do PKCE com sessão', () => {
    expect(temCookieDeSessao(requisicaoCom('sb-abc123-auth-token-code-verifier'))).toBe(false);
  });

  it('sem cookie do Supabase, não há sessão', () => {
    expect(temCookieDeSessao(requisicaoCom('outro', 'dsn-menu'))).toBe(false);
  });
});
