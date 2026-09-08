import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CHAVES_PENDENTES, ESQUEMAS_CONFIGURACAO, TODAS_AS_CHAVES } from '../chaves';

/**
 * Deriva entre o registro Zod e o seed da migration `0004`.
 *
 * O registro aqui e o seed no banco descrevem o mesmo conjunto de chaves, e
 * nada os mantém sincronizados automaticamente. Uma chave acrescentada só no
 * registro faz `lerConfiguracao` estourar em produção; acrescentada só no seed,
 * fica ilegível pelo código. Este teste lê o `.sql` versionado — que é a fonte
 * (architecture.md §2.2) — e compara os dois conjuntos, sem precisar de rede.
 */

const MIGRATIONS = join(process.cwd(), 'supabase', 'migrations');

function lerSeedDaConfiguracao(): readonly string[] {
  const arquivo = readdirSync(MIGRATIONS).find((nome) => nome.includes('_0004_configuracao'));
  if (arquivo === undefined) {
    throw new Error('migration 0004_configuracao não encontrada em supabase/migrations/');
  }

  const sql = readFileSync(join(MIGRATIONS, arquivo), 'utf8');
  const seed = sql.slice(sql.indexOf('insert into configuracao'));

  // As chaves são o primeiro literal de cada tupla do `values`.
  return [...seed.matchAll(/^ {2}\('([^']+)',/gm)].map((casado) => casado[1]);
}

describe('registro de chaves de configuração', () => {
  const doSeed = lerSeedDaConfiguracao();

  it('o seed da 0004 e o registro Zod cobrem exatamente as mesmas chaves', () => {
    expect([...doSeed].sort()).toEqual([...TODAS_AS_CHAVES].sort());
  });

  it('não há chave duplicada no seed', () => {
    expect(new Set(doSeed).size).toBe(doSeed.length);
  });

  it('as chaves pendentes existem no registro', () => {
    for (const chave of CHAVES_PENDENTES) {
      expect(TODAS_AS_CHAVES).toContain(chave);
    }
  });

  it('não repete valor de negócio: o registro só declara schema', () => {
    // Um schema Zod não carrega valor. Se alguém puser um `.default(...)` aqui,
    // o número de negócio volta para o código — que é exatamente o que a
    // tabela `configuracao` existe para evitar (RNF-011).
    for (const [chave, esquema] of Object.entries(ESQUEMAS_CONFIGURACAO)) {
      const resultado = esquema.safeParse(undefined);
      expect(resultado.success, `${chave} aceitou undefined — tem default?`).toBe(false);
    }
  });
});
