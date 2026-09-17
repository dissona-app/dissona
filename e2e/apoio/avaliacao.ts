import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { PERSONA } from './personas';
import { entrarComo } from './sessao';
import { AVALIAR, FILA } from './textos';

/**
 * Apoio dos cenários C2 a C6 — a avaliação (14).
 *
 * ## Duas armadilhas que este arquivo existe para evitar
 *
 * **1 · O `<input type="radio">` de 14.2 está sob a pintura.** Como em `Chips`,
 * a caixa é escondida por `clip-path` e o `<span>` é que aparece. `check()`
 * tenta clicar no input e o `<label>` intercepta — o mesmo tropeço já
 * registrado no plano. Daí `escolherModalidade` clicar no **texto**.
 *
 * **2 · `CampoNota` é um `<input type="range">` sem `name`.** O valor viaja num
 * campo escondido irmão, escrito pelo React. `fill()` no range dispara `input`
 * e `change`, que é o que atualiza o escondido; um `dispatchEvent` manual não
 * atualizaria.
 */

/** Os cinco de `configuracao.criterios_obrigatorios` (seed da `0004`). */
export const CRITERIOS_OBRIGATORIOS = [
  'Afinação',
  'Ritmo',
  'Melodia',
  'Personalidade',
  'Conexão',
] as const;

/**
 * Uma faixa **por cenário**, semeadas por `dados-e2e.sql`.
 *
 * A suíte roda `fullyParallel: true`, e C3 a C6 escrevem todos no mesmo
 * rascunho se compartilharem o envio: um worker salva cinco notas enquanto o
 * outro afirma que há uma só. É a mesma razão que faz A2 e A3 criarem pacotes
 * com nome único — aqui o recurso disputado é o envio, que o navegador não tem
 * como criar. Dentro de cada arquivo os testes correm em série.
 *
 * `e2e_Faixa em curadoria` continua sendo a da fila (C1 e C2), que ninguém
 * conclui.
 */
export const FAIXA_NA_FILA = 'e2e_Faixa em curadoria';
export const FAIXA_DO_C3 = 'e2e_Faixa do C3';
export const FAIXA_DO_C4 = 'e2e_Faixa do C4';
export const FAIXA_DO_C5 = 'e2e_Faixa do C5';
export const FAIXA_DO_C6 = 'e2e_Faixa do C6';

/**
 * A faixa do cenário que **conclui** — e que por isso é consumida.
 *
 * `dados-e2e.sql` cria uma nova sempre que não houver nenhuma pendente, então
 * reexecutar o seed antes da suíte repõe o cenário. Sem ela, o teste de
 * conclusão falha dizendo exatamente isso.
 */
export const FAIXA_PARA_CONCLUIR = 'e2e_Faixa para concluir';

/**
 * A faixa do cenário de atomicidade, do **curador de SLA**.
 *
 * Não é do Bronze porque o cenário devolve o envio no meio da conclusão, e
 * devolver tira faixa da fila: na conta do Bronze isso mudaria a contagem que
 * C1 afirma. Também é consumida — o envio termina em `devolvido` — e reposta
 * por `dados-e2e.sql`.
 */
export const FAIXA_DA_ATOMICIDADE = 'e2e_Faixa da atomicidade';

/**
 * Entra como o curador Bronze e abre a avaliação da faixa, pela fila.
 *
 * Passa pelo detalhe (13.1) e pelo botão "Iniciar avaliação" de propósito: é o
 * caminho real, e é ele que o cenário C2 descreve. Ir direto por URL pularia a
 * transição `recebeu → avaliando`, que é o que o botão existe para fazer.
 */
export async function abrirAvaliacao(page: Page, faixa: string): Promise<string> {
  await entrarComo(page, PERSONA.CURADOR_BRONZE);
  return abrirPelaFila(page, faixa);
}

/**
 * O mesmo caminho, **sem** passar pelo login.
 *
 * Existe porque `entrarComo` vai a `/entrar`, e a guarda de rota expulsa de lá
 * quem já tem sessão — o campo de e-mail não chega a existir. Reabrir a
 * avaliação na mesma página é exatamente o que a retomada faz.
 */
export async function abrirPelaFila(page: Page, faixa: string): Promise<string> {
  await page.goto('/curador/fila');

  const linha = page.getByRole('row').filter({ hasText: faixa });
  await expect(
    linha,
    `a fila precisa listar "${faixa}" — rode supabase/testes/dados-e2e.sql`,
  ).toHaveCount(1);
  await linha.getByRole('link').first().click();

  await page.getByRole('button', { name: FILA.iniciarAvaliacao }).click();

  // **Qualquer** etapa, e não `/notas`: o botão abre a raiz da avaliação, que
  // redireciona conforme `avaliacao.passo_atual`. Um rascunho deixado em 14.2
  // por uma execução anterior reabre em 14.2 — é a retomada funcionando, e
  // esperar por `/notas` aqui a trataria como falha.
  await page.waitForURL(/\/curador\/avaliar\/[0-9a-f-]+\/[a-z]+$/);

  const envioId = new URL(page.url()).pathname.split('/')[3] ?? '';

  // Cada cenário decide em que etapa começa, e começa sempre do mesmo lugar.
  await page.goto(`/curador/avaliar/${envioId}/notas`);
  return envioId;
}

/** Dá nota aos cinco obrigatórios, que é o mínimo que `DS002` exige. */
export async function preencherObrigatorios(page: Page, nota = '4') {
  for (const criterio of CRITERIOS_OBRIGATORIOS) {
    await page
      .getByLabel(`${criterio} · ${AVALIAR.criterioObrigatorio}`, { exact: true })
      .fill(nota);
  }
}

export async function avancar(page: Page) {
  await page
    .getByRole('button', { name: new RegExp(`${AVALIAR.avancar}|${AVALIAR.verRemuneracao}`) })
    .click();
}

/** Clica no rótulo, e não no input — ver a nota 1 do cabeçalho. */
export async function escolherModalidade(page: Page, rotulo: string) {
  await page.getByText(rotulo, { exact: true }).click();
}

/**
 * Leva a avaliação de `notas` até `remuneracao`, pelo caminho sem 14.3.
 *
 * O feedback tem de passar do mínimo do acréscimo para o cenário C6 poder
 * afirmar sobre um acréscimo **cumprido** — com ele curto, os quatro sairiam
 * com "—" e o teste não distinguiria "não cumprido" de "não calculado".
 */
export async function irAteARemuneracao(page: Page, envioId: string) {
  await preencherObrigatorios(page);
  await avancar(page);

  await page.waitForURL(`**/curador/avaliar/${envioId}/subjetiva`);
  await page.getByLabel(AVALIAR.feedback).fill('Devolutiva da suíte automatizada. '.repeat(8));
  await avancar(page);

  await page.waitForURL(`**/curador/avaliar/${envioId}/compartilhamento`);
  await escolherModalidade(page, AVALIAR.modalidades.nao_compartilhou.rotulo);
  await avancar(page);

  await page.waitForURL(`**/curador/avaliar/${envioId}/remuneracao`);
}
