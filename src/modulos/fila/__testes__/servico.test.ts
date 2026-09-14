import { describe, expect, it } from 'vitest';

import { paraClaves } from '@/lib/claves';

import {
  contarPrazoCurto,
  ehPrazoCurto,
  filtrar,
  generosDisponiveis,
  naFila,
  ordenar,
  statusNaTela,
} from '../servico';
import type { ItemDaFila, SituacaoEnvio } from '../tipos';

/**
 * Regra da fila (13).
 *
 * Ordenação e filtro vivem no serviço, e não no SQL, porque duas das três
 * colunas ordenáveis não são colunas: "Status" é derivado do relógio, e
 * "Música" ordena por **artista** com `localeCompare` pt-BR.
 */

const AGORA = new Date('2026-09-14T12:00:00Z');

function item(
  parcial: Partial<ItemDaFila> & { readonly artista: string; readonly horasAtePrazo: number },
): ItemDaFila {
  const { horasAtePrazo, ...resto } = parcial;
  return {
    envioId: `e-${parcial.artista}-${horasAtePrazo}`,
    faixaId: 'f1',
    titulo: 'Faixa',
    genero: 'Indie',
    situacao: 'recebeu' as SituacaoEnvio,
    prazoEm: new Date(AGORA.getTime() + horasAtePrazo * 3_600_000),
    devolucaoEm: new Date(AGORA.getTime() + 7 * 24 * 3_600_000),
    enviadoEm: AGORA,
    totalClaves: paraClaves('2'),
    duracaoSegundos: 200,
    contextoCurador: null,
    arquivoCaminho: 'uid/f.mp3',
    ...resto,
  };
}

describe('statusNaTela', () => {
  it('recebeu vira "nova"', () => {
    expect(statusNaTela(item({ artista: 'A', horasAtePrazo: 40 }), AGORA)).toBe('nova');
  });

  it('ouviu e avaliando viram "em escuta"', () => {
    expect(statusNaTela(item({ artista: 'A', horasAtePrazo: 40, situacao: 'ouviu' }), AGORA)).toBe(
      'em_escuta',
    );
    expect(
      statusNaTela(item({ artista: 'A', horasAtePrazo: 40, situacao: 'avaliando' }), AGORA),
    ).toBe('em_escuta');
  });

  it('prazo vencido vence o estado do banco', () => {
    // Um envio em `avaliando` com o prazo estourado é **atrasado**. Chamá-lo de
    // "Em escuta" esconderia exatamente o que importa na fila.
    expect(
      statusNaTela(item({ artista: 'A', horasAtePrazo: -1, situacao: 'avaliando' }), AGORA),
    ).toBe('atrasada');
  });
});

describe('naFila', () => {
  it('pronto e devolvido saíram da fila', () => {
    expect(naFila(item({ artista: 'A', horasAtePrazo: 10, situacao: 'pronto' }))).toBe(false);
    expect(naFila(item({ artista: 'A', horasAtePrazo: 10, situacao: 'devolvido' }))).toBe(false);
    expect(naFila(item({ artista: 'A', horasAtePrazo: 10 }))).toBe(true);
  });
});

describe('prazo curto', () => {
  it('menos de 24h conta; vencido não', () => {
    expect(ehPrazoCurto(item({ artista: 'A', horasAtePrazo: 5 }), AGORA)).toBe(true);
    expect(ehPrazoCurto(item({ artista: 'A', horasAtePrazo: 30 }), AGORA)).toBe(false);
    // Vencido é "atrasada", não "prazo curto" — são recortes diferentes, e
    // somá-los inflaria o contador de urgência do resumo.
    expect(ehPrazoCurto(item({ artista: 'A', horasAtePrazo: -2 }), AGORA)).toBe(false);
  });

  it('conta quantos estão curtos', () => {
    const fila = [
      item({ artista: 'A', horasAtePrazo: 5 }),
      item({ artista: 'B', horasAtePrazo: 40 }),
      item({ artista: 'C', horasAtePrazo: 2 }),
    ];
    expect(contarPrazoCurto(fila, AGORA)).toBe(2);
  });
});

