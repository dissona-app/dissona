import { expect, test } from '@playwright/test';

import { apagarContaEfemera, criarContaEfemera } from '../apoio/contas';
import type { ContaEfemera } from '../apoio/contas';
import { entrarComCredenciais } from '../apoio/sessao';
import { CURADOR_CLASSIFICACAO } from '../apoio/textos';
import { percorrerWizard } from '../apoio/wizard-curador';

/**
 * E4 · Classificação automática e as telas finais — módulo 12, RF-015 a RF-017
 *
 * **Passos**
 * 1. Percorra o cadastro inteiro sem comprovar credencial.
 * 2. Percorra de novo, comprovando o suficiente para Prata.
 *
 * **Resultado esperado**
 * - Abaixo do limiar, sai Bronze, e o acesso é liberado na hora.
 * - No limiar, sai candidato a Prata, e o cadastro fica em análise.
 * - A classificação lista as credenciais reconhecidas e diz que Ouro não é
 *   atribuído no cadastro.
 *
 * ## Contas descartáveis, e é a única forma
 *
 * Concluir o cadastro é irreversível: `concluir_cadastro_curador` grava a
 * classe e carimba `cadastro_concluido_em`. As personas de wizard existem em
 * rascunho justamente para os cenários de navegação; gastá-las aqui as
 * destruiria. Cada teste cria a sua conta, percorre os oito passos e a apaga.
 *
 * ## O limiar não aparece no código deste arquivo
 *
 * `configuracao.classe.prata_min_credenciais` é threshold de negócio. O teste
 * lê o número que a **tela** declara e usa esse mesmo número no percurso — é
 * assim que ele continua certo no dia em que o cliente mudar o limiar.
 */

const descartaveis: ContaEfemera[] = [];

async function curadorNovo(indiceDoWorker: number, rotulo: string): Promise<ContaEfemera> {
  const conta = await criarContaEfemera({
    rotulo,
    indiceDoWorker,
    papeis: ['curador'],
    onboardingVisto: true,
  });
  descartaveis.push(conta);
  return conta;
}

/** O mínimo para Prata, lido da própria tela do passo 6. */
async function limiarDePrata(texto: string): Promise<number> {
  const casado = /(\d+) de (\d+) necessárias/.exec(texto);
  if (casado === null) throw new Error(`não achei o limiar em "${texto}"`);
  return Number(casado[2]);
}

test.afterAll(async () => {
  await Promise.all(descartaveis.map(apagarContaEfemera));
});

test.describe('E4 · Classificação automática', () => {
  test(
    'sem credencial comprovada, o cadastro conclui como Bronze',
    { tag: ['@RF-015', '@RF-016'] },
    async ({ page }, info) => {
      test.setTimeout(120_000);

      const conta = await curadorNovo(info.workerIndex, 'bronze');
      await entrarComCredenciais(page, conta.email);

      await percorrerWizard(page, { credenciais: 0 });

      // Pelo heading: o selo e o título repetem a palavra, e o que a tela 12.4
      // declara é o título.
      await expect(
        page.getByRole('heading', { name: CURADOR_CLASSIFICACAO.tituloBronze, exact: true }),
      ).toBeVisible();
      await expect(page.getByText(CURADOR_CLASSIFICACAO.subBronze, { exact: true })).toBeVisible();

      // Ouro não sai do cadastro — é por convite ou desempenho. A frase existe
      // para a pessoa não procurar por um caminho que não há.
      await expect(page.getByText(CURADOR_CLASSIFICACAO.notaOuro)).toBeVisible();

      // RF-016: Bronze é liberado **na hora**.
      // É `BotaoLink`: navega para a tela final da classe, e por isso é link.
      await page.getByRole('link', { name: CURADOR_CLASSIFICACAO.continuar }).click();
      await page.waitForURL(/\/curador\/cadastro\/bronze/);

      // O selo é o que declara a liberação. O curso é oferta opcional e vive
      // na mesma tela; afirmar o selo basta para o requisito, e não amarra o
      // teste ao conteúdo do curso, que é material editorial.
      await expect(page.getByText(CURADOR_CLASSIFICACAO.seloBronze)).toBeVisible();

      // "Liberado na hora" se prova entrando: o painel do curador abre.
      await page.goto('/curador/fila');
      await expect(page, 'Bronze aprovado entra no painel sem passar por análise').toHaveURL(
        /\/curador\/fila/,
      );
    },
  );

  test(
    'no limiar, o cadastro conclui como candidato a Prata em análise',
    { tag: ['@RF-015', '@RF-017'] },
    async ({ page }, info) => {
      test.setTimeout(120_000);

      const conta = await curadorNovo(info.workerIndex, 'prata');
      await entrarComCredenciais(page, conta.email);

      // Quantas credenciais são precisas? A tela diz, e é dela que o percurso
      // tira o número — nunca de um literal aqui.
      await page.goto('/curador/cadastro/6');
      const contagem = await page.getByText(/\d+ de \d+ necessárias/).innerText();
      const minimo = await limiarDePrata(contagem);

      await percorrerWizard(page, { credenciais: minimo });

      await expect(
        page.getByRole('heading', { name: CURADOR_CLASSIFICACAO.tituloPrata, exact: true }),
      ).toBeVisible();
      await expect(page.getByText(CURADOR_CLASSIFICACAO.painelCredenciais)).toBeVisible();

      // RF-017: candidato a Prata fica **fora** do painel, na tela de espera.
      // É `BotaoLink`: navega para a tela final da classe, e por isso é link.
      await page.getByRole('link', { name: CURADOR_CLASSIFICACAO.continuar }).click();
      await page.waitForURL(/\/curador\/cadastro\/analise/);

      await expect(page.getByText(CURADOR_CLASSIFICACAO.seloAnalise).first()).toBeVisible();

      // E a guarda o devolve à análise se ele tentar o painel.
      await page.goto('/curador/fila');
      await expect(page, 'candidato a Prata não entra no painel até a equipe aprovar').toHaveURL(
        /\/curador\/cadastro\/analise/,
      );
    },
  );
});
