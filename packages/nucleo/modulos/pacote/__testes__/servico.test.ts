import { describe, expect, it } from 'vitest';

import { deClavesInteiras } from '@dissona/nucleo/lib/claves';
import { paraCentavos } from '@dissona/nucleo/lib/dinheiro';
import { ehErroDominio } from '@dissona/nucleo/lib/erros';

import {
  base,
  contarAtivos,
  descontoDerivado,
  economia,
  paraLista,
  validarDados,
  valorComDesconto,
} from '../servico';
import type { Pacote } from '../tipos';

/**
 * A tabela de pacotes do protótipo é o caso de teste, não um exemplo
 * inventado. Os quatro pacotes de `docs/R2/extraido/Admin.html` traduzem
 * exatamente as quatro linhas que a tela 21 mostra, e é por elas que "Por
 * Clave" desce de R$ 10,00 para R$ 8,50 e o desconto sobe de 0% para 15%.
 *
 * O "Catálogo" inativo não é acaso: é o que faz a nota "Só os pacotes ativos
 * aparecem na Carteira do artista" ser demonstrável, e é exatamente o que o
 * cenário A3 pede.
 */
const VALOR_DA_CLAVE = paraCentavos('10,00');

const DO_PROTOTIPO = [
  { nome: 'Ensaio', claves: 10, valor: '100,00', porClave: '10,00', desconto: 0, ativo: true },
  { nome: 'Repertório', claves: 30, valor: '285,00', porClave: '9,50', desconto: 5, ativo: true },
  { nome: 'Turnê', claves: 60, valor: '540,00', porClave: '9,00', desconto: 10, ativo: true },
  { nome: 'Catálogo', claves: 100, valor: '850,00', porClave: '8,50', desconto: 15, ativo: false },
] as const;

function pacote(indice: number): Pacote {
  const linha = DO_PROTOTIPO[indice];
  if (linha === undefined) throw new Error(`linha ${indice} não existe`);
  return {
    id: `id-${indice}`,
    nome: linha.nome,
    quantidade: deClavesInteiras(linha.claves),
    valor: paraCentavos(linha.valor),
    descontoPercentual: linha.desconto,
    ativo: linha.ativo,
    excluidoEm: null,
    criadoEm: new Date('2026-01-01T00:00:00Z'),
    atualizadoEm: new Date('2026-01-01T00:00:00Z'),
  };
}

describe('a tabela de pacotes do protótipo', () => {
  it.each(DO_PROTOTIPO.map((linha, indice) => [linha.nome, indice] as const))(
    '%s: o preço por Clave e o desconto derivam do valor',
    (_nome, indice) => {
      const linha = DO_PROTOTIPO[indice];
      if (linha === undefined) throw new Error('linha ausente');

      const naLista = paraLista(pacote(indice), VALOR_DA_CLAVE);

      expect(naLista.precoPorClave).toBe(paraCentavos(linha.porClave));
      expect(naLista.descontoDerivado).toBe(linha.desconto);
    },
  );

  it('a economia do artista é a diferença contra a base', () => {
    // Repertório: 30 Claves × R$ 10 = R$ 300 de base, pago R$ 285.
    const naLista = paraLista(pacote(1), VALOR_DA_CLAVE);
    expect(naLista.economia).toBe(paraCentavos('15,00'));
  });

  it('só três dos quatro aparecem na Carteira do artista', () => {
    const todos = DO_PROTOTIPO.map((_, indice) => pacote(indice));
    expect(contarAtivos(todos)).toBe(3);
    expect(todos.length).toBe(4);
  });
});

