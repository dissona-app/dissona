import { describe, expect, it } from 'vitest';

import { deClavesInteiras, paraClaves } from '@dissona/nucleo/lib/claves';

import {
  comServicoObrigatorio,
  custoDoCurador,
  podeReceberEnvio,
  totalDaSelecao,
} from '../servico';
import type { CuradorDisponivel } from '../tipos';

/**
 * Regra da seleção.
 *
 * O teste que mais importa é o do `feedback` implícito: a RPC o inclui à
 * força, e se a tela não fizer o mesmo o total exibido não bate com o
 * debitado — o artista veria 3 Claves e perderia 5.
 */

const BRONZE: CuradorDisponivel = {
  perfilCuradorId: 'c1',
  nome: 'E2E Bronze',
  classe: 'bronze',
  servicos: [
    { tipo: 'feedback', descricao: null, precoClaves: paraClaves('2') },
    { tipo: 'playlist', descricao: null, precoClaves: paraClaves('3') },
    { tipo: 'post', descricao: null, precoClaves: paraClaves('4') },
  ],
};

const SEM_FEEDBACK: CuradorDisponivel = {
  perfilCuradorId: 'c2',
  nome: 'Só playlist',
  classe: 'prata',
  servicos: [{ tipo: 'playlist', descricao: null, precoClaves: paraClaves('3') }],
};

describe('comServicoObrigatorio', () => {
  it('acrescenta feedback quando falta', () => {
    expect(comServicoObrigatorio(['playlist'])).toEqual(['feedback', 'playlist']);
  });

  it('não duplica quando já está', () => {
    expect(comServicoObrigatorio(['feedback', 'post'])).toEqual(['feedback', 'post']);
  });

  it('numa seleção vazia, feedback sozinho', () => {
    expect(comServicoObrigatorio([])).toEqual(['feedback']);
  });
});

describe('custoDoCurador', () => {
  it('cobra o feedback mesmo sem ele ter sido marcado', () => {
    // É a asserção central: a RPC inclui `feedback` à força, então escolher só
    // "playlist" custa 3 + 2, e não 3.
    expect(custoDoCurador(BRONZE, ['playlist'])).toBe(deClavesInteiras(5));
  });

  it('soma os opcionais marcados', () => {
    expect(custoDoCurador(BRONZE, ['playlist', 'post'])).toBe(deClavesInteiras(9));
  });

  it('sem opcional nenhum, cobra só o feedback', () => {
    expect(custoDoCurador(BRONZE, [])).toBe(deClavesInteiras(2));
  });

  it('ignora serviço que o curador não oferece', () => {
    expect(custoDoCurador(BRONZE, ['materia'])).toBe(deClavesInteiras(2));
  });
});

describe('totalDaSelecao', () => {
  it('soma os curadores escolhidos', () => {
    const total = totalDaSelecao(
      [BRONZE, SEM_FEEDBACK],
      [
        { perfilCuradorId: 'c1', servicos: ['playlist'] },
        { perfilCuradorId: 'c2', servicos: ['playlist'] },
      ],
    );
    // c1: 2 + 3 = 5. c2 não tem feedback, então só a playlist entra: 3.
    expect(total).toBe(deClavesInteiras(8));
  });

  it('curador fora da lista não soma nada', () => {
    const total = totalDaSelecao([BRONZE], [{ perfilCuradorId: 'inexistente', servicos: [] }]);
    expect(total).toBe(deClavesInteiras(0));
  });

  it('seleção vazia custa zero', () => {
    expect(totalDaSelecao([BRONZE], [])).toBe(deClavesInteiras(0));
  });
});

describe('podeReceberEnvio', () => {
  it('exige feedback ativo — é o DS012 da RPC', () => {
    expect(podeReceberEnvio(BRONZE)).toBe(true);
    expect(podeReceberEnvio(SEM_FEEDBACK)).toBe(false);
  });
});
