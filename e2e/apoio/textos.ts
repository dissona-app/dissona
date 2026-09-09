/**
 * Copy do protótipo, para os seletores por *role + name* da suíte E2E.
 *
 * Reexporta `src/textos/prototipo.ts` sem alterar nada. A indireção existe
 * para que a suíte importe por um caminho estável e curto, e para que fique
 * explícito de qual lado está a fonte: a aplicação é a dona da copy; o teste
 * afirma sobre ela.
 *
 * Se um `expect(page.getByRole(...))` deste arquivo passa a falhar, a pergunta
 * certa é "a tela mudou de propósito?" — e não "qual string atualizar aqui",
 * porque não há string nenhuma aqui para atualizar.
 */
export * from '../../src/textos/prototipo';
