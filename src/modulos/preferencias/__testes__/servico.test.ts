import { describe, expect, it } from 'vitest';

import { aplicarEscolhas } from '../servico';
import type { EscolhaDeEvento, EventoDoCatalogo } from '../tipos';

/**
 * A sobreposição de escolhas sobre o catálogo (7.3 / 17.3).
 *
 * É o ponto onde um engano fica invisível: tratar "sem linha" como desligado
 * silenciaria todos os avisos de quem nunca abriu a tela, e ninguém
 * reclamaria — a pessoa simplesmente pararia de ser avisada.
 */

const evento = (
  chave: string,
  canaisPadrao: EventoDoCatalogo['canaisPadrao'],
  critico = false,
): EventoDoCatalogo => ({ chave, titulo: `Título de ${chave}`, critico, canaisPadrao });

const escolha = (chave: string, inApp: boolean, email: boolean): EscolhaDeEvento => ({
  evento: chave,
  inApp,
  email,
});

describe('aplicarEscolhas', () => {
  it('sem linha de preferência, os dois canais valem ligados', () => {
    const [primeiro] = aplicarEscolhas([evento('a', ['in_app', 'email'])], []);

    expect(primeiro?.inApp).toBe(true);
    expect(primeiro?.email).toBe(true);
  });

  it('a linha do usuário vence o padrão', () => {
    const [primeiro] = aplicarEscolhas(
      [evento('a', ['in_app', 'email'])],
      [escolha('a', false, true)],
    );

    expect(primeiro?.inApp).toBe(false);
    expect(primeiro?.email).toBe(true);
  });

  it('nunca liga um canal que o evento não tem, mesmo com a linha pedindo', () => {
    // Uma linha antiga pedindo e-mail num evento que virou só in-app não pode
    // ressuscitar o canal — `canais_padrao` é quem manda.
    const [primeiro] = aplicarEscolhas([evento('a', ['in_app'])], [escolha('a', true, true)]);

    expect(primeiro?.email).toBe(false);
    expect(primeiro?.temEmail).toBe(false);
    expect(primeiro?.inApp).toBe(true);
  });

  it('expõe quais canais o evento tem, para a tela não desenhar caixa inútil', () => {
    const [primeiro] = aplicarEscolhas([evento('a', ['email'])], []);

    expect(primeiro?.temInApp).toBe(false);
    expect(primeiro?.temEmail).toBe(true);
  });

  it('preserva a criticidade do catálogo', () => {
    const [primeiro] = aplicarEscolhas([evento('a', ['in_app'], true)], []);
    expect(primeiro?.critico).toBe(true);
  });

  it('ignora escolha de evento que não está no catálogo do papel', () => {
    // O curador tem preferência de um evento de artista: a tela do artista não
    // pode passar a listá-lo só porque existe linha.
    const saida = aplicarEscolhas(
      [evento('a', ['in_app'])],
      [escolha('de-outro-papel', false, false)],
    );

    expect(saida).toHaveLength(1);
    expect(saida[0]?.evento).toBe('a');
  });

  it('mantém a ordem do catálogo', () => {
    const saida = aplicarEscolhas(
      [evento('c', ['in_app']), evento('a', ['in_app']), evento('b', ['in_app'])],
      [],
    );

    expect(saida.map((cada) => cada.evento)).toEqual(['c', 'a', 'b']);
  });
});
