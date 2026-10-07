/**
 * Copy de Conta e configurações — telas 7.2, 7.4, 17.2, 17.4 e 27.1.
 *
 * Arquivo próprio pelo mesmo motivo de `curador.ts`, e reexportado por
 * `prototipo.ts`. Fonte: `docs/R2/extraido/{Artista,Curador,Admin}.html`.
 *
 * Os textos de credencial e segurança são **idênticos** nos três ambientes —
 * "Pedimos a senha atual antes de trocar", "O novo endereço passa a valer
 * depois da confirmação enviada para ele". Só o que muda é o bloco financeiro
 * (cobrança no artista, recebimento no curador, cargo no admin), e esse não é
 * desta fatia.
 */

export const CONTA = {
  abas: {
    /**
     * 17.1, e **só no curador**. No artista o perfil é rota própria
     * (`/artista/perfil`), porque é assim que o protótipo do artista o põe —
     * com item na sidebar e tela "Editar cadastro". O protótipo do curador não
     * tem item de perfil na sidebar nenhum, e o PRD lista 17.1 como uma das
     * quatro telas de Conta. Cada lado segue o seu protótipo.
     */
    perfil: 'Perfil',
    dados: 'Dados da conta',
    preferencias: 'Preferências',
    seguranca: 'Segurança',
  },
  /**
   * Rótulo do grupo de abas para leitor de tela. O protótipo não tem — as abas
   * dele são `<button>` sem semântica nenhuma (design-system §4.6). Aqui elas
   * são navegação de verdade, e navegação sem nome obriga quem usa leitor de
   * tela a entrar na lista para descobrir do que ela é.
   */
  abasRotulo: 'Seções da conta',

  // ------------------------------------------------- dados da conta -------
  emailTitulo: 'E-mail da conta',
  emailNota:
    'Este e-mail identifica sua conta. Para trocar, confirmamos sua senha e o novo endereço.',
  alterarEmail: 'Alterar e-mail',

  /**
   * **Derivado.** O protótipo mostra os blocos de cobrança (artista) e de
   * recebimento (curador) com dados de exemplo. Eles são das telas 7.2 e 17.2 e
   * não da fatia de autenticação — o que aparece aqui é o aviso de que eles
   * chegam depois, no lugar de campos que não gravariam nada.
   */
  financeiroPendente: {
    artista: {
      titulo: 'Dados de cobrança',
      texto: 'Nome e CPF para a nota fiscal das compras de Claves.',
    },
    curador: {
      titulo: 'Dados de recebimento',
      texto: 'A chave Pix em que as Claves ganhas nas leituras viram repasse.',
    },
  },

  /**
   * "Papéis da conta" — o bloco que leva ao wizard do módulo 12.
   *
   * Só existe no protótipo do **artista**: o do curador não oferece "ativar
   * papel de artista", e inventá-lo aqui seria derivação onde há protótipo. A
   * frase "Depende de aprovação da curadoria" é literal e é honrada pelo
   * caminho Prata — o Bronze sai aprovado na hora, o que está registrado como
   * divergência em `docs/prd/07-pendencias-e-divergencias.md`.
   */
  papeis: {
    overline: 'Papéis da conta',
    titulo: 'Ativar papel de curador',
    texto:
      'Os papéis se acumulam: você segue artista e passa a receber faixas para avaliar. Depende de aprovação da curadoria.',
    acao: 'Quero avaliar faixas',
  },

  // ------------------------------------------------------- segurança ------
  senhaTitulo: 'Senha',
  senhaNota:
    'Pedimos a senha atual antes de trocar. Ao confirmar, encerramos as outras sessões e avisamos por e-mail.',
  senhaAlteradaEm: (data: string) => `Alterada em ${data}.`,
  senhaNuncaAlterada: 'Você ainda não trocou a senha desde que criou a conta.',
  alterarSenha: 'Alterar senha',

  sessoesTitulo: 'Sessões ativas',
  sessaoAtual: 'Atual',
  sessaoEsteDispositivo: 'Este dispositivo · agora',
  sessaoVistoEm: (quando: string) => `Último acesso ${quando}`,
  encerrarSessao: 'Encerrar',
  encerrandoSessao: 'Encerrando…',
  sessoesVazias: 'Nenhuma outra sessão ativa.',
  /** Derivado: o protótipo mostra três linhas e não prevê lista longa. */
  sessoesOcultas: (quantos: number) =>
    quantos === 1
      ? 'E mais 1 dispositivo com acesso mais antigo.'
      : `E mais ${quantos} dispositivos com acesso mais antigo.`,
  sessoesNoGrupo: (quantas: number) => `${quantas} sessões`,
  encerrarOutrasSessoes: 'Encerrar todas as outras sessões',
  encerrandoOutrasSessoes: 'Encerrando…',
  /**
   * **Divergência registrada.** O protótipo mostra "Chrome · São Paulo", e
   * `auth.sessions` guarda `ip`, não cidade. Resolver o IP exigiria um serviço
   * externo por linha, e um "São Paulo" errado num painel que serve para
   * reconhecer acesso indevido é pior que nenhum. Ver o cabeçalho da `0001d`.
   *
   * O segundo termo passa a ser o **sistema** — "Chrome · Windows" —, que é a
   * outra coisa que a pessoa reconhece de bater o olho, e essa é verdadeira. O
   * IP entra na linha de apoio, onde serve para desconfiar de acesso que não
   * foi seu.
   */
  sessaoDispositivo: (navegador: string, sistema: string) => `${navegador} · ${sistema}`,
  sessaoDispositivoDesconhecido: 'Dispositivo não identificado',
  sessaoIp: (ip: string) => `IP ${ip}`,

  encerrarContaTitulo: 'Encerrar conta',
  excluirConta: 'Excluir conta',
  excluirContaNota:
    'Antes de excluir, você exporta seus dados (LGPD). A exclusão é definitiva depois de 30 dias. Nesse prazo, você reverte entrando de novo.',

  // -------------------------------------------- modal · alterar senha -----
  modalSenha: {
    overline: 'Reautenticação',
    titulo: 'Alterar senha',
    texto:
      'Use 8 caracteres ou mais, com pelo menos um número. Ao confirmar, encerramos as outras sessões e avisamos por e-mail.',
    rotuloAtual: 'Senha atual',
    placeholderAtual: 'Sua senha',
    rotuloNova: 'Nova senha',
    placeholderNova: '8+ caracteres, com número',
    rotuloConfirmar: 'Confirmar nova senha',
    placeholderConfirmar: 'Repita a nova senha',
    enviar: 'Alterar senha',
    enviando: 'Alterando…',
    cancelar: 'Cancelar',
    sucesso: 'Senha alterada. Encerramos as outras sessões e avisamos por e-mail.',
  },

  // -------------------------------------------- modal · alterar e-mail ----
  modalEmail: {
    overline: 'Reautenticação',
    titulo: 'Alterar e-mail da conta',
    texto:
      'Confirme sua senha e informe o novo endereço. Antes de aplicar a troca, enviamos um link de confirmação para ele.',
    rotuloAtual: 'Senha atual',
    placeholderAtual: 'Sua senha',
    rotuloEmail: 'Novo e-mail',
    placeholderEmail: 'novo@email.com',
    enviar: 'Enviar confirmação',
    enviando: 'Enviando…',
    cancelar: 'Cancelar',
    sucesso: (email: string) => `Enviamos um link de confirmação para ${email}.`,
  },

  // ------------------------------------------ modal · excluir, passo 1 ----
  modalExportar: {
    overline: 'Passo 1 de 2 · LGPD',
    titulo: 'Leve seus dados antes',
    texto:
      'Geramos um arquivo com seu perfil, faixas enviadas, devolutivas recebidas e histórico de Claves. Depois da exclusão, nada disso volta.',
    /**
     * O nome antes de gerar. O protótipo mostra `dissona-dados-aurora.zip` — o
     * nome real leva o id da conta, e mostrar o id de alguém como se fosse o
     * nome do arquivo não ajudaria ninguém a reconhecê-lo no Downloads.
     */
    nomePrevio: 'dissona-dados.zip',
    subrotulo: 'Perfil, faixas, devolutivas e histórico de Claves',
    exportar: 'Exportar dados',
    exportando: 'Gerando…',
    pronto: 'Arquivo pronto · gerado agora',
    baixar: 'Baixar o arquivo',
    aviso: 'Arquivo gerado. O link vale 24 horas.',
    continuar: 'Continuar',
    cancelar: 'Cancelar',
  },

  // ------------------------------------------ modal · excluir, passo 2 ----
  modalExcluir: {
    overline: 'Passo 2 de 2 · Confirmação',
    titulo: 'Confirmar a exclusão',
    texto:
      'Desativamos a conta agora e apagamos em 30 dias. As devolutivas já pagas ficam com os curadores por obrigação contratual.',
    rotuloAtual: 'Senha atual',
    placeholderAtual: 'Sua senha',
    rotuloConfirmacao: 'Digite EXCLUIR para confirmar',
    placeholderConfirmacao: 'EXCLUIR',
    enviar: 'Excluir minha conta',
    enviando: 'Excluindo…',
    cancelar: 'Cancelar',
  },

  // ------------------------------------------------------------ erros -----
  erroSenhaAtual: 'A senha atual não confere.',
  erroSenhaAtualVazia: 'Informe a senha atual.',
  erroSenhaFraca: 'A nova senha precisa de 8 caracteres e pelo menos um número.',
  erroConfirmarVazio: 'Confirme a nova senha.',
  erroSenhasDiferentes: 'As senhas não são iguais.',
  erroEmailVazio: 'Informe o novo e-mail.',
  erroEmailInvalido: 'Informe um e-mail em formato válido.',
  erroEmailExistente: 'Esse e-mail já pertence a outra conta.',
  erroPalavra: 'Digite EXCLUIR, em letras maiúsculas, para confirmar.',
  erroLimite: 'Já enviamos um e-mail há pouco. Espere um instante antes de tentar de novo.',
  erroExportacao: 'Não conseguimos gerar o arquivo agora. Tente de novo em alguns instantes.',

  // ------------------------------------------------------ pendências ------
  /**
   * O aviso dos blocos e das abas que existem no protótipo e cuja tela é de
   * outra fatia. Aparecem com o aviso, e não escondidos: a forma da tela não
   * muda a cada entrega, e o cliente entende o que o produto vai oferecer.
   */
  pendenteNestaRelease: 'Esta parte da tela chega em uma próxima entrega.',
} as const;

