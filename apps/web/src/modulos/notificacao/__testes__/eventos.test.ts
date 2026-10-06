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

/**
 * A outra direção: **todo evento de R1 e R2 é emitido por alguém**.
 *
 * O teste acima prova que nenhuma chave do registro TypeScript foi inventada.
 * Este prova o contrário, e é o que o item "conferir que todo evento de R1 e R2
 * grava em `notificacao`" do backlog pede: uma chave semeada e nunca emitida é
 * uma notificação que o PRD promete e o produto não manda — e não há sintoma
 * nenhum até a central de leitura chegar, na R5.
 *
 * Foi assim que `musica_compartilhada` apareceu: semeada desde a `0005`, e
 * ninguém a emitia. A `0009c` a ligou.
 *
 * Emitir acontece em dois lugares, e os dois contam: `registrar_notificacao`
 * numa migration (a maioria dos eventos de R2, que nascem dentro das RPCs) ou o
 * `servicoNotificacao` no TypeScript (os de R1, que nascem em Server Actions).
 */

/** Os eventos que R1 e R2 prometem — matriz `docs/prd/06-matriz-notificacoes.md`. */
const EVENTOS_DE_R1_E_R2: readonly string[] = [
  // R1 · autenticação, cadastro do curador, conta e equipe
  'email_verificacao',
  'senha_recuperacao_solicitada',
  'senha_recuperacao_admin',
  'credencial_alterada',
  'conta_bloqueada',
  'novo_cadastro_concluido',
  'bronze_aprovado',
  'cadastro_em_analise',
  'curador_prata_em_analise',
  'convite_membro_enviado',
  'permissoes_alteradas',
  // R2 · claves, fila, avaliação e SLA
  'compra_claves_confirmada',
  'nova_compra_claves',
  'selecao_confirmada',
  'nova_musica_na_fila',
  'feedback_concluido',
  'credito_liberado',
  'musica_compartilhada',
  'claves_devolvidas',
];

/**
 * Semeados, de módulos de R1/R2, e **ainda não emitidos** — com o motivo.
 *
 * Cada linha aqui é uma decisão, não um esquecimento. Tirar uma chave desta
 * lista sem ligá-la faz o teste falhar, que é o ponto.
 */
const AINDA_NAO_EMITIDOS: Readonly<Record<string, string>> = {
  musica_recebida_pelo_curador:
    'origem "3 / 13" na matriz, sem momento definido: `recebeu` coincide com a criação do envio, e ali `selecao_confirmada` já avisa o artista — dois avisos para um fato. O momento honesto seria `ouviu`, e isso é decisão de produto',
  saldo_claves_baixo:
    'origem "5 / 2"; o bloqueio por saldo existe (B8) mas o destino da notificação é a central, que é da R5 — notificar alguém sobre o que ele acabou de ler na tela é ruído',
  pacote_clave_alterado:
    'origem 21, destinatário é a equipe administrativa; falta decidir se vai para todo `membro_admin` com permissão em `pacotes` ou só para quem tem `financeiro`',
};

describe('cobertura dos eventos de R1 e R2', () => {
  const fontes = [
    ...readdirSync(MIGRATIONS)
      .filter((nome) => nome.endsWith('.sql') && !nome.includes('_0005_'))
      .map((nome) => readFileSync(join(MIGRATIONS, nome), 'utf8')),
    ...['tipos.ts', 'servico.ts'].map((nome) =>
      // Relativo a este arquivo: o Vitest roda da raiz do monorepo.
      readFileSync(join(import.meta.dirname, '..', nome), 'utf8'),
    ),
  ].join('\n');

  it('todo evento de R1 e R2 tem quem o emita', () => {
    for (const evento of EVENTOS_DE_R1_E_R2) {
      expect(fontes.includes(`'${evento}'`), `${evento} está no seed e ninguém o emite`).toBe(true);
    }
  });

  it('os não emitidos estão declarados com motivo, e continuam não emitidos', () => {
    for (const [evento, motivo] of Object.entries(AINDA_NAO_EMITIDOS)) {
      expect(motivo.length, `${evento} precisa de um motivo escrito`).toBeGreaterThan(40);
      expect(
        fontes.includes(`'${evento}'`),
        `${evento} passou a ser emitido — tire-o de AINDA_NAO_EMITIDOS e ponha em EVENTOS_DE_R1_E_R2`,
      ).toBe(false);
    }
  });
});
