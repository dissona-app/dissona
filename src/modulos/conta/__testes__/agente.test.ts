import { describe, expect, it } from 'vitest';

import { lerDispositivo } from '../agente';

/**
 * Este teste existe por causa de uma armadilha específica: quase todo
 * `user_agent` moderno **mente**. Edge e Opera dizem "Chrome", Chrome diz
 * "Safari", e o iPad diz "Macintosh". Uma tabela de substrings na ordem errada
 * mostraria "Chrome" para quem está no Edge — e o painel de sessões existe
 * para a pessoa reconhecer a própria sessão e desconfiar das outras. Rotular
 * errado é justamente o que o transforma em ruído.
 */
describe('lerDispositivo', () => {
  it('Chrome no Windows', () => {
    const { navegador, sistema } = lerDispositivo(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    );
    expect(navegador).toBe('Chrome');
    expect(sistema).toBe('Windows');
  });

  it('Edge não é Chrome, embora se anuncie como um', () => {
    const { navegador } = lerDispositivo(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
    );
    expect(navegador).toBe('Edge');
  });

  it('Opera não é Chrome', () => {
    const { navegador } = lerDispositivo(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 OPR/113.0.0.0',
    );
    expect(navegador).toBe('Opera');
  });

  it('Safari de verdade é o que diz Safari sem dizer Chrome', () => {
    const { navegador, sistema } = lerDispositivo(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
    );
    expect(navegador).toBe('Safari');
    expect(sistema).toBe('macOS');
  });

  it('iPhone, e não macOS, apesar do "like Mac OS X"', () => {
    const { navegador, sistema } = lerDispositivo(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
    );
    expect(navegador).toBe('Safari');
    expect(sistema).toBe('iPhone');
  });

  it('Firefox no Android', () => {
    const { navegador, sistema } = lerDispositivo(
      'Mozilla/5.0 (Android 14; Mobile; rv:129.0) Gecko/129.0 Firefox/129.0',
    );
    expect(navegador).toBe('Firefox');
    expect(sistema).toBe('Android');
  });

  it('agente ausente ou vazio devolve os dois nulos', () => {
    // Sessão criada por API sem cabeçalho — a coluna é anulável de verdade.
    expect(lerDispositivo(null)).toEqual({ navegador: null, sistema: null });
    expect(lerDispositivo('   ')).toEqual({ navegador: null, sistema: null });
  });

  it('agente irreconhecível não inventa nome', () => {
    // Um cliente HTTP qualquer. Melhor "desconhecido" na tela que um palpite
    // que faça a pessoa achar que a sessão é dela.
    expect(lerDispositivo('curl/8.7.1')).toEqual({ navegador: null, sistema: null });
  });
});
