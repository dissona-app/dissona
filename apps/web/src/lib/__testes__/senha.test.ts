import { describe, expect, it } from 'vitest';

import {
  forcaDaSenha,
  SENHA_MIN_CARACTERES,
  senhaAtendePolitica,
  senhaTemNumero,
  senhaTemTamanho,
} from '../senha';

describe('política de senha', () => {
  it('exige 8 caracteres e ao menos um número', () => {
    expect(senhaAtendePolitica('senha123')).toBe(true);
    expect(senhaAtendePolitica('senha12')).toBe(false); // 7 caracteres
    expect(senhaAtendePolitica('senhasenha')).toBe(false); // sem número
    expect(senhaAtendePolitica('')).toBe(false);
  });

  it('os dois requisitos são independentes — é o que a tela mostra com dot', () => {
    expect(senhaTemTamanho('12345678')).toBe(true);
    expect(senhaTemNumero('abcdefgh')).toBe(false);
    expect(senhaTemNumero('abcdefg1')).toBe(true);
  });

  it('conta caracteres, e não bytes', () => {
    // Oito caracteres com acento e um número. Um `Buffer.byteLength` daria 10 e
    // a senha passaria por outro motivo; um limite em bytes recusaria uma senha
    // de oito letras só porque ela tem cedilha.
    expect('coração1'.length).toBe(SENHA_MIN_CARACTERES);
    expect(senhaAtendePolitica('coração1')).toBe(true);
  });

  it('espaço conta como caractere', () => {
    expect(senhaAtendePolitica('a b c d1')).toBe(true);
  });
});

describe('medidor de força', () => {
  it('só a senha vazia é nível 0 — o estado "Mínimo 8 com número"', () => {
    expect(forcaDaSenha('')).toBe(0);
    expect(forcaDaSenha('a')).toBe(1);
  });

  it('sobe com tamanho, número e variedade', () => {
    expect(forcaDaSenha('abcdefgh')).toBe(1); // só tamanho
    expect(forcaDaSenha('abcdefg1')).toBe(2); // tamanho + número
    expect(forcaDaSenha('Abcdefg1')).toBe(3); // + maiúscula e minúscula
    expect(forcaDaSenha('abcdefg1!')).toBe(3); // + símbolo
  });

  it('não passa de 3', () => {
    expect(forcaDaSenha('Abcdefgh1!@#$%')).toBe(3);
  });

  it('força e política são coisas diferentes', () => {
    // Nível 1 e reprovada: é a senha curta.
    expect(forcaDaSenha('ab1')).toBe(1);
    expect(senhaAtendePolitica('ab1')).toBe(false);

    // Nível 2 e aprovada: "Senha média" já entra. O medidor informa, não decide.
    expect(forcaDaSenha('abcdefg1')).toBe(2);
    expect(senhaAtendePolitica('abcdefg1')).toBe(true);
  });
});
