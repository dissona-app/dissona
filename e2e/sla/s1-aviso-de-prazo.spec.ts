import { expect, test } from '@playwright/test';

import {
  envioDaFaixa,
  notificacoesDe,
  perfilPorEmail,
  recuarPrazos,
  rodarAvisoDePrazo,
} from '../apoio/banco';
import { PERSONA } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';

/**
 * S1 · Aviso de prazo — RF-069
 *
 * **Não** é cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md):
 * o guia cobre o que uma pessoa faz na tela, e este requisito é um job de
 * `pg_cron`. A seção 10 inteira de `docs/requirements.md` estava sem e2e.
 *
 * ## Por que um diretório próprio, e a letra D
 *
 * O cenário cruza os dois ambientes — o prazo é do curador, a Clave é do
 * artista — e não tem ator único. Forçá-lo em `b*` ou `c*` mentiria sobre
 * quem age. `e2e/sla/` deixa isso explícito.
 *
 * ## Como o tempo é encenado
 *
 * Ninguém espera 72 horas. `recuarPrazos` adianta o relógio **de um envio**,
 * pelo id, e `rodarAvisoDePrazo` chama a mesma RPC que o `pg_cron` chama de
 * hora em hora. As duas passam por `e2e/apoio/banco.ts`, que recusa qualquer
 * envio cuja faixa não tenha o prefixo `e2e_` — o banco também serve produção.
 *
 * ## ⚠️ A prova é de banco, e isso é uma lacuna de produto, não de teste
 *
 * Não existe central de notificações até a R5 (módulos 10 e 18). O aviso é
 * gravado em `notificacao` e **nenhuma tela o mostra**, então não há asserção
 * de interface a fazer. A matriz registra isto como parcial. Quando a R5
 * chegar, este arquivo ganha a asserção que falta em vez de ser reescrito.
 */

const FAIXA = 'e2e_Faixa do aviso';

// Os dois testes mexem no mesmo envio: o primeiro carimba `avisado_prazo_em`, e
// o segundo depende justamente desse carimbo existir.
test.describe.configure({ mode: 'serial' });

test.describe('S1 · Aviso de prazo', { tag: ['@RF-069'] }, () => {
  test('o curador é avisado quando o prazo se aproxima', async () => {
    const envio = await envioDaFaixa(FAIXA);
    expect(envio, `rode supabase/testes/dados-e2e.sql — "${FAIXA}" sem envio ativo`).not.toBeNull();

    const perfilDoCurador = await perfilPorEmail(PERSONA.CURADOR_SLA.email);
    expect(perfilDoCurador).not.toBeNull();

    // O carimbo tem de ser tomado **antes** de qualquer escrita: `notificacao`
    // é append-only e a persona é reusada entre execuções, então sem a janela o
    // teste contaria o aviso de ontem e passaria sem provar nada.
    const desde = new Date();

    // Dentro da janela de 12h que `avisar_prazo_72h` usa por padrão, e com o
    // aviso zerado — é a condição que o job procura.
    await recuarPrazos(envio?.id ?? '', { prazo: 6, limparAviso: true });

    const tratados = await rodarAvisoDePrazo();
    expect(tratados, 'o job precisa ter tratado ao menos este envio').toBeGreaterThanOrEqual(1);

    const avisos = await notificacoesDe(perfilDoCurador ?? '', 'prazo_72h_proximo', desde);
    const doEnvio = avisos.filter(
      (aviso) => (aviso.contexto as { envio_id?: string })?.envio_id === envio?.id,
    );

    expect(doEnvio, 'o curador precisa receber o aviso do prazo deste envio').toHaveLength(1);
  });

  /**
   * `envio.avisado_prazo_em` existe exatamente para isto.
   *
   * O job roda de hora em hora, e a janela é de 12 horas: sem a coluna, o
   * curador receberia doze avisos do mesmo prazo. O teste roda o job de novo
   * e afirma que a contagem **não** muda — é a prova de que a idempotência é
   * do job, e não sorte de agendamento.
   */
  test('rodar o job de novo não avisa duas vezes', async () => {
    const envio = await envioDaFaixa(FAIXA);
    const perfilDoCurador = await perfilPorEmail(PERSONA.CURADOR_SLA.email);

    const antes = (
      await notificacoesDe(perfilDoCurador ?? '', 'prazo_72h_proximo', new Date(0))
    ).filter((aviso) => (aviso.contexto as { envio_id?: string })?.envio_id === envio?.id).length;

    expect(antes, 'o teste anterior precisa ter deixado um aviso').toBeGreaterThanOrEqual(1);

    await rodarAvisoDePrazo();

    const depois = (
      await notificacoesDe(perfilDoCurador ?? '', 'prazo_72h_proximo', new Date(0))
    ).filter((aviso) => (aviso.contexto as { envio_id?: string })?.envio_id === envio?.id).length;

    expect(depois, 'o mesmo prazo não pode gerar um segundo aviso').toBe(antes);
  });

  /**
   * A metade visível do RF-069: a faixa com prazo curto continua na fila, e
   * aparece com o prazo que o job enxergou.
   *
   * A ordenação por urgência é de C1 — aqui basta que o envio avisado não tenha
   * sumido nem mudado de estado, porque avisar **não** é agir sobre o envio.
   */
  test('a faixa avisada continua na fila do curador', async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_SLA);
    await page.goto('/curador/fila');

    await expect(page.getByRole('row').filter({ hasText: FAIXA })).toHaveCount(1);

    const envio = await envioDaFaixa(FAIXA);
    expect(envio?.situacao, 'avisar não muda o estado do envio').toBe('recebeu');
  });
});
