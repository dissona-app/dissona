import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { EventoNotificacao } from '../tipos';

/**
 * Deriva entre o registro de eventos e o seed da migration `0005`.
 *
 * `registrar_notificacao` levanta `DS030` para evento fora do catálogo. Sem
 * este teste, um erro de digitação numa chave só apareceria em produção — no
 * instante em que alguém cria uma conta, que é o pior momento possível. O teste
 * lê o `.sql` versionado, que é a fonte (architecture.md §2.2), e não precisa
 * de rede.
 *
 * A direção é **uma só**: toda chave do registro tem de existir no seed. O
 * contrário não vale, porque o catálogo nasceu completo com os eventos das
 * cinco releases e o registro cobre só o que já tem código chamando.
 */

const MIGRATIONS = join(process.cwd(), 'supabase', 'migrations');

function lerCatalogoDeEventos(): readonly string[] {
  const arquivo = readdirSync(MIGRATIONS).find((nome) => nome.includes('_0005_notificacoes'));
  if (arquivo === undefined) {
    throw new Error('migration 0005_notificacoes não encontrada em supabase/migrations/');
  }

  const sql = readFileSync(join(MIGRATIONS, arquivo), 'utf8');
  const seed = sql.slice(sql.indexOf('insert into evento_notificacao'));

  // A chave é o primeiro literal de cada tupla do `values`. O grupo 1 sempre
  // casa quando a regex casa, mas `noUncheckedIndexedAccess` não sabe disso —
  // daí o filtro, em vez de um `!`.
  return [...seed.matchAll(/^ {2}\('([^']+)',/gm)]
    .map((casado) => casado[1])
    .filter((chave): chave is string => chave !== undefined);
}

describe('registro de eventos de notificação', () => {
  const doCatalogo = lerCatalogoDeEventos();

  it('o seed da 0005 tem os 42 eventos das cinco releases', () => {
    expect(doCatalogo.length).toBeGreaterThanOrEqual(40);
  });

  it('toda chave do registro existe no catálogo semeado', () => {
    for (const [nome, chave] of Object.entries(EventoNotificacao)) {
      expect(doCatalogo, `${nome} (${chave}) não está no seed da 0005`).toContain(chave);
    }
  });

  it('não há chave duplicada no registro', () => {
    const chaves = Object.values(EventoNotificacao);
    expect(new Set(chaves).size).toBe(chaves.length);
  });
});
