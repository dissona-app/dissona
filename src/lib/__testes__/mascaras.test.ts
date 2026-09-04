import { describe, expect, it } from 'vitest';

import { ErroDominio } from '../erros';
import {
  chavePixValida,
  cnpjValido,
  cpfValido,
  mascararCpf,
  mascararTelefone,
  normalizarChavePix,
  telefoneValido,
  TipoChavePix,
  tipoChavePix,
} from '../mascaras';

const CPF_VALIDO = '11144477735';
const CPF_VALIDO_2 = '52998224725';
const CNPJ_VALIDO = '11222333000181';

describe('mascararCpf', () => {
  it('aplica a máscara progressivamente', () => {
    expect(mascararCpf('')).toBe('');
    expect(mascararCpf('111')).toBe('111');
    expect(mascararCpf('111444')).toBe('111.444');
    expect(mascararCpf('111444777')).toBe('111.444.777');
    expect(mascararCpf(CPF_VALIDO)).toBe('111.444.777-35');
  });

  it('ignora caracteres não numéricos e o excesso', () => {
    expect(mascararCpf('111.444.777-35')).toBe('111.444.777-35');
    expect(mascararCpf('111444777359999')).toBe('111.444.777-35');
  });
});

describe('cpfValido', () => {
  it('aceita CPF com dígitos verificadores corretos', () => {
    expect(cpfValido(CPF_VALIDO)).toBe(true);
    expect(cpfValido('111.444.777-35')).toBe(true);
    expect(cpfValido(CPF_VALIDO_2)).toBe(true);
  });

  it('rejeita dígito verificador errado', () => {
    expect(cpfValido('11144477734')).toBe(false);
    expect(cpfValido('11144477725')).toBe(false);
  });

  it('rejeita tamanho errado', () => {
    expect(cpfValido('')).toBe(false);
    expect(cpfValido('1114447773')).toBe(false);
    expect(cpfValido('111444777351')).toBe(false);
  });

  it('rejeita sequência de dígitos repetidos', () => {
    for (let d = 0; d <= 9; d += 1) {
      expect(cpfValido(String(d).repeat(11))).toBe(false);
    }
  });
});

describe('cnpjValido', () => {
  it('aceita CNPJ válido', () => {
    expect(cnpjValido(CNPJ_VALIDO)).toBe(true);
    expect(cnpjValido('11.222.333/0001-81')).toBe(true);
  });

  it('rejeita dígito errado, tamanho errado e repetição', () => {
    expect(cnpjValido('11222333000182')).toBe(false);
    expect(cnpjValido('1122233300018')).toBe(false);
    expect(cnpjValido('11111111111111')).toBe(false);
  });
});

describe('mascararTelefone', () => {
  it('formata celular e fixo', () => {
    expect(mascararTelefone('11987654321')).toBe('(11) 98765-4321');
    expect(mascararTelefone('1133334444')).toBe('(11) 3333-4444');
  });

  it('formata progressivamente', () => {
    expect(mascararTelefone('')).toBe('');
    expect(mascararTelefone('1')).toBe('(1');
    expect(mascararTelefone('11')).toBe('(11');
    expect(mascararTelefone('119')).toBe('(11) 9');
    expect(mascararTelefone('1198765')).toBe('(11) 9876-5');
  });
});

describe('telefoneValido', () => {
  it('aceita celular de 11 dígitos com nono dígito 9', () => {
    expect(telefoneValido('11987654321')).toBe(true);
    expect(telefoneValido('(11) 98765-4321')).toBe(true);
  });

  it('aceita fixo de 10 dígitos', () => {
    expect(telefoneValido('1133334444')).toBe(true);
  });

  it('rejeita celular de 11 dígitos sem o 9', () => {
    expect(telefoneValido('11887654321')).toBe(false);
  });

  it('rejeita DDD inválido e tamanho errado', () => {
    expect(telefoneValido('01987654321')).toBe(false);
    expect(telefoneValido('119876543')).toBe(false);
    expect(telefoneValido('119876543211')).toBe(false);
  });
});

describe('tipoChavePix', () => {
  it('detecta cada tipo', () => {
    expect(tipoChavePix(CPF_VALIDO)).toBe(TipoChavePix.CPF);
    expect(tipoChavePix('111.444.777-35')).toBe(TipoChavePix.CPF);
    expect(tipoChavePix(CNPJ_VALIDO)).toBe(TipoChavePix.CNPJ);
    expect(tipoChavePix('artista@dissona.com.br')).toBe(TipoChavePix.EMAIL);
    expect(tipoChavePix('+5511987654321')).toBe(TipoChavePix.TELEFONE);
    expect(tipoChavePix('11987654321')).toBe(TipoChavePix.TELEFONE);
    expect(tipoChavePix('123e4567-e89b-12d3-a456-426614174000')).toBe(TipoChavePix.ALEATORIA);
  });

  it('rejeita chave inválida', () => {
    for (const chave of ['', '   ', 'nao-e-chave', '11144477734', 'sem@arroba', '123']) {
      expect(tipoChavePix(chave)).toBeNull();
      expect(chavePixValida(chave)).toBe(false);
    }
  });
});

describe('normalizarChavePix', () => {
  it('normaliza para o formato do provedor', () => {
    expect(normalizarChavePix('111.444.777-35')).toBe(CPF_VALIDO);
    expect(normalizarChavePix('11.222.333/0001-81')).toBe(CNPJ_VALIDO);
    expect(normalizarChavePix('Artista@Dissona.com.BR')).toBe('artista@dissona.com.br');
    expect(normalizarChavePix('(11) 98765-4321')).toBe('+5511987654321');
    expect(normalizarChavePix('+5511987654321')).toBe('+5511987654321');
    expect(normalizarChavePix('123E4567-E89B-12D3-A456-426614174000')).toBe(
      '123e4567-e89b-12d3-a456-426614174000',
    );
  });

  it('lança para chave inválida', () => {
    expect(() => normalizarChavePix('nao-e-chave')).toThrow(ErroDominio);
  });
});
