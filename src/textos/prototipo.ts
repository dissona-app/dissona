/**
 * Copy literal dos protótipos da R2.
 *
 * Fonte: `docs/R2/*.html`, decodificados por `pnpm prototipo` para
 * `docs/R2/extraido/`. O `AGENTS.md` põe o protótipo acima do board de
 * discovery e acima de qualquer derivação, então **este arquivo é a fonte** do
 * texto das telas: a View importa daqui, e o E2E localiza por *role + name*
 * usando as mesmas constantes (via `e2e/apoio/textos.ts`, que reexporta).
 *
 * Mora em `src/` e não em `e2e/` de propósito: a aplicação é a dona da copy, e
 * o teste é que depende dela. Ao contrário, o build da aplicação passaria a
 * importar de dentro da suíte de testes.
 *
 * Um só lugar com o texto tem duas consequências que valem o incômodo de mais
 * um arquivo:
 *
 *  - Um seletor de E2E nunca fica desatualizado em relação à tela por causa de
 *    uma vírgula. Se o texto muda, muda para os dois ao mesmo tempo.
 *  - A auditoria de fidelidade é um diff: comparar este arquivo com o `.txt`
 *    extraído mostra o que foi inventado.
 *
 * Regra: **cópia literal, acentuação inclusive**. Onde o protótipo é corrigido
 * de propósito, o comentário diz por quê e aponta a decisão — é o caso de
 * "Submissões" → "Envios" (PRD §9) e das mensagens de validação que o
 * protótipo, sendo mock, não tem.
 */

/** Tela 19 — login administrativo (`/admin/entrar`). */
export const ADMIN_ENTRAR = {
  overline: 'Área administrativa',
  titulo: 'Acesso restrito',
  subtitulo: 'Entre com seu e-mail corporativo.',
  rotuloEmail: 'E-mail',
  placeholderEmail: 'voce@dissona.com.br',
  rotuloSenha: 'Senha',
  placeholderSenha: 'Sua senha',
  esqueciSenha: 'Esqueci minha senha',
  mostrarSenha: 'Mostrar senha',
  ocultarSenha: 'Ocultar senha',
  enviar: 'Entrar',
  enviando: 'Entrando…',
  rodape: 'Contas são criadas por convite.',

  erroEmailVazio: 'Informe seu e-mail.',
  erroEmailInvalido: 'Informe um e-mail em formato válido.',
  erroSenhaVazia: 'Informe sua senha.',

  bannerCredenciais: {
    titulo: 'Não foi possível entrar',
    texto: 'E-mail ou senha incorretos. Confira os dados e tente de novo.',
  },
  bannerSemAcesso: {
    titulo: 'Conta sem acesso administrativo',
    texto: 'Esta conta existe, mas não tem permissão nesta área.',
    acao: 'Falar com um administrador',
  },
} as const;

/** Tela 1 — login de artista e curador (`/entrar`). */
export const ENTRAR = {
  overline: 'Curadoria musical',
  titulo: 'Leitura real da sua música.',
  rotuloEmail: 'E-mail',
  placeholderEmail: 'voce@email.com',
  rotuloSenha: 'Senha',
  placeholderSenha: 'Sua senha',
  esqueciSenha: 'Esqueci minha senha',
  mostrarSenha: 'Mostrar senha',
  ocultarSenha: 'Ocultar senha',
  enviar: 'Entrar',
  enviando: 'Entrando…',
  ou: 'ou',
  google: 'Google',
  facebook: 'Facebook',
  soundcloud: 'SoundCloud',
  semConta: 'Ainda não tem conta?',
  criarConta: 'Criar conta',
  suporte: 'Falar com o suporte',

  erroEmailVazio: 'Informe seu e-mail.',
  erroEmailInvalido: 'Informe um e-mail em formato válido.',
  erroSenhaVazia: 'A senha é obrigatória.',

  bannerCredenciais: {
    titulo: 'E-mail ou senha inválidos',
    texto:
      'Confira os dados e tente de novo. Depois de 5 tentativas, bloqueamos a conta por segurança.',
  },
  bannerBloqueada: {
    titulo: 'Conta bloqueada',
    texto:
      'Bloqueamos o acesso depois de tentativas repetidas. O suporte libera em até 1 dia útil.',
  },

  /**
   * Provas sociais do pé da tela.
   *
   * A terceira **diverge do protótipo de propósito**: ele diz "100% da faixa
   * ouvida", e a tela de avaliação do mesmo conjunto de protótipos diz "A
   * escuta é medida. A avaliação só é aceita a partir de 60% da faixa
   * ouvidos". O gate é 60% (`configuracao.escuta_minima_percentual`), então a
   * promessa de 100% é uma promessa que o produto não cumpre — e prometer
   * cobertura de escuta na home é justamente onde isso custa confiança.
   * Trocada por uma afirmação verificável. Registrado em
   * `docs/R2/perguntas-ao-cliente.md`.
   */
  provas: ['7 dias para a devolutiva', 'até 11 critérios com nota', 'escuta medida e registrada'],
} as const;

