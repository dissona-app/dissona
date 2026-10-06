/**
 * Máscaras e validações de formato: CPF, CNPJ, telefone e chave Pix.
 *
 * Formato apenas. Nada aqui confirma que o documento existe ou que a chave
 * está ativa no banco — isso é a validação do Asaas, na R2.
 */

import { CodigoErro, falhar } from '@dissona/nucleo/lib/erros';

function apenasDigitos(valor: string): string {
  return valor.replace(/[^0-9]/g, '');
}

// ---------------------------------------------------------------- CPF

export function mascararCpf(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  const partes = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter((p) => p !== '');
  const sufixo = d.slice(9, 11);
  const base = partes.join('.');
  return sufixo === '' ? base : `${base}-${sufixo}`;
}

/** Valida os dois dígitos verificadores. Rejeita sequências repetidas. */
export function cpfValido(valor: string): boolean {
  const d = apenasDigitos(valor);
  if (d.length !== 11) return false;
  if (new Set(d).size === 1) return false;

  const digito = (ate: number): number => {
    let soma = 0;
    for (let i = 0; i < ate; i += 1) {
      soma += Number(d[i]) * (ate + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

// ---------------------------------------------------------------- CNPJ

const PESOS_CNPJ_PRIMEIRO = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;
const PESOS_CNPJ_SEGUNDO = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;

export function cnpjValido(valor: string): boolean {
  const d = apenasDigitos(valor);
  if (d.length !== 14) return false;
  if (new Set(d).size === 1) return false;

  const digito = (ate: number): number => {
    const pesos: readonly number[] = ate === 12 ? PESOS_CNPJ_PRIMEIRO : PESOS_CNPJ_SEGUNDO;
    let soma = 0;
    for (let i = 0; i < ate; i += 1) {
      soma += Number(d[i]) * (pesos[i] ?? 0);
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return digito(12) === Number(d[12]) && digito(13) === Number(d[13]);
}

// ------------------------------------------------------------ Telefone

/** `"11987654321"` → `"(11) 98765-4321"`. Aceita fixo de 10 dígitos. */
export function mascararTelefone(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  const corte = resto.length > 8 ? 5 : 4;
  if (resto.length <= corte) return `(${ddd}) ${resto}`;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

export function telefoneValido(valor: string): boolean {
  const d = apenasDigitos(valor);
  if (d.length !== 10 && d.length !== 11) return false;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  // Celular tem 11 dígitos e o nono começa em 9.
  return d.length === 10 || d[2] === '9';
}

// ----------------------------------------------------------- Chave Pix

export const TipoChavePix = {
  CPF: 'cpf',
  CNPJ: 'cnpj',
  EMAIL: 'email',
  TELEFONE: 'telefone',
  ALEATORIA: 'aleatoria',
} as const;

export type TipoChavePix = (typeof TipoChavePix)[keyof typeof TipoChavePix];

const EMAIL = /^[^@\s]+@[^@\s]+[.][^@\s]{2,}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Detecta o tipo da chave Pix, ou `null` quando não é uma chave válida.
 * Usado no cadastro de dados de recebimento do curador (módulo 17.2).
 */
export function tipoChavePix(chave: string): TipoChavePix | null {
  const valor = chave.trim();
  if (valor === '') return null;

  if (UUID.test(valor)) return TipoChavePix.ALEATORIA;
  if (EMAIL.test(valor)) return TipoChavePix.EMAIL;

  const d = apenasDigitos(valor);

  // Telefone no padrão Pix vem com +55 e 13 dígitos.
  if (valor.startsWith('+55') && d.length === 13 && telefoneValido(d.slice(2))) {
    return TipoChavePix.TELEFONE;
  }
  if (d.length === 11 && cpfValido(d)) return TipoChavePix.CPF;
  if (d.length === 14 && cnpjValido(d)) return TipoChavePix.CNPJ;
  if ((d.length === 10 || d.length === 11) && telefoneValido(d)) return TipoChavePix.TELEFONE;

  return null;
}

export function chavePixValida(chave: string): boolean {
  return tipoChavePix(chave) !== null;
}

/** Normaliza para o formato que o provedor de pagamento espera. */
export function normalizarChavePix(chave: string): string {
  const tipo = tipoChavePix(chave);
  if (tipo === null) falhar(CodigoErro.ENTRADA_INVALIDA, { campo: 'chave_pix' });
  const valor = chave.trim();
  switch (tipo) {
    case TipoChavePix.CPF:
    case TipoChavePix.CNPJ:
      return apenasDigitos(valor);
    case TipoChavePix.TELEFONE: {
      const d = apenasDigitos(valor);
      return d.startsWith('55') && d.length === 13 ? `+${d}` : `+55${d}`;
    }
    case TipoChavePix.EMAIL:
      return valor.toLowerCase();
    case TipoChavePix.ALEATORIA:
      return valor.toLowerCase();
  }
}
