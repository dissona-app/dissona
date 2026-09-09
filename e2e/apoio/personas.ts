/**
 * Contas de teste da suíte E2E.
 *
 * Namespace `@e2e.dissona.local`, que não é domínio roteável — nenhum e-mail
 * sai daqui por acidente. O prefixo `e2e_` em todo texto gerado é o que
 * permite limpar por prefixo: o projeto Supabase é **compartilhado** entre
 * Preview, Production e a suíte (open-questions #25), então `db reset` está
 * fora do vocabulário e a limpeza tem de ser cirúrgica.
 *
 * A senha vem de `E2E_SENHA` e **não** tem valor padrão. Um padrão no
 * repositório seria uma credencial versionada de uma conta com papel `admin`
 * num projeto que também serve produção — exatamente o que não se faz. Sem a
 * variável, a suíte falha dizendo o que falta, em vez de tentar entrar com uma
 * senha conhecida por qualquer pessoa que leia o repositório.
 *
 * Como criar as contas: `supabase/testes/dados-e2e.sql`, que é versionado e
 * idempotente.
 */

export const PREFIXO_E2E = 'e2e_';

export const DOMINIO_E2E = 'e2e.dissona.local';

export type Persona = {
  readonly email: string;
  readonly nome: string;
};

export const PERSONA = {
  /** `membro_admin` com papel `administrador` — permissão total, inclusive `pacotes`. */
  ADMIN: { email: `e2e_admin@${DOMINIO_E2E}`, nome: 'E2E Admin' },
  /**
   * `membro_admin` com papel `suporte`: vê `gestao`, e **não** tem `pacotes`
   * nem para ler. É a persona que prova que a tela nega em vez de mostrar
   * botões que a RLS recusaria em silêncio.
   */
  ADMIN_SUPORTE: { email: `e2e_suporte@${DOMINIO_E2E}`, nome: 'E2E Suporte' },
  /** Artista com saldo — usado a partir de B1. */
  ARTISTA: { email: `e2e_artista@${DOMINIO_E2E}`, nome: 'E2E Artista' },
} as const satisfies Record<string, Persona>;

export function senhaDeTeste(): string {
  const senha = process.env['E2E_SENHA'];
  if (senha === undefined || senha.trim() === '') {
    throw new Error(
      'E2E_SENHA não está definida. Ela é a senha das contas de teste criadas por ' +
        'supabase/testes/dados-e2e.sql. Defina-a em .env.local (local) ou como secret ' +
        'do job (CI). Ver README.md → Testes end-to-end.',
    );
  }
  return senha;
}

/**
 * Nome único por execução e por worker.
 *
 * `playwright.config.ts` roda `fullyParallel: true`, e A2 e A3 criam pacotes
 * no **mesmo** banco. Sem um nome único, dois workers criariam "e2e_Pacote" ao
 * mesmo tempo e cada um veria o pacote do outro na lista — falha
 * intermitente, do tipo que se atribui a "flakiness" e se resolve com retry
 * em vez de com a causa.
 */
export function nomeUnico(rotulo: string, indiceDoWorker: number): string {
  const carimbo = Date.now().toString(36);
  return `${PREFIXO_E2E}${rotulo} ${indiceDoWorker}-${carimbo}`;
}