/** Tela 21 — lista de pacotes de Claves (`/admin/pacotes`). */
export const ADMIN_PACOTES = {
  titulo: 'Pacotes de Claves',
  subtitulo: 'Pacotes que o artista compra.',
  base: 'Base de 1 Clave por R$ 10, com desconto progressivo por volume.',
  novo: 'Novo pacote',

  colunas: {
    nome: 'Nome',
    claves: 'Claves',
    valor: 'Valor',
    desconto: 'Desconto',
    porClave: 'Por Clave',
    status: 'Status',
    acoes: 'Ações',
  },

  subNaCarteira: 'Na Carteira do artista',
  subForaDaCarteira: 'Fora da Carteira',
  statusAtivo: 'Ativo',
  statusInativo: 'Inativo',
  semDesconto: '—',

  editar: 'Editar',
  ativar: 'Ativar',
  desativar: 'Desativar',
  excluir: 'Excluir pacote',

  nota:
    'Só os pacotes ativos aparecem na Carteira do artista. Toda mudança de preço ' +
    'fica registrada em log e entra no Financeiro.',

  /** `EstadoVazio` — o protótipo semeia quatro pacotes e não tem esta tela. */
  vazioTitulo: 'Nenhum pacote cadastrado',
  vazioDescricao: 'Sem pacote ativo, a Carteira do artista não tem o que vender.',

  /**
   * `pacotesResumo` do protótipo:
   * `pacotesAtivos + ' de ' + s.pacotes.length + ' pacotes visíveis para o artista'`
   */
  resumo: (ativos: number, total: number) =>
    `${ativos} de ${total} pacotes visíveis para o artista`,

  flashAtivado: (nome: string) => `${nome} voltou para a Carteira do artista.`,
  flashDesativado: (nome: string) => `${nome} saiu da Carteira do artista.`,
  flashExcluido: (nome: string) =>
    `${nome} foi excluído. A Carteira do artista já não mostra o pacote.`,
} as const;

/** Modal de exclusão da tela 21. */
export const ADMIN_PACOTE_EXCLUIR = {
  overline: 'Excluir pacote',
  texto:
    'O pacote sai da Carteira do artista na hora. Compras já feitas continuam válidas ' +
    'e a exclusão fica registrada em log. Se a ideia for só tirar de circulação, desative.',
  confirmar: 'Excluir pacote',
  cancelar: 'Cancelar',

  /** `delPacoteNome` do protótipo: `delP.nome + ' · ' + delP.qtd + ' Claves'`. */
  alvo: (nome: string, claves: string) => `${nome} · ${claves} Claves`,
} as const;

/** Tela 21.1 — criar e editar pacote (`/admin/pacotes/novo`, `/[pacoteId]`). */
export const ADMIN_PACOTE_FORMULARIO = {
  tituloNovo: 'Novo pacote',
  tituloEditar: 'Editar pacote',
  subtitulo: 'Defina a quantidade, o valor e o desconto.',
  voltar: 'Voltar para os pacotes',

  rotuloNome: 'Nome do pacote',
  placeholderNome: 'Ensaio, Repertório, Turnê',
  rotuloQuantidade: 'Qtd de Claves',
  placeholderQuantidade: '30',
  rotuloDesconto: 'Desconto (%)',
  placeholderDesconto: '5',
  rotuloValor: 'Valor (R$)',
  placeholderValor: '285',

  auxiliarBase: (base: string) => `Base: ${base}`,
  auxiliarDesconto: 'Recalcula o valor',
  auxiliarValor: 'Recalcula o desconto',

  resumoPorClave: 'Preço por Clave',
  resumoDesconto: 'Desconto aplicado',
  resumoEconomia: 'Economia do artista',
  resumoSemDesconto: 'sem desconto',

  ativoTitulo: 'Pacote ativo',
  ativoDescricao: 'Ativo aparece na Carteira do artista na hora em que você salva.',

  salvar: 'Salvar',
  cancelar: 'Cancelar',
  notaRodape: 'A alteração vale para novas compras e fica registrada em log.',

  flashCriado: 'Pacote criado. Já vale na Carteira do artista.',
  flashAtualizado: 'Pacote atualizado. Já vale na Carteira do artista.',

  /**
   * Validação.
   *
   * O protótipo **não** valida: `salvarPacote()` coage em silêncio — nome vazio
   * vira `'Pacote 30 Claves'`, quantidade inválida vira `30`, desconto inválido
   * vira `5`. Isso é comportamento de mock, e o cenário A2 do guia de testes
   * exige o contrário: "Validações barram valores/percentuais inválidos".
   * Aqui o guia vence, e as mensagens seguem a voz das do login, que o
   * protótipo tem.
   */
  erroNomeVazio: 'Informe o nome do pacote.',
  erroQuantidadeInvalida: 'Informe uma quantidade inteira de Claves, maior que zero.',
  erroValorInvalido: 'Informe um valor maior que zero.',
  erroValorAcimaDaBase: 'O valor não pode passar da base sem desconto.',
  erroDescontoInvalido: 'O desconto tem de ficar entre 0% e 99,99%.',
} as const;

/** Navegação do ambiente administrativo, como está na sidebar do protótipo. */
export const ADMIN_NAVEGACAO = {
  inicio: 'Início',
  grupoGestao: 'Gestão',
  curadoresEArtistas: 'Curadores e artistas',
  pacotes: 'Pacotes de Claves',
  grupoOperacao: 'Operação',
  financeiro: 'Financeiro da plataforma',
  moderacao: 'Moderação e antifraude',
  grupoConta: 'Conta',
  contaEEquipe: 'Conta e equipe',
  rodape: 'Ambiente administrativo',
  sair: 'Sair',
} as const;
