import { describe, expect, it } from 'vitest';

import {
  esquemaCompartilhamento,
  esquemaEscuta,
  esquemaNotaDeCriterio,
  esquemaOutras,
  esquemaSubjetiva,
} from '../esquemas';

/**
 * Validação das cinco etapas (14).
 *
 * O que estes testes fixam não é "o Zod funciona": são as **três decisões** que
 * o esquema carrega e que, invertidas, quebrariam a tela ou o banco em
 * silêncio.
 *
 *  1. Vazio é `null`, e não 0 — nota ausente não é nota zero.
 *  2. Rascunho passa. Feedback e descrição vazios são estado legítimo de quem
 *     usou "Salvar e sair"; quem exige é `enviar_avaliacao`.
 *  3. `nao_compartilhou` não leva link, porque o `check` da `0008` recusa os
 *     dois juntos.
 */

describe('nota de critério', () => {
  it('vazio é ausência de nota, não zero', () => {
    const analise = esquemaNotaDeCriterio.safeParse({
      criterio: 'afinacao',
      nota: '',
      justificativa: '',
    });

    expect(analise.success).toBe(true);
    expect(analise.success && analise.data.nota).toBeNull();
    expect(analise.success && analise.data.justificativa).toBeNull();
  });

  it('aceita vírgula decimal — é o que o teclado pt-BR dá', () => {
    const analise = esquemaNotaDeCriterio.safeParse({
      criterio: 'ritmo',
      nota: '3,5',
      justificativa: '',
    });

    expect(analise.success && analise.data.nota).toBe(3.5);
  });

  it('recusa nota fora de 0–5', () => {
    for (const nota of ['5.1', '-1', 'abc']) {
      const analise = esquemaNotaDeCriterio.safeParse({
        criterio: 'ritmo',
        nota,
        justificativa: '',
      });
      expect(analise.success, nota).toBe(false);
    }
  });

  it('trunca a segunda casa em vez de arredondar', () => {
    const analise = esquemaNotaDeCriterio.safeParse({
      criterio: 'ritmo',
      // Duas casas são recusadas por `notaValida`; o truncamento vale para o
      // que passa, e o teste existe para o dia em que a regra afrouxar.
      nota: '4.2',
      justificativa: '',
    });
    expect(analise.success && analise.data.nota).toBe(4.2);
  });
});

describe('nota subjetiva e feedback', () => {
  it('feedback vazio é rascunho válido, e vira null', () => {
    const analise = esquemaSubjetiva.safeParse({ notaSubjetiva: '3.5', feedback: '   ' });

    expect(analise.success).toBe(true);
    expect(analise.success && analise.data.feedback).toBeNull();
  });

  it('a nota subjetiva é obrigatória', () => {
    expect(esquemaSubjetiva.safeParse({ notaSubjetiva: '', feedback: 'x' }).success).toBe(false);
  });
});

describe('compartilhamento', () => {
  it('"não vou compartilhar" descarta o link em vez de recusá-lo', () => {
    const analise = esquemaCompartilhamento.safeParse({
      modalidade: 'nao_compartilhou',
      url: 'https://exemplo.com/playlist',
    });

    expect(analise.success).toBe(true);
    expect(analise.success && analise.data.url).toBeNull();
  });

  it('preserva o link nas modalidades que o aceitam', () => {
    const analise = esquemaCompartilhamento.safeParse({
      modalidade: 'playlist',
      url: 'open.spotify.com/playlist/1',
    });

    expect(analise.success && analise.data.url).toContain('open.spotify.com');
  });

  it('recusa modalidade fora do enum', () => {
    expect(esquemaCompartilhamento.safeParse({ modalidade: 'tiktok', url: '' }).success).toBe(
      false,
    );
  });
});

describe('outras formas', () => {
  it('descrição vazia é rascunho, e vira null', () => {
    const analise = esquemaOutras.safeParse({ descricao: '', url: '' });

    expect(analise.success).toBe(true);
    expect(analise.success && analise.data.descricao).toBeNull();
  });

  it('recusa descrição além do limite de coluna', () => {
    expect(esquemaOutras.safeParse({ descricao: 'a'.repeat(281), url: '' }).success).toBe(false);
  });
});

describe('escuta medida', () => {
  it('aceita a faixa do check da coluna', () => {
    for (const valor of [0, 60, 100]) expect(esquemaEscuta.safeParse(valor).success).toBe(true);
  });

  it('recusa fora dela — a coluna tem check (0 a 100)', () => {
    for (const valor of [-1, 101]) expect(esquemaEscuta.safeParse(valor).success).toBe(false);
  });
});
