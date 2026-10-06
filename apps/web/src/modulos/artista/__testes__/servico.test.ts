import { describe, expect, it } from 'vitest';

import type { FaixaNaVitrine } from '../repositorio';
import { faixasEnviadas, leiturasConcluidas, statusDaFaixa } from '../servico';

/**
 * Regra da vitrine do perfil (7.1).
 *
 * Os três números da tela são derivados, e não colunas: contá-los errado é o
 * tipo de defeito que ninguém percebe olhando, porque o resultado *parece*
 * plausível.
 */

function faixa(parcial: Partial<FaixaNaVitrine> = {}): FaixaNaVitrine {
  return {
    id: 'f1',
    titulo: 'Faixa',
    genero: 'MPB contemporânea',
    criadoEm: '2026-09-01T12:00:00Z',
    leiturasConcluidas: 0,
    envios: 0,
    ...parcial,
  };
}

describe('status da faixa na vitrine', () => {
  it('faixa sem envio não é "em análise"', () => {
    // Rascunho e "esperando o curador" são estados diferentes para quem enviou.
    expect(statusDaFaixa(faixa()).chave).toBe('sem_envio');
  });

  it('enviada e ainda sem devolutiva é "em análise"', () => {
    expect(statusDaFaixa(faixa({ envios: 2 })).chave).toBe('em_analise');
  });

  it('uma devolutiva é "lida"; mais de uma diz quantas', () => {
    expect(statusDaFaixa(faixa({ envios: 1, leiturasConcluidas: 1 })).chave).toBe('lida');

    const varias = statusDaFaixa(faixa({ envios: 3, leiturasConcluidas: 2 }));
    expect(varias.chave).toBe('lida_por');
    expect(varias.chave === 'lida_por' ? varias.quantos : 0).toBe(2);
  });
});

describe('estatísticas', () => {
  const faixas = [
    faixa({ id: 'a', envios: 0 }),
    faixa({ id: 'b', envios: 2, leiturasConcluidas: 1 }),
    faixa({ id: 'c', envios: 3, leiturasConcluidas: 3 }),
  ];

  it('"Faixas" conta as enviadas para curadoria, não as em rascunho', () => {
    // O rótulo do protótipo é "Enviadas para curadoria": contar o rascunho
    // faria o número subir ao abrir um envio e nunca mais descer.
    expect(faixasEnviadas(faixas)).toBe(2);
  });

  it('"Leituras" soma as curadorias concluídas de todas as faixas', () => {
    expect(leiturasConcluidas(faixas)).toBe(4);
  });

  it('conta nova mostra zero, e não vazio', () => {
    expect(faixasEnviadas([])).toBe(0);
    expect(leiturasConcluidas([])).toBe(0);
  });
});
