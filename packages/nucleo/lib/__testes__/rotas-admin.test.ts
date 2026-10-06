import { describe, expect, it } from 'vitest';

import { ROTA } from '../guarda-rota';
import {
  baseDoAdmin,
  ehCaminhoDoAdmin,
  ehHostDoAdmin,
  hostDoAdmin,
  hostPrincipal,
  paraExterno,
  paraInterno,
  passaDiretoNoHostDoAdmin,
} from '../rotas-admin';

describe('hosts', () => {
  it('reconhece o subdomínio do admin, com ou sem porta', () => {
    expect(ehHostDoAdmin('admin.dissona.com.br')).toBe(true);
    expect(ehHostDoAdmin('admin.localhost:3100')).toBe(true);
    expect(ehHostDoAdmin('dissona.com.br')).toBe(false);
    expect(ehHostDoAdmin('localhost:3000')).toBe(false);
    expect(ehHostDoAdmin('administracao.dissona.com.br')).toBe(false);
    expect(ehHostDoAdmin(null)).toBe(false);
  });

  it('vai e volta entre o host principal e o do admin', () => {
    expect(hostDoAdmin('dissona.com.br')).toBe('admin.dissona.com.br');
    expect(hostDoAdmin('www.dissona.com.br')).toBe('admin.dissona.com.br');
    expect(hostDoAdmin('localhost:3100')).toBe('admin.localhost:3100');
    expect(hostDoAdmin('admin.localhost:3100')).toBe('admin.localhost:3100');
    expect(hostPrincipal('admin.dissona.com.br')).toBe('dissona.com.br');
    expect(hostPrincipal('admin.localhost:3100')).toBe('localhost:3100');
    expect(hostPrincipal('dissona.com.br')).toBe('dissona.com.br');
  });

  it('a base é vazia só no subdomínio', () => {
    expect(baseDoAdmin('admin.dissona.com.br')).toBe('');
    expect(baseDoAdmin('dissona-git-x.vercel.app')).toBe('/admin');
    expect(baseDoAdmin(undefined)).toBe('/admin');
  });
});

describe('caminhos', () => {
  it('só o prefixo exato é do admin', () => {
    expect(ehCaminhoDoAdmin(ROTA.ADMIN)).toBe(true);
    expect(ehCaminhoDoAdmin(`${ROTA.ADMIN_EQUIPE}?aba=dados`)).toBe(true);
    expect(ehCaminhoDoAdmin('/administradores')).toBe(false);
    expect(ehCaminhoDoAdmin(ROTA.ARTISTA)).toBe(false);
  });

  it('no subdomínio, o externo perde o /admin e mantém a query', () => {
    expect(paraExterno(ROTA.ADMIN, '')).toBe('/');
    expect(paraExterno(ROTA.ADMIN_ENTRAR, '')).toBe('/entrar');
    expect(paraExterno(`${ROTA.ADMIN_CONVITE}?token=abc`, '')).toBe('/convite?token=abc');
    expect(paraExterno(`${ROTA.ADMIN}?salvo=1`, '')).toBe('/?salvo=1');
  });

  it('no modo caminho, e para quem não é do admin, nada muda', () => {
    expect(paraExterno(ROTA.ADMIN_EQUIPE, '/admin')).toBe(ROTA.ADMIN_EQUIPE);
    expect(paraExterno(ROTA.ARTISTA_ENTRAR, '')).toBe(ROTA.ARTISTA_ENTRAR);
    expect(paraExterno('/administradores', '')).toBe('/administradores');
  });

  it('o interno é o inverso do externo', () => {
    for (const interno of [
      ROTA.ADMIN,
      ROTA.ADMIN_ENTRAR,
      ROTA.ADMIN_PACOTES_NOVO,
      `${ROTA.ADMIN_EQUIPE}?aba=papeis`,
    ]) {
      expect(paraInterno(paraExterno(interno, ''), '')).toBe(interno);
    }
  });

  it('o interno é idempotente e respeita o que passa direto', () => {
    expect(paraInterno(ROTA.ADMIN_EQUIPE, '')).toBe(ROTA.ADMIN_EQUIPE);
    expect(paraInterno(ROTA.API_AUTH_CONFIRMAR, '')).toBe(ROTA.API_AUTH_CONFIRMAR);
    expect(paraInterno(ROTA.PRIVACIDADE, '')).toBe(ROTA.PRIVACIDADE);
    expect(paraInterno('/equipe', '/admin')).toBe('/equipe');
  });

  it('passa direto: API, páginas legais, telas compartilhadas e estáticos', () => {
    for (const caminho of [
      '/api/auth/confirmar',
      ROTA.TERMOS,
      ROTA.PRIVACIDADE,
      `${ROTA.ONBOARDING}?rever=1`,
      ROTA.VERIFICAR_EMAIL,
      '/_next/static/x.js',
      '/marca/dissona-horizontal.png',
    ]) {
      expect(passaDiretoNoHostDoAdmin(caminho)).toBe(true);
    }
    for (const caminho of ['/', '/entrar', '/equipe', '/pacotes/novo', '/apis']) {
      expect(passaDiretoNoHostDoAdmin(caminho)).toBe(false);
    }
  });
});
