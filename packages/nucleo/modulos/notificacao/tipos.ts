/**
 * As chaves do catálogo `evento_notificacao` que esta release usa.
 *
 * O seed da migration `0005` nasceu completo — 42 eventos das cinco releases,
 * derivados de [`docs/prd/06-matriz-notificacoes.md`]. Este registro é o
 * subconjunto que já tem código chamando, e existe por um motivo bem concreto:
 * `registrar_notificacao` levanta `DS030` para evento fora do catálogo, e um
 * erro de digitação numa string literal só apareceria em produção, no momento
 * em que alguém cria uma conta. Com o registro, o `typecheck` pega.
 *
 * O teste de deriva em `__testes__/eventos.test.ts` lê o `.sql` versionado e
 * confere que toda chave daqui existe lá. Ele **não** exige o contrário: o
 * catálogo é maior de propósito.
 */

export const EventoNotificacao = {
  // Autenticação (1 / 11 / 19)
  EMAIL_VERIFICACAO: 'email_verificacao',
  SENHA_RECUPERACAO_SOLICITADA: 'senha_recuperacao_solicitada',
  SENHA_RECUPERACAO_ADMIN: 'senha_recuperacao_admin',
  CREDENCIAL_ALTERADA: 'credencial_alterada',
  CONTA_BLOQUEADA: 'conta_bloqueada',
  NOVO_CADASTRO_CONCLUIDO: 'novo_cadastro_concluido',

  // Cadastro do curador (12)
  BRONZE_APROVADO: 'bronze_aprovado',
  CADASTRO_EM_ANALISE: 'cadastro_em_analise',
  CURADOR_PRATA_EM_ANALISE: 'curador_prata_em_analise',

  // Conta e equipe (27)
  CONVITE_MEMBRO_ENVIADO: 'convite_membro_enviado',
  PERMISSOES_ALTERADAS: 'permissoes_alteradas',
} as const;

export type EventoNotificacao = (typeof EventoNotificacao)[keyof typeof EventoNotificacao];

/**
 * Contexto do evento — vira o `jsonb` da linha de `notificacao`.
 *
 * Valores escalares só. É dado para a central de leitura (R5) compor o texto,
 * não texto pronto: a tradução é da View (architecture.md §8), e é assim que o
 * i18n da fatia de idioma entra sem reescrever chamada nenhuma.
 */
export type ContextoNotificacao = Readonly<Record<string, string | number | boolean>>;
