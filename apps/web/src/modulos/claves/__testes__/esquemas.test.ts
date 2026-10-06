import { describe, expect, it } from 'vitest';

import { esquemaDeCompra, luhnValido } from '../esquemas';

/**
 * O schema do checkout (5.2). Os cartões são os de teste do sandbox do Asaas:
 * `5162306219378829` aprova e `5184019740373151` é recusado pelo emissor — os
 * dois passam no Luhn, porque recusa é do banco, não do formato.
 */

const PACOTE = '5b0a3c1e-8d2f-4a6b-9c7d-1e2f3a4b5c6d';
const CPF = '529.982.247-25';

const CARTAO = {
  pacoteId: PACOTE,
  meio: 'cartao',
  cpf: CPF,
  titular: 'E2E Artista',
  numero: '5162 3062 1937 8829',
  validade: '12/30',
  cvv: '123',
  telefone: '(11) 98765-4321',
  cep: '01310-100',
};

function motivos(entrada: unknown): Record<string, string> {
  const analise = esquemaDeCompra.safeParse(entrada);
  if (analise.success) return {};
  return Object.fromEntries(analise.error.issues.map((i) => [String(i.path[0]), i.message]));
}

describe('luhnValido', () => {
  it('aceita os cartões de teste do sandbox, aprovado e recusado', () => {
    expect(luhnValido('5162306219378829')).toBe(true);
    expect(luhnValido('5184 0197 4037 3151')).toBe(true);
  });

  it('recusa dígito trocado e comprimento fora de 13–19', () => {
    expect(luhnValido('5162306219378828')).toBe(false);
    expect(luhnValido('123456789012')).toBe(false);
  });
});

describe('esquemaDeCompra', () => {
  it('Pix pede só pacote e CPF, e normaliza o CPF para dígitos', () => {
    const analise = esquemaDeCompra.safeParse({ pacoteId: PACOTE, meio: 'pix', cpf: CPF });
    expect(analise.success && analise.data.cpf).toBe('52998224725');
  });

  it('Pix sem CPF válido é recusado — o Asaas não emite cobrança sem ele', () => {
    expect(motivos({ pacoteId: PACOTE, meio: 'pix', cpf: '111.111.111-11' })).toEqual({
      cpf: 'cpf_invalido',
    });
  });

  it('cartão completo sai normalizado para a API', () => {
    const analise = esquemaDeCompra.safeParse(CARTAO);
    if (!analise.success || analise.data.meio !== 'cartao') throw new Error('esperado cartão');
    expect(analise.data).toMatchObject({
      numero: '5162306219378829',
      validade: { mes: '12', ano: '2030' },
      telefone: '11987654321',
      cep: '01310100',
    });
  });

  it('cartão exige titular, validade, código, telefone com DDD e CEP', () => {
    expect(
      motivos({
        ...CARTAO,
        titular: ' ',
        numero: '5162306219378828',
        validade: '13/30',
        cvv: '12',
        telefone: '98765-4321',
        cep: '0131',
      }),
    ).toEqual({
      titular: 'titular_vazio',
      numero: 'numero_invalido',
      validade: 'validade_invalida',
      cvv: 'cvv_invalido',
      telefone: 'telefone_invalido',
      cep: 'cep_invalido',
    });
  });

  it('nenhuma mensagem ecoa o valor recebido', () => {
    const analise = esquemaDeCompra.safeParse({ ...CARTAO, numero: '4111111111111112' });
    expect(analise.success).toBe(false);
    if (!analise.success) {
      for (const issue of analise.error.issues) expect(issue.message).not.toContain('4111');
    }
  });
});

/**
 * O terceiro caminho do checkout: pagar com o cartão que o Asaas já tokenizou.
 *
 * O ponto de guardar o token é que, aqui, **nenhum dado de cartão trafega** —
 * e o schema é o que garante isso. Aceitar o número junto do id faria a
 * economia desaparecer sem ninguém notar.
 */
describe('compra com cartão salvo', () => {
  const SALVO = {
    pacoteId: PACOTE,
    meio: 'cartao_salvo',
    cpf: CPF,
    cartaoId: '018f4a2e-0000-7000-8000-000000000000',
  };

  it('aceita só o id do cartão', () => {
    const analise = esquemaDeCompra.safeParse(SALVO);
    expect(analise.success).toBe(true);
    expect(analise.success && analise.data.meio).toBe('cartao_salvo');
  });

  it('recusa id que não é uuid', () => {
    expect(esquemaDeCompra.safeParse({ ...SALVO, cartaoId: 'nao-e-uuid' }).success).toBe(false);
  });

  it('exige o id — sem ele não há o que cobrar', () => {
    const semId = { pacoteId: PACOTE, meio: 'cartao_salvo', cpf: CPF };
    expect(esquemaDeCompra.safeParse(semId).success).toBe(false);
  });

  it('o número do cartão não entra nesta variante', () => {
    // União discriminada com `strip`: campo a mais é descartado, não guardado.
    // O que importa é que ele **não** chegue à saída — e daí ao provedor.
    const analise = esquemaDeCompra.safeParse({ ...SALVO, numero: '5162306219378829' });
    expect(analise.success).toBe(true);
    expect(analise.success && 'numero' in analise.data).toBe(false);
  });
});
