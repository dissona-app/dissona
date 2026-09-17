import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { PERSONA, senhaDeTeste } from './personas';
import type { Persona } from './personas';
import { ADMIN_ENTRAR, ENTRAR } from './textos';

/**
 * Login pela tela real, e não por injeção de cookie.
 *
 * Injetar a sessão seria mais rápido e pularia a única coisa que a suíte tem
 * de garantir sobre o login: que ele funciona. Como todo cenário do ambiente
 * admin começa por entrar, o caminho de autenticação é exercitado dezenas de
 * vezes de graça — e uma quebra nele aparece como "todos os A falharam", que é
 * um diagnóstico melhor que um 401 no meio de um cenário de pacotes.
 *
 * Custa ~1 s por cenário. Vale.
 */
export async function entrarComoAdmin(page: Page, persona: Persona = PERSONA.ADMIN) {
  await page.goto('/admin/entrar');

  // `exact: true` nos dois. Sem isso, `getByLabel('Senha')` casa também com o
  // botão "Mostrar senha" do próprio campo — `getByLabel` faz correspondência
  // por substring, e o modo estrito do Playwright aborta com dois elementos.
  await page.getByLabel(ADMIN_ENTRAR.rotuloEmail, { exact: true }).fill(persona.email);
  await page.getByLabel(ADMIN_ENTRAR.rotuloSenha, { exact: true }).fill(senhaDeTeste());
  await page.getByRole('button', { name: ADMIN_ENTRAR.enviar }).click();

  // Espera a navegação sair de `/admin/entrar`. Sem isto, o `goto` seguinte
  // pode disputar com o redirecionamento do login e cair de volta na tela de
  // entrada — a corrida clássica de teste de autenticação.
  //
  // A espera é pelo **destino**, não por "qualquer coisa menos o login": se o
  // login falhar, a mensagem de erro passa a ser "esperava /admin, recebi
  // /admin/entrar", que diz o que aconteceu. `not.toHaveURL` só dizia que a
  // URL não mudou, e o mesmo sintoma serviria para credencial errada, redirect
  // quebrado e servidor lento.
  await page.waitForURL(/\/admin(?!\/entrar)/);
}

/**
 * Abre a tela de pacotes já autenticado.
 *
 * Reúne os dois passos porque todo cenário A começa por eles, e porque a
 * espera pelo título é o que garante que a tela **renderizou** — e não apenas
 * que a URL mudou.
 */
export async function abrirPacotes(page: Page, persona: Persona = PERSONA.ADMIN) {
  await entrarComoAdmin(page, persona);
  await page.goto('/admin/pacotes');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Pacotes de Claves');
}

/**
 * Login pela tela de artista/curador (`/entrar`), para uma persona qualquer.
 *
 * Não espera por um destino fixo: o roteamento pós-login depende do estado da
 * conta — seleção de perfil para quem não tem papel, onboarding para quem tem o
 * tour pendente, wizard para o curador em rascunho (RF-008 e `inicioDoUsuario`).
 * O que se espera é apenas **sair** do login; para onde, é o cenário que sabe.
 */
export async function entrarComo(page: Page, persona: Persona) {
  await entrarComCredenciais(page, persona.email);
}

/**
 * O mesmo login, por e-mail solto.
 *
 * Existe para as contas descartáveis (`apoio/contas.ts`), que nascem em tempo
 * de execução e por isso não são `Persona`. A senha padrão é a mesma
 * `E2E_SENHA` — quem precisa de outra, como o cenário que troca a própria
 * senha, passa a que quer conferir.
 */
export async function entrarComCredenciais(page: Page, email: string, senha?: string) {
  await page.goto('/entrar');
  await page.getByLabel(ENTRAR.rotuloEmail, { exact: true }).fill(email);
  await page.getByLabel(ENTRAR.rotuloSenha, { exact: true }).fill(senha ?? senhaDeTeste());
  await page.getByRole('button', { name: ENTRAR.enviar, exact: true }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/entrar'));
}