describe('desconto derivado', () => {
  /**
   * O motivo de a aritmética ser inteira. Em ponto flutuante,
   * `(1 - 285/300) * 100` devolve 4.999999999999996 — e a tela mostraria "5%"
   * só porque o `toFixed` de algum lugar arredondou. Aqui o valor é 5 exato.
   */
  it('não passa por ponto flutuante: 285 sobre 300 é 5, não 4,999…', () => {
    expect(descontoDerivado(paraCentavos('285,00'), paraCentavos('300,00'))).toBe(5);
    expect((1 - 285 / 300) * 100).not.toBe(5);
  });

  it('preserva duas casas', () => {
    // 1 Clave a R$ 9,99 sobre base de R$ 10,00 → 0,1%.
    expect(descontoDerivado(paraCentavos('9,99'), paraCentavos('10,00'))).toBe(0.1);
  });

  it('zero quando não há desconto', () => {
    expect(descontoDerivado(paraCentavos('100,00'), paraCentavos('100,00'))).toBe(0);
  });
});

describe('valor a partir do desconto — o caminho inverso da tela', () => {
  it('fecha nos dois sentidos para os pacotes do protótipo', () => {
    for (const linha of DO_PROTOTIPO) {
      const valorCheio = base(deClavesInteiras(linha.claves), VALOR_DA_CLAVE);
      expect(valorComDesconto(valorCheio, linha.desconto)).toBe(paraCentavos(linha.valor));
    }
  });

  it('recusa 100% — um pacote de graça não passa o check do banco', () => {
    expect(() => valorComDesconto(paraCentavos('300,00'), 100)).toThrow();
  });
});

describe('economia', () => {
  it('nunca é negativa', () => {
    expect(economia(paraCentavos('400,00'), paraCentavos('300,00'))).toBe(0n);
  });
});

describe('validação antes de gravar', () => {
  const validos = {
    nome: 'Repertório',
    quantidade: deClavesInteiras(30),
    valor: paraCentavos('285,00'),
    ativo: true,
  };

  it('aceita os dados do protótipo', () => {
    expect(() => validarDados(validos, VALOR_DA_CLAVE)).not.toThrow();
  });

  it('recusa nome em branco', () => {
    expect(() => validarDados({ ...validos, nome: '   ' }, VALOR_DA_CLAVE)).toThrow();
  });

  it('recusa quantidade zero', () => {
    expect(() => validarDados({ ...validos, quantidade: 0n }, VALOR_DA_CLAVE)).toThrow();
  });

  /**
   * A regra que o banco **não** tem: nenhum `check` da `0007` impede um pacote
   * mais caro que comprar Clave a Clave. O protótipo capava em silêncio
   * (`if (valor > qtd * 10) valor = qtd * 10`); aqui é erro, porque um pacote
   * com "desconto" negativo é um preço errado, não um preço a corrigir sozinho.
   */
  it('recusa valor acima da base — o pacote não pode ser mais caro que a Clave solta', () => {
    let capturado: unknown;
    try {
      validarDados({ ...validos, valor: paraCentavos('300,01') }, VALOR_DA_CLAVE);
    } catch (erro) {
      capturado = erro;
    }
    expect(ehErroDominio(capturado)).toBe(true);
    if (ehErroDominio(capturado)) {
      expect(capturado.detalhes?.['campo']).toBe('valor');
      expect(capturado.detalhes?.['motivo']).toBe('acima_da_base');
    }
  });

  it('aceita valor exatamente igual à base — é o pacote "Ensaio", 0% de desconto', () => {
    expect(() =>
      validarDados({ ...validos, valor: paraCentavos('300,00') }, VALOR_DA_CLAVE),
    ).not.toThrow();
  });
});

describe('o valor da Clave é dado, não constante', () => {
  /**
   * Se `configuracao.clave_valor_centavos` mudar, a base muda com ele e a copy
   * "Base de 1 Clave por R$ 10" da tela passa a mostrar o valor novo. Este
   * teste é o que impede alguém de "simplificar" o parâmetro para um literal.
   */
  it('base e desconto acompanham a configuração', () => {
    const aDoze = paraCentavos('12,00');
    expect(base(deClavesInteiras(30), aDoze)).toBe(paraCentavos('360,00'));
    expect(descontoDerivado(paraCentavos('285,00'), base(deClavesInteiras(30), aDoze))).toBe(20.83);
  });
});
