import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Contraste dos pares que a auditoria do Design System §4.2 reprovou.
 *
 * As duas exceções da [open-questions #26] foram fechadas em 2026-09-22, e este
 * teste existe para que não voltem. Ele **lê os tokens do CSS** — a mesma fonte
 * que a tela usa —, então trocar um hexadecimal em `tokens.css` e quebrar o
 * contraste falha aqui, e não no beta.
 *
 * Os outros cinco pares daquela auditoria (botão em loading, botão desabilitado,
 * dot de sucesso usado como texto, "senha média" e numeral de stepper) foram
 * corrigidos na R0 e estão nos tokens semânticos; entram aqui pelo mesmo
 * motivo — o que não é medido volta.
 */

// Relativo a este arquivo, e não ao `cwd`: o Vitest roda da raiz do monorepo.
const TOKENS = readFileSync(join(import.meta.dirname, '..', 'tokens.css'), 'utf8');

/** O valor de um token, lido do CSS. Falha alto: token que sumiu é erro. */
function token(nome: string): string {
  const casado = new RegExp(`--${nome}:\\s*(#[0-9a-fA-F]{6})`).exec(TOKENS);
  if (casado?.[1] === undefined) throw new Error(`token --${nome} não encontrado em tokens.css`);
  return casado[1];
}

/** Luminância relativa da WCAG 2.x. */
function luminancia(hex: string): number {
  const canais = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canais.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contraste(a: string, b: string): number {
  const [maior, menor] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return ((maior ?? 0) + 0.05) / ((menor ?? 0) + 0.05);
}

const BRANCO = '#ffffff';

describe('contraste dos tokens', () => {
  /**
   * O rótulo do botão primário tem 16px/600 — **não** é "texto grande" pela
   * WCAG (que pede 18,66px em 700, ou 24px), então o piso é 4,5:1 e não 3:1.
   * Era o par que reprovava em 3,78:1, no alvo mais clicado do produto.
   */
  it('o botão primário passa AA com texto branco, nos três estados', () => {
    for (const [estado, nome] of [
      ['repouso', 'dsn-orange-600'],
      ['hover', 'dsn-orange-700'],
      ['active', 'dsn-orange-800'],
    ] as const) {
      expect(contraste(BRANCO, token(nome)), `${estado} (--${nome})`).toBeGreaterThanOrEqual(4.5);
    }
  });

  /**
   * A cor da marca continua existindo, e continua **reprovando** com texto
   * branco. O teste fixa isso de propósito: se um dia alguém a usar de fundo
   * para texto branco de novo, que seja sabendo.
   */
  it('a cor da marca segue abaixo de AA — e por isso não é fundo de texto branco', () => {
    expect(contraste(BRANCO, token('dsn-orange-500'))).toBeLessThan(4.5);
  });

  /**
   * WCAG 1.4.11: o contorno que identifica um componente interativo precisa de
   * 3:1. O campo é branco sobre fundo quase branco, então a borda é a única
   * afordância — não há outro elemento visual que sustente a identificação.
   */
  it('a borda de campo em repouso passa 1.4.11 sobre branco', () => {
    expect(contraste(token('dsn-border-campo'), BRANCO)).toBeGreaterThanOrEqual(3);
  });

  /**
   * `--dsn-border` **não** precisa passar, e não passa: ele é divisor de tabela
   * e borda de cartão, que não identificam componente interativo. Fixado para
   * ninguém "consertá-lo" junto e pesar a tela inteira sem necessidade.
   */
  it('a borda decorativa continua clara, e isso é intencional', () => {
    expect(contraste(token('dsn-border'), BRANCO)).toBeLessThan(3);
  });

  it('texto secundário e de apoio passam AA sobre branco', () => {
    for (const nome of ['dsn-ink', 'dsn-ink-700', 'dsn-ink-500']) {
      expect(contraste(token(nome), BRANCO), `--${nome}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