describe('ordenar', () => {
  const fila = [
    item({ artista: 'Zeca', horasAtePrazo: 40 }),
    item({ artista: 'Ana', horasAtePrazo: 5 }),
    item({ artista: 'Émile', horasAtePrazo: 60 }),
  ];

  it('por prazo, o mais urgente primeiro — é o padrão', () => {
    expect(ordenar(fila, 'prazo', 'asc', AGORA).map((i) => i.artista)).toEqual([
      'Ana',
      'Zeca',
      'Émile',
    ]);
  });

  it('"Música" ordena por artista, não por título', () => {
    expect(ordenar(fila, 'musica', 'asc', AGORA).map((i) => i.artista)).toEqual([
      'Ana',
      'Émile',
      'Zeca',
    ]);
  });

  it('ordena com acento em pt-BR, e não por code point', () => {
    // Em ordem de code point "Zeca" viria antes de "Émile" (É = U+00C9 > Z).
    const ordenados = ordenar(fila, 'musica', 'asc', AGORA).map((i) => i.artista);
    expect(ordenados.indexOf('Émile')).toBeLessThan(ordenados.indexOf('Zeca'));
  });

  it('inverte com desc', () => {
    expect(ordenar(fila, 'musica', 'desc', AGORA).map((i) => i.artista)).toEqual([
      'Zeca',
      'Émile',
      'Ana',
    ]);
  });

  it('por status, atrasada vem primeiro e o empate volta ao prazo', () => {
    const comAtraso = [
      item({ artista: 'A', horasAtePrazo: 40 }),
      item({ artista: 'B', horasAtePrazo: -3 }),
      item({ artista: 'C', horasAtePrazo: 10 }),
    ];
    expect(ordenar(comAtraso, 'status', 'asc', AGORA).map((i) => i.artista)).toEqual([
      'B',
      'C',
      'A',
    ]);
  });

  it('não altera o array recebido', () => {
    const original = [...fila];
    ordenar(fila, 'musica', 'asc', AGORA);
    expect(fila).toEqual(original);
  });
});

describe('filtrar', () => {
  const fila = [
    item({ artista: 'A', horasAtePrazo: 40, genero: 'Indie' }),
    item({ artista: 'B', horasAtePrazo: -2, genero: 'Trap' }),
    item({ artista: 'C', horasAtePrazo: 10, genero: 'Indie', situacao: 'ouviu' }),
  ];

  it('por status', () => {
    expect(filtrar(fila, 'atrasada', null, AGORA)).toHaveLength(1);
    expect(filtrar(fila, 'nova', null, AGORA)).toHaveLength(1);
    expect(filtrar(fila, 'em_escuta', null, AGORA)).toHaveLength(1);
    expect(filtrar(fila, 'todas', null, AGORA)).toHaveLength(3);
  });

  it('por gênero', () => {
    expect(filtrar(fila, 'todas', 'Indie', AGORA)).toHaveLength(2);
  });

  it('os dois juntos', () => {
    expect(filtrar(fila, 'nova', 'Indie', AGORA)).toHaveLength(1);
    expect(filtrar(fila, 'nova', 'Trap', AGORA)).toHaveLength(0);
  });
});

describe('generosDisponiveis', () => {
  it('devolve os distintos, ordenados em pt-BR, sem nulo', () => {
    const fila = [
      item({ artista: 'A', horasAtePrazo: 1, genero: 'Trap' }),
      item({ artista: 'B', horasAtePrazo: 1, genero: 'Indie' }),
      item({ artista: 'C', horasAtePrazo: 1, genero: 'Trap' }),
      item({ artista: 'D', horasAtePrazo: 1, genero: null }),
    ];
    expect(generosDisponiveis(fila)).toEqual(['Indie', 'Trap']);
  });
});
