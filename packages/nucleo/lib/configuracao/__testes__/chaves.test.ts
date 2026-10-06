import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CHAVES_PENDENTES, ESQUEMAS_CONFIGURACAO, TODAS_AS_CHAVES } from '../chaves';

/**
 * Deriva entre o registro Zod e as chaves que as migrations deixam no banco.
 *
 * O registro aqui e o seed no banco descrevem o mesmo conjunto de chaves, e
 * nada os mantém sincronizados automaticamente. Uma chave acrescentada só no
 * registro faz `lerConfiguracao` estourar em produção; acrescentada só no seed,
 * fica ilegível pelo código. Este teste lê o `.sql` versionado — que é a fonte
 * (architecture.md §2.2) — e compara os dois conjuntos, sem precisar de rede.
 */

const MIGRATIONS = join(process.cwd(), 'supabase', 'migrations');

/** As chaves de cada tupla de um `insert into configuracao ... values`. */
function chavesInseridas(sql: string): readonly string[] {
  const inicio = sql.indexOf('insert into configuracao');
  if (inicio === -1) return [];

  // Até o fim do statement — `)` seguido de `;` no fim da linha. Sem esse
  // recorte, uma linha qualquer do resto do arquivo que começasse com `  ('`
  // viraria chave.
  const resto = sql.slice(inicio);
  const fim = resto.search(/\);\s*$/m);
  const statement = fim === -1 ? resto : resto.slice(0, fim);

  // As chaves são o primeiro literal de cada tupla do `values`. O grupo 1
  // sempre casa quando a regex casa, mas `noUncheckedIndexedAccess` não sabe
  // disso — daí o filtro, em vez de um `!`.
  return [...statement.matchAll(/^ {2}\('([^']+)',/gm)]
    .map((casado) => casado[1])
    .filter((chave): chave is string => chave !== undefined);
}

/** As chaves de um `delete from configuracao where chave in (...)`. */
function chavesRemovidas(sql: string): readonly string[] {
  const casado = /delete from configuracao\s+where chave in \(([^)]*)\)/.exec(sql);
  if (casado?.[1] === undefined) return [];
  return [...casado[1].matchAll(/'([^']+)'/g)]
    .map((c) => c[1])
    .filter((chave): chave is string => chave !== undefined);
}

/**
 * O conjunto de chaves **depois de todas as migrations**, e não só do seed.
 *
 * A `0009b` tira `penalidade_atraso_pontos` e `piso_minimo_atraso_percentual` e
 * devolve `teto_atraso_percentual`. Comparar o registro Zod só com a `0004`
 * faria este teste acusar deriva exatamente quando o registro está certo. O
 * prefixo de timestamp do nome é a ordem de aplicação, então a ordem
 * lexicográfica dos arquivos é a ordem do banco.
 */
function lerChavesDaConfiguracao(): readonly string[] {
  const arquivos = readdirSync(MIGRATIONS)
    .filter((nome) => nome.endsWith('.sql'))
    .sort();

  if (!arquivos.some((nome) => nome.includes('_0004_configuracao'))) {
    throw new Error('migration 0004_configuracao não encontrada em supabase/migrations/');
  }

  const chaves: string[] = [];
  for (const arquivo of arquivos) {
    const sql = readFileSync(join(MIGRATIONS, arquivo), 'utf8');
    for (const removida of chavesRemovidas(sql)) {
      const indice = chaves.indexOf(removida);
      if (indice !== -1) chaves.splice(indice, 1);
    }
    chaves.push(...chavesInseridas(sql));
  }
  return chaves;
}

describe('registro de chaves de configuração', () => {
  const doSeed = lerChavesDaConfiguracao();

  it('as migrations e o registro Zod cobrem exatamente as mesmas chaves', () => {
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
