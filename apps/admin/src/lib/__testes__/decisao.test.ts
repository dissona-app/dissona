import { describe, expect, it } from 'vitest';

import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import type { LeituraDePapeis } from '@dissona/nucleo/lib/papeis';
import { Papel, SituacaoConta } from '@dissona/nucleo/lib/papeis';

import type { ContextoDoPainel } from '../decisao';
import { decidirNoPainel } from '../decisao';

const SITE = 'https://dissona.com.br';
const semSessao: LeituraDePapeis = { estado: 'sem_sessao' };

type Contexto = Extract<LeituraDePapeis, { readonly estado: 'ok' }>;

const com = (papeis: readonly Papel[], ajustes: Partial<Contexto> = {}): LeituraDePapeis => ({
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

function decidir(ajustes: Partial<ContextoDoPainel> & Pick<ContextoDoPainel, 'caminho'>) {
  return decidirNoPainel({ busca: '', leitura: semSessao, urlDoSite: SITE, ...ajustes });
}

describe('painel administrativo', () => {
  it('serve as rotas limpas quando a guarda deixa', () => {
    const admin = com([Papel.ADMIN]);
    for (const caminho of ['/', '/equipe', '/pacotes', '/pacotes/novo']) {
      expect(decidir({ caminho, leitura: admin })).toEqual({ tipo: 'seguir' });
    }
    for (const caminho of ['/entrar', '/recuperar-senha', '/redefinir-senha', '/convite']) {
      expect(decidir({ caminho })).toEqual({ tipo: 'seguir' });
    }
  });

  it('sem sessão, manda ao login limpo, com o próximo limpo', () => {
    expect(decidir({ caminho: '/pacotes/novo' })).toEqual({
      tipo: 'redirecionar',
      para: '/entrar?proximo=%2Fpacotes%2Fnovo',
      permanente: false,
    });
  });

  it('admin autenticado no login vai ao painel', () => {
    expect(decidir({ caminho: '/entrar', leitura: com([Papel.ADMIN]) })).toEqual({
      tipo: 'redirecionar',
      para: '/',
      permanente: false,
    });
  });

  it('conta sem papel admin não entra', () => {
    expect(decidir({ caminho: '/equipe', leitura: com([Papel.ARTISTA]) })).toEqual({
      tipo: 'redirecionar',
      para: '/entrar',
      permanente: false,
    });
  });

  it('conta bloqueada volta ao login do painel, com o motivo', () => {
    const bloqueada = com([Papel.ADMIN], { situacao: SituacaoConta.BLOQUEADA });
    expect(decidir({ caminho: '/equipe', leitura: bloqueada })).toEqual({
      tipo: 'redirecionar',
      para: '/entrar?motivo=bloqueada',
      permanente: false,
    });
  });

  it('o endereço antigo com /admin é corrigido (308), com a query', () => {
    expect(decidir({ caminho: ROTA.ADMIN_EQUIPE, busca: '?aba=dados' })).toEqual({
      tipo: 'redirecionar',
      para: '/equipe?aba=dados',
      permanente: true,
    });
  });

  it('Termos e Privacidade moram no site', () => {
    expect(decidir({ caminho: ROTA.PRIVACIDADE })).toEqual({
      tipo: 'redirecionar',
      para: `${SITE}${ROTA.PRIVACIDADE}`,
      permanente: true,
    });
  });

  it('as telas compartilhadas respondem aqui, com a sessão do painel', () => {
    const admin = com([Papel.ADMIN]);
    expect(decidir({ caminho: ROTA.ONBOARDING, leitura: admin })).toEqual({ tipo: 'seguir' });
    expect(decidir({ caminho: ROTA.VERIFICAR_EMAIL })).toEqual({ tipo: 'seguir' });
    expect(decidir({ caminho: ROTA.API_AUTH_CONFIRMAR })).toEqual({ tipo: 'seguir' });
  });

  it('destino que não é do painel vai ao site', () => {
    // Conta sem aceite de termos: a tela de aceite é do site.
    const semAceite = com([Papel.ARTISTA], { aceiteTermos: false });
    expect(decidir({ caminho: ROTA.ONBOARDING, leitura: semAceite })).toEqual({
      tipo: 'redirecionar',
      para: `${SITE}${ROTA.CADASTRAR_CONFIRMAR}`,
      permanente: false,
    });
  });
});