// ---------------------------------------------------------------------------
// 7.3 / 17.3 · Preferências
// ---------------------------------------------------------------------------

export const PREFERENCIAS = {
  notificacoesTitulo: 'Notificações',
  /** O protótipo escreve isto no lugar de um botão Salvar — e não há um. */
  salvoAutomaticamente: 'Salvo automaticamente',

  colunaEvento: 'Aviso',
  colunaInApp: 'No app',
  colunaEmail: 'E-mail',

  /**
   * A etiqueta do evento que não se desliga. A regra é da matriz de
   * notificações e é aplicada no envio por `registrar_notificacao`, que ignora
   * a preferência quando `critico` — a tela só conta a verdade.
   */
  critico: 'Sempre ativo',
  criticoNota: 'Avisos essenciais da conta e de prazo não podem ser desligados.',

  idiomaTitulo: 'Idioma da interface',
  /** Nota literal do protótipo — a do artista. A do curador é a outra. */
  idiomaNotaArtista: 'A devolutiva chega no idioma em que o curador escreveu.',
  idiomaNotaCurador: 'Vale para a interface. A faixa e o contexto chegam no idioma do artista.',

  idiomas: {
    'pt-BR': 'Português (Brasil)',
    es: 'Español',
    en: 'English',
  },

  erroSalvar: 'Não conseguimos salvar agora. Tente de novo em alguns instantes.',
  erroCritico: 'Este aviso é essencial e não pode ser desligado.',
} as const;

