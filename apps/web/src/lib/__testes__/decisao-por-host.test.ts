import { describe, expect, it } from 'vitest';

import type { ContextoDoHost } from '../decisao-por-host';
import { decidirNoHost } from '../decisao-por-host';
import { ROTA } from '../guarda-rota';
import type { LeituraDePapeis } from '../papeis';
import { Papel, SituacaoConta } from '../papeis';

const semSessao: LeituraDePapeis = { estado: 'sem_sessao' };

type Contexto = Extract<LeituraDePapeis, { readonly estado: 'ok' }>;

const comAjustes = (
  papeis: readonly Papel[],
  ajustes: Partial<Contexto> = {},
): LeituraDePapeis => ({
  estado: 'ok',
  papeis,
  cadastroCuradorConcluido: true,
  situacao: SituacaoConta.ATIVA,
  situacaoCurador: null,
  onboardingVisto: true,
  ultimoAmbiente: null,
  aceiteTermos: true,
  ...ajustes,
});

const com = (...papeis: readonly Papel[]): LeituraDePapeis => comAjustes(papeis);

const ADMIN = 'admin.dissona.com.br';
const PRINCIPAL = 'dissona.com.br';

function decidir(ajustes: Partial<ContextoDoHost> & Pick<ContextoDoHost, 'caminho' | 'host'>) {
  return decidirNoHost({ busca: '', leitura: semSessao, subdominioLigado: true, ...ajustes });
}

describe('no subdomínio do admin', () => {
  it('reescreve o caminho limpo para o interno quando a guarda deixa passar', () => {
    expect(decidir({ host: ADMIN, caminho: '/equipe', leitura: com(Papel.ADMIN) })).toEqual({
      tipo: 'reescrever',
      caminho: ROTA.ADMIN_EQUIPE,
    });
    expect(decidir({ host: ADMIN, caminho: '/', leitura: com(Papel.ADMIN) })).toEqual({
      tipo: 'reescrever',
      caminho: ROTA.ADMIN,
    });
    expect(decidir({ host: ADMIN, caminho: '/entrar' })).toEqual({
      tipo: 'reescrever',
      caminho: ROTA.ADMIN_ENTRAR,
    });
  });

  it('sem sessão, manda ao login limpo com o próximo também limpo', () => {
    expect(decidir({ host: ADMIN, caminho: '/pacotes/novo' })).toEqual({
      tipo: 'redirecionar',
      para: '/entrar?proximo=%2Fpacotes%2Fnovo',
      permanente: false,
    });
  });

  it('admin já autenticado no login vai ao painel, no próprio subdomínio', () => {
    expect(decidir({ host: ADMIN, caminho: '/entrar', leitura: com(Papel.ADMIN) })).toEqual({
      tipo: 'redirecionar',
      para: '/',
      permanente: false,
    });
  });

  it('corrige com 308 o link interno esquecido, preservando a query', () => {
    expect(decidir({ host: ADMIN, caminho: ROTA.ADMIN_EQUIPE, busca: '?aba=dados' })).toEqual({
      tipo: 'redirecionar',
      para: '/equipe?aba=dados',
      permanente: true,
    });
  });

  it('deixa passar API, páginas legais e telas compartilhadas sem reescrever', () => {
    for (const caminho of [ROTA.API_AUTH_CONFIRMAR, ROTA.TERMOS, ROTA.PRIVACIDADE]) {
      expect(decidir({ host: ADMIN, caminho })).toEqual({ tipo: 'seguir' });
    }
    expect(decidir({ host: ADMIN, caminho: ROTA.ONBOARDING, leitura: com(Papel.ADMIN) })).toEqual({
      tipo: 'seguir',
    });
  });

  it('o que não é do admin não é servido aqui', () => {
    // `/artista` vira `/admin/artista`, que exige papel admin: o artista é
    // devolvido ao login do admin, e não ao painel dele.
    const decisao = decidir({ host: ADMIN, caminho: '/artista', leitura: com(Papel.ARTISTA) });
    expect(decisao).toEqual({ tipo: 'redirecionar', para: '/entrar', permanente: false });
  });

  it('destino fora do admin vai ao host principal', () => {
    // Conta sem aceite em tela compartilhada: o aceite mora no site principal.
    const semAceite = comAjustes([Papel.ARTISTA], { aceiteTermos: false });
    expect(decidir({ host: ADMIN, caminho: ROTA.ONBOARDING, leitura: semAceite })).toEqual({
      tipo: 'redirecionar',
      para: ROTA.CADASTRAR_CONFIRMAR,
      host: PRINCIPAL,
      permanente: false,
    });
  });
});

describe('no host principal', () => {
  it('com o subdomínio ligado, o /admin muda de endereço (308)', () => {
    expect(decidir({ host: PRINCIPAL, caminho: ROTA.ADMIN_EQUIPE, busca: '?aba=papeis' })).toEqual({
      tipo: 'redirecionar',
      para: '/equipe?aba=papeis',
      host: ADMIN,
      permanente: true,
    });
    expect(decidir({ host: 'localhost:3100', caminho: ROTA.ADMIN })).toEqual({
      tipo: 'redirecionar',
      para: '/',
      host: 'admin.localhost:3100',
      permanente: true,
    });
  });

  it('com o subdomínio desligado, tudo segue como antes', () => {
    expect(
      decidir({ host: PRINCIPAL, caminho: ROTA.ADMIN_EQUIPE, subdominioLigado: false }),
    ).toEqual({
      tipo: 'redirecionar',
      para: '/admin/entrar?proximo=%2Fadmin%2Fequipe',
      permanente: false,
    });
    expect(
      decidir({
        host: PRINCIPAL,
        caminho: ROTA.ADMIN_EQUIPE,
        subdominioLigado: false,
        leitura: com(Papel.ADMIN),
      }),
    ).toEqual({ tipo: 'seguir' });
  });

  it('conta só de admin que caiu no login do artista vai ao subdomínio', () => {
    expect(
      decidir({ host: PRINCIPAL, caminho: ROTA.ARTISTA_ENTRAR, leitura: com(Papel.ADMIN) }),
    ).toEqual({
      tipo: 'redirecionar',
      para: '/',
      host: ADMIN,
      permanente: false,
    });
  });

  it('artista e curador não mudam', () => {
    expect(
      decidir({ host: PRINCIPAL, caminho: ROTA.ARTISTA, leitura: com(Papel.ARTISTA) }),
    ).toEqual({
      tipo: 'seguir',
    });
    expect(decidir({ host: PRINCIPAL, caminho: ROTA.CURADOR_FILA })).toEqual({
      tipo: 'redirecionar',
      para: '/curador/entrar?proximo=%2Fcurador%2Ffila',
      permanente: false,
    });
  });
});
