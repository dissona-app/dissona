/**
 * Códigos de erro tipados do domínio.
 *
 * A tradução para texto acontece **na View**, nunca no serviço
 * (architecture.md §8). Serviços lançam `ErroDominio`; a camada de
 * apresentação decide como dizer isso ao usuário, em qual idioma.
 */

export const CodigoErro = {
  // Genéricos
  NAO_AUTENTICADO: 'nao_autenticado',
  NAO_AUTORIZADO: 'nao_autorizado',
  NAO_ENCONTRADO: 'nao_encontrado',
  ENTRADA_INVALIDA: 'entrada_invalida',
  CONFLITO: 'conflito',

  // Configuração
  CONFIGURACAO_AUSENTE: 'configuracao_ausente',
  CONFIGURACAO_INVALIDA: 'configuracao_invalida',
  CONFIGURACAO_PENDENTE: 'configuracao_pendente',

  // Dinheiro e Claves
  VALOR_INVALIDO: 'valor_invalido',
  SALDO_INSUFICIENTE: 'saldo_insuficiente',
  PERCENTUAL_INVALIDO: 'percentual_invalido',

  // Autenticação e credenciais
  //
  // `NAO_AUTENTICADO` continua sendo o erro genérico de credencial, e é ele que
  // a tela de login mostra: distinguir "e-mail não existe" de "senha errada"
  // entrega ao atacante um oráculo de contas existentes (regras §9). Os códigos
  // abaixo são para os estados que **precisam** de uma resposta diferente —
  // conta bloqueada pede falar com o suporte, e-mail não verificado pede abrir
  // o link. Um banner genérico faria a pessoa tentar a senha de novo, para
  // sempre.
  EMAIL_JA_CADASTRADO: 'email_ja_cadastrado',
  /** O Auth recusou o endereço: a regra dele é mais rigorosa que a nossa. */
  EMAIL_INVALIDO: 'email_invalido',
  EMAIL_NAO_VERIFICADO: 'email_nao_verificado',
  CONTA_BLOQUEADA: 'conta_bloqueada',
  TOKEN_INVALIDO: 'token_invalido',
  TOKEN_EXPIRADO: 'token_expirado',
  SENHA_FRACA: 'senha_fraca',
  SENHAS_DIFERENTES: 'senhas_diferentes',
  ACEITE_OBRIGATORIO: 'aceite_obrigatorio',
  REAUTENTICACAO_INVALIDA: 'reautenticacao_invalida',
  /** Rate limit do provedor de e-mail, ou cooldown nosso de reenvio. */
  LIMITE_DE_ENVIO: 'limite_de_envio',

  // Papéis e cadastro
  PAPEL_AUSENTE: 'papel_ausente',
  CADASTRO_CURADOR_INCOMPLETO: 'cadastro_curador_incompleto',
  CADASTRO_CURADOR_JA_CONCLUIDO: 'cadastro_curador_ja_concluido',

  // Avaliação
  ESCUTA_INSUFICIENTE: 'escuta_insuficiente',
  CRITERIO_OBRIGATORIO_AUSENTE: 'criterio_obrigatorio_ausente',
  FEEDBACK_OBRIGATORIO: 'feedback_obrigatorio',
  AVALIACAO_JA_CONCLUIDA: 'avaliacao_ja_concluida',
  PRAZO_EXPIRADO: 'prazo_expirado',

  // Envio
  ARQUIVO_MUITO_GRANDE: 'arquivo_muito_grande',
  FORMATO_NAO_SUPORTADO: 'formato_nao_suportado',
  ENVIO_SITUACAO_INVALIDA: 'envio_situacao_invalida',
  FAIXA_SITUACAO_INVALIDA: 'faixa_situacao_invalida',

  // Seleção de curadores
  CURADOR_INVALIDO: 'curador_invalido',
  CURADOR_DUPLICADO: 'curador_duplicado',
  SERVICO_FEEDBACK_OBRIGATORIO: 'servico_feedback_obrigatorio',

  // Pagamento (5.2)
  //
  // Os dois são estados do **provedor**, e não do nosso domínio, mas a View
  // precisa distingui-los: recusado pede trocar de cartão e tentar de novo;
  // indisponível é falha nossa, e pedir para tentar de novo seria mentira.
  PAGAMENTO_RECUSADO: 'pagamento_recusado',
  PAGAMENTO_INDISPONIVEL: 'pagamento_indisponivel',

  // Pacotes e equipe
  PACOTE_EXCLUIDO: 'pacote_excluido',
  CONVITE_INVALIDO: 'convite_invalido',
} as const;

export type CodigoErro = (typeof CodigoErro)[keyof typeof CodigoErro];

/** Detalhes estruturados para a View compor a mensagem — nunca texto pronto. */
export type DetalhesErro = Readonly<Record<string, string | number | boolean>>;

export class ErroDominio extends Error {
  readonly codigo: CodigoErro;
  readonly detalhes?: DetalhesErro;

  constructor(codigo: CodigoErro, detalhes?: DetalhesErro) {
    // A `message` existe só para log e stack trace. Não use na interface.
    super(codigo);
    this.name = 'ErroDominio';
    this.codigo = codigo;
    if (detalhes !== undefined) this.detalhes = detalhes;
  }
}

export function ehErroDominio(erro: unknown): erro is ErroDominio {
  return erro instanceof ErroDominio;
}

/** Lança `ErroDominio` — atalho para guardas de serviço. */
export function falhar(codigo: CodigoErro, detalhes?: DetalhesErro): never {
  throw new ErroDominio(codigo, detalhes);
}