// ---------------------------------------------------------------------------
// 17.1 · Perfil do curador — leitura
// ---------------------------------------------------------------------------

/**
 * Textos da aba Perfil do curador.
 *
 * A aba é **de leitura**, e a edição fica em "Meu cadastro" (12.6). O PRD
 * descreve 17.1 com foto, bio e gêneros editáveis, mas 12.6 já os edita — e
 * duplicar a edição repetiria, para bio e gêneros, exatamente o problema que
 * esta tela evita para senha e exclusão: dois caminhos para o mesmo dado, e a
 * chance de corrigir um e esquecer o outro. A divergência está registrada em
 * docs/prd/07-pendencias-e-divergencias.md.
 */
export const CURADOR_PERFIL = {
  titulo: 'Seu perfil',
  subtitulo: 'O que o artista vê quando escolhe quem vai ouvir a faixa.',

  classeTitulo: 'Classe',
  classeNota: 'A classe é definida pela curadoria. Você não a altera por aqui.',

  bioTitulo: 'Bio',
  bioVazia: 'Você ainda não escreveu sua bio.',

  generosTitulo: 'Gêneros',
  generosVazios: 'Nenhum gênero escolhido.',

  especialidadeTitulo: 'Especialidade',
  especialidadeVazia: 'Nenhuma especialidade descrita.',

  credenciaisTitulo: 'Credenciais',
  credenciaisNota: 'Enviadas no cadastro e conferidas pela curadoria. Somente leitura.',
  credenciaisVazias: 'Nenhuma credencial enviada.',
  /** As que contam para a classe — as mesmas que `credenciaisComprovadas()` conta. */
  credencialComprovada: 'Comprovada',

  editar: 'Editar em Meu cadastro',
  editarNota: 'Bio, gêneros, mídias e serviços se alteram lá — e alterá-los não muda sua classe.',
} as const;
