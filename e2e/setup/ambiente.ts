import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Carrega `.env.local` no processo do Playwright.
 *
 * O Next carrega `.env*.local` sozinho, mas só para o **servidor** que ele
 * sobe. O processo do Playwright é outro, e é ele que precisa de `E2E_SENHA`
 * para preencher o formulário de login. Sem isto, `pnpm e2e` falha com "senha
 * não definida" mesmo com a variável no arquivo — e a pessoa vai procurar o
 * erro no lugar errado.
 *
 * Feito à mão em vez de com `dotenv`: são vinte linhas, e uma dependência de
 * runtime só para a suíte de testes é uma dependência a mais para auditar.
 *
 * **Nunca sobrescreve** o que já está no ambiente: no CI a variável vem do
 * secret do job, e um `.env.local` esquecido na máquina não deve vencer dele.
 */
export function carregarEnvLocal(raiz: string = process.cwd()): void {
  const caminho = join(raiz, '.env.local');
  if (!existsSync(caminho)) return;

  for (const linha of readFileSync(caminho, 'utf8').split(/\r?\n/)) {
    const limpa = linha.trim();
    if (limpa === '' || limpa.startsWith('#')) continue;

    const separador = limpa.indexOf('=');
    if (separador <= 0) continue;

    const chave = limpa.slice(0, separador).trim();
    if (process.env[chave] !== undefined) continue;

    let valor = limpa.slice(separador + 1).trim();
    // Aspas em volta do valor são delimitador, não conteúdo.
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    // Valor com `\$` (a chave do Asaas, `\$aact_…`) fica **escapado** aqui. O
    // servidor que o Playwright sobe herda este ambiente, e o Next expande `$`
    // até em variável herdada — sem a barra, a chave chegaria vazia. Quem
    // precisa do valor literal neste processo tira a barra na hora de usar.
    process.env[chave] = valor;
  }
}
