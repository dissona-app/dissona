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

  /*
   * As cinco abaixo existem para a suíte de paridade visual (`e2e/prototipo/`),
   * que precisa de uma conta **por estado de tela** — a tela só existe no
   * estado que a abre, e a guarda de rota não deixa chegar nela de outro jeito.
   */

  /** Sem papel nenhum: é o único estado que abre a seleção de perfil (1.4). */
  SEM_PAPEL: { email: `e2e_sem_papel@${DOMINIO_E2E}`, nome: 'E2E Sem Papel' },
  /** Artista com o tour pendente — cai em `/onboarding` (1.5). */
  TOUR: { email: `e2e_tour@${DOMINIO_E2E}`, nome: 'E2E Tour' },
  /** Curador no passo 1 do wizard, em rascunho (12). */
  WIZARD: { email: `e2e_wizard@${DOMINIO_E2E}`, nome: 'E2E Wizard' },
  /** Curador Bronze aprovado — painel, conta e "Meu cadastro" abertos (12.5). */
  CURADOR_BRONZE: { email: `e2e_bronze@${DOMINIO_E2E}`, nome: 'E2E Bronze' },
  /** Candidato a Prata em análise: fora do painel, na tela de espera (12.5). */
  CURADOR_PRATA: { email: `e2e_prata@${DOMINIO_E2E}`, nome: 'E2E Prata' },

  /*
   * As três abaixo existem para **isolar estado**. `ARTISTA` tem saldo e
   * movimentações, e é disso que B1, B2 e B3 dependem: qualquer cenário que
   * precise do oposto (carteira nunca usada, saldo que não cobre a seleção)
   * teria de destruir o que os outros afirmam.
   */

  /**
   * Artista sem lançamento nenhum — o estado vazio da Carteira (RF-042).
   *
   * ⚠️ **Nunca compra.** Comprar com esta conta apaga o único estado que ela
   * existe para provar, e o teste de estado vazio passa a falhar de um jeito
   * que parece flakiness.
   */
  ARTISTA_NOVO: { email: `e2e_artista_novo@${DOMINIO_E2E}`, nome: 'E2E Artista Novo' },
  /** Artista com saldo abaixo do preço de um serviço — o bloqueio do RF-049. */
  ARTISTA_SEM_SALDO: { email: `e2e_sem_saldo@${DOMINIO_E2E}`, nome: 'E2E Sem Saldo' },
  /**
   * A carteira do B2, que ninguém mais movimenta.
   *
   * B2 é o único cenário que afirma **aritmética exata** de saldo — "creditou
   * uma vez só: o saldo cresce exatamente um pacote". Em `e2e_artista` isso é
   * indefensável: B7 confirma seleção de curadores e gasta 2 Claves, e basta
   * cair dentro da janela de medição para o teste acusar crédito em dobro que
   * não houve. Já aconteceu (`Expected: 20, Received: 18`), e o `serial` do
   * arquivo não protege — a disputa é **entre** arquivos.
   *
   * Não precisa de carteira semeada: B2 compra a própria.
   */
  ARTISTA_COMPRA: { email: `e2e_compra@${DOMINIO_E2E}`, nome: 'E2E Compra' },
  /*
   * As duas abaixo são estados de conta que a autenticação precisa distinguir,
   * e que nenhuma outra persona pode ter ao mesmo tempo.
   */

  /*
   * As quatro do módulo 12. O wizard é o recurso mais disputado da suíte: os
   * oito passos escrevem no **mesmo** `perfil_curador`, e `fullyParallel` faria
   * um arquivo salvar o passo 5 enquanto outro afirma o passo 1. Uma persona
   * por arquivo é o mesmo remédio que o seed já dá às faixas C3–C6.
   */

  /** Rascunho no passo 1 — retomada, pular e voltar (`e1`). */
  WIZARD_NAV: { email: `e2e_wizard_nav@${DOMINIO_E2E}`, nome: 'E2E Wizard Navegação' },
  /** Rascunho no passo 1 — canais, serviços e preços (`e2`). */
  WIZARD_MIDIAS: { email: `e2e_wizard_midias@${DOMINIO_E2E}`, nome: 'E2E Wizard Mídias' },
  /** Rascunho no passo 1 — credenciais e anexos (`e3`). */
  WIZARD_CREDENCIAIS: { email: `e2e_wizard_cred@${DOMINIO_E2E}`, nome: 'E2E Wizard Credenciais' },
  /**
   * Bronze aprovado, com mídias e serviços — a manutenção do 12.6 (`e5`).
   *
   * Separada de `CURADOR_BRONZE` porque editar e excluir mídia mexe no que a
   * fila e a avaliação leem indiretamente, e porque a regra que o cenário prova
   * é "alterar mídia **não** altera a classe" — precisa de uma classe que só ele
   * observe.
   */
  CURADOR_MANUTENCAO: { email: `e2e_manutencao@${DOMINIO_E2E}`, nome: 'E2E Manutenção' },

  /** `perfil.situacao = 'bloqueada'` — a guarda expulsa com `?motivo=bloqueada`. */
  BLOQUEADA: { email: `e2e_bloqueada@${DOMINIO_E2E}`, nome: 'E2E Bloqueada' },
  /**
   * Artista **e** curador, com `ultimo_ambiente` gravado.
   *
   * É a única forma de exercer RF-008: papéis acumuláveis, entrada no último
   * ambiente usado e troca de papel pelo cabeçalho. Separada de `ARTISTA` e de
   * `CURADOR_BRONZE` porque acumular papel muda para onde o login leva, e as
   * duas são usadas por cenários que dependem do destino atual.
   */
  DOIS_PAPEIS: { email: `e2e_dois_papeis@${DOMINIO_E2E}`, nome: 'E2E Dois Papéis' },

  /**
   * Bronze que recebe as faixas dos cenários de SLA e atomicidade.
   *
   * Separado de `CURADOR_BRONZE` porque os testes de SLA mexem no relógio dos
   * envios e disparam a devolução: com a mesma conta, a fila que C1 conta
   * mudaria no meio da asserção.
   */
  CURADOR_SLA: { email: `e2e_curador_sla@${DOMINIO_E2E}`, nome: 'E2E Curador SLA' },
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
