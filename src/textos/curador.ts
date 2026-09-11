/**
 * Copy do módulo 12 — cadastro do curador em 8 passos.
 *
 * Arquivo próprio, e não mais um bloco em `prototipo.ts`: só este módulo tem
 * oito telas, cinco listas de opção e catorze mensagens de validação, e junto
 * do resto ele empurraria aquele arquivo para além de mil linhas. A fonte é a
 * mesma — `docs/R2/extraido/Curador.html` — e `prototipo.ts` reexporta tudo
 * daqui, então quem importa continua tendo um caminho só. A regra do
 * `AGENTS.md` é sobre a **origem** da copy, não sobre o número de arquivos.
 *
 * Literal do protótipo, incluindo `generoList`, `atuacaoList`, `tempoList`,
 * `credMeta`, `servMeta` e as mensagens de `cadStepOk`.
 *
 * Duas notas de fidelidade:
 *
 *  - O passo 1 do protótipo tem variante para quem **não** está logado, com
 *    campo de senha. No produto o wizard só é alcançável com sessão — a guarda
 *    de `(app)/curador` exige o papel —, então só a variante `curadorLogado`
 *    existe, e é a que diz "Nome e e-mail vêm da conta em que você já está".
 *  - Os limites da bio (40 a 400) são da tela e ficam aqui. O mínimo de
 *    credenciais **não** aparece neste arquivo: é
 *    `configuracao.classe.prata_min_credenciais`, threshold de negócio, e chega
 *    às funções abaixo como argumento.
 */

export const CURADOR_CADASTRO = {
  passoDe: (atual: number, total: number) => `Passo ${atual} de ${total}`,
  continuar: 'Continuar',
  enviarCadastro: 'Enviar cadastro',
  enviando: 'Enviando…',
  voltar: 'Voltar',
  voltarAoLogin: 'Voltar ao login',
  pular: 'Pular',

  /** Painel do split-screen, só no passo 1. */
  asideTitulo: 'Sua escuta vira crédito e remuneração.',
  asideTexto:
    'São oito perguntas curtas: gêneros, atuação, canais, serviços, preços e as credenciais que definem sua classe.',

  titulos: [
    'Dados básicos',
    'O que você cura?',
    'Como você atua?',
    'Onde você publica?',
    'Seus serviços e preços',
    'Credenciais e comprovações',
    'Bio e especialidade',
    'Revisão e envio',
  ] as const,

  subtitulos: [
    'Seu acesso à Dissona começa aqui.',
    'Escolha os gêneros que você escuta com propriedade.',
    'Marque suas frentes e há quanto tempo você faz isso.',
    'Cadastre os canais em que sua curadoria aparece. Você pode pular e fazer isso depois.',
    'Feedback é o serviço obrigatório. Os outros são opcionais. Preços em Claves.',
    'O que você comprova aqui define sua classe. Cada item pede link ou anexo.',
    'Duas linhas que o artista lê antes de escolher você.',
    'Confira cada bloco antes de enviar.',
  ] as const,

  // ------------------------------------------------------- passo 1 --------
  adicionarFoto: 'Adicionar foto',
  fotoHint: 'JPG ou PNG, até 2 MB.',
  herdado: 'Nome e e-mail vêm da conta em que você já está. A senha segue a mesma.',
  rotuloNome: 'Nome completo',
  rotuloEmail: 'E-mail',
  erroFotoTipo: 'A foto precisa ser JPG ou PNG.',
  erroFotoTamanho: 'A foto passa de 2 MB.',

  // ------------------------------------------------------- passo 2 --------
  generos: [
    'MPB contemporânea',
    'Rap nacional',
    'Trap',
    'Funk',
    'Eletrônico',
    'Rock alternativo',
    'Indie',
    'Samba',
    'Pagode',
    'Sertanejo',
    'Jazz',
    'Experimental',
  ] as const,
  contagemGeneros: (quantos: number) =>
    quantos === 0
      ? 'Escolha quantos quiser'
      : quantos === 1
        ? '1 gênero escolhido'
        : `${quantos} gêneros escolhidos`,
  erroGenero: 'Escolha ao menos um gênero.',

  // ------------------------------------------------------- passo 3 --------
  rotuloFrentes: 'Suas frentes',
  frentes: [
    'Jornalista',
    'Radialista',
    'Produtor',
    'Playlister',
    'A&R',
    'Professor',
    'Músico',
  ] as const,
  rotuloTempo: 'Tempo de atuação',
  tempos: ['Até 1 ano', '1 a 3 anos', '3 a 5 anos', '5 a 10 anos', 'Mais de 10'] as const,
  erroFrentes: 'Marque ao menos uma frente de atuação.',
  erroTempo: 'Informe seu tempo de atuação.',

  // ------------------------------------------------------- passo 4 --------
  tiposDeCanal: [
    { valor: 'playlist', rotulo: 'Playlist' },
    { valor: 'youtube', rotulo: 'YouTube' },
    { valor: 'instagram', rotulo: 'Instagram' },
    { valor: 'site', rotulo: 'Site' },
    { valor: 'blog', rotulo: 'Blog' },
    { valor: 'radio', rotulo: 'Rádio' },
    { valor: 'podcast', rotulo: 'Podcast' },
  ] as const,
  rotuloTipoDoCanal: 'Tipo',
  rotuloNomeDoCanal: 'Nome',
  rotuloLinkDoCanal: 'Link',
  placeholderNomeDoCanal: 'Nome do canal',
  placeholderLinkDoCanal: 'site.com/seu-canal',
  adicionarCanal: 'Adicionar canal',
  removerCanal: 'Remover canal',
  erroCanalVazio: 'Adicione ao menos um canal com nome e link.',
  erroCanalSemNome: 'Dê um nome a cada canal.',
  erroCanalLink: 'Confira os links dos canais: endereço válido e sem espaços.',
  erroLinkVazio: 'Informe o link do canal.',
  erroLinkComEspaco: 'O link não pode ter espaços.',
  erroLinkInvalido: 'Link inválido. Use um endereço como site.com/seu-canal.',

  // ------------------------------------------------------- passo 5 --------
  servicos: [
    {
      valor: 'feedback',
      rotulo: 'Feedback · obrigatório',
      descricao: 'Leitura por critério, com nota e texto assinado.',
      obrigatorio: true,
    },
    {
      valor: 'playlist',
      rotulo: 'Playlist',
      descricao: 'Inclusão em playlist quando a faixa convence.',
      obrigatorio: false,
    },
    {
      valor: 'post',
      rotulo: 'Post',
      descricao: 'Publicação nas suas redes com comentário.',
      obrigatorio: false,
    },
    {
      valor: 'materia',
      rotulo: 'Matéria',
      descricao: 'Texto editorial no veículo em que você escreve.',
      obrigatorio: false,
    },
  ] as const,
  unidadeClaves: 'Claves',
  notaClaves: '1 Clave equivale a R$ 10. Você pode mudar os preços depois, no painel.',
  erroPrecoFeedback: 'Defina o preço do feedback em Claves.',
  erroPrecoServicos: 'Defina o preço dos serviços que você ativou.',

  // ------------------------------------------------------- passo 6 --------
  credenciais: [
    {
      valor: 'anos',
      rotulo: '3 anos ou mais de atuação',
      prova: 'link',
      dica: 'Link do seu perfil ou currículo',
    },
    {
      valor: 'playlist',
      rotulo: 'Playlist com 1.000+ salvamentos',
      prova: 'link',
      dica: 'Link da playlist ou da rádio',
    },
    {
      valor: 'canal',
      rotulo: 'Canal com 10 mil+ seguidores',
      prova: 'link',
      dica: 'Link do canal ou perfil',
    },
    {
      valor: 'imprensa',
      rotulo: 'Texto publicado em imprensa ou blog',
      prova: 'link',
      dica: 'Link de uma matéria assinada',
    },
    {
      valor: 'disco',
      rotulo: 'Participação em lançamento de disco',
      prova: 'link',
      dica: 'Link do disco ou da ficha técnica',
    },
    {
      valor: 'formacao',
      rotulo: 'Formação formal na área',
      prova: 'anexo',
      dica: 'Anexe o certificado',
    },
  ] as const,
  anexarComprovacao: 'Anexar comprovação',
  anexoEnviado: 'Comprovação anexada',
  dicaClasse: (candidato: boolean) =>
    candidato ? 'Com isso você seria Candidato a Prata' : 'Com isso você seria Bronze',
  dicaContagem: (comprovadas: number, minimo: number) =>
    comprovadas >= minimo
      ? `${comprovadas} comprovadas`
      : `${comprovadas} de ${minimo} necessárias`,
  erroCredencial: 'Comprove com link válido ou anexo o que você marcou.',
  erroAnexoTipo: 'A comprovação precisa ser PDF, JPG ou PNG.',
  erroAnexoTamanho: 'A comprovação passa de 5 MB.',

  // ------------------------------------------------------- passo 7 --------
  rotuloBio: 'Bio',
  placeholderBio: 'Quem você é, o que você escuta e o que o artista pode esperar da sua leitura.',
  contadorBio: (quantos: number, limite: number) => `${quantos} de ${limite} caracteres`,
  rotuloEspecialidade: 'Especialidade',
  placeholderEspecialidade: 'Ex.: arranjo e letra na canção brasileira',
  erroBioCurta: 'A bio precisa de pelo menos 40 caracteres.',

  // ------------------------------------------------------- passo 8 --------
  editar: 'Editar',
  statusCompleto: 'Completo',
  statusFaltaPouco: 'Falta pouco',
  statusOpcional: 'Opcional',
  resumoVazio: {
    dados: 'Nome, e-mail e senha',
    generos: 'Nenhum gênero escolhido',
    atuacao: 'Frentes e tempo de atuação',
    canais: 'Nenhum canal cadastrado',
    bio: 'Sem bio nem especialidade',
  },
  avisoAvaliacao:
    'Seu cadastro passa por avaliação da equipe. Bronze é liberado na hora; candidato a Prata recebe resposta por e-mail.',
  aceiteAntes: 'Ao enviar, você aceita os ',
  aceiteTermos: 'Termos de uso',
  aceiteEntre: ' e a ',
  aceitePrivacidade: 'Política de privacidade',
  aceiteDepois: ', incluindo o tratamento dos seus dados conforme a LGPD.',
} as const;

/** Telas 12.4 e 12.5 — classificação e o destino por classe. */
export const CURADOR_CLASSIFICACAO = {
  tituloBronze: 'Bronze',
  tituloPrata: 'Candidato a Prata',
  subBronze: 'Classe de entrada',
  subPrata: (minimo: number) => `${minimo} ou mais credenciais comprovadas`,
  descBronze: (minimo: number) =>
    `Você entra como curador Bronze e suas indicações já circulam na plataforma. Comprove pelo menos ${minimo} credenciais verificáveis para se candidatar à classe Prata.`,
  descPrata: (minimo: number) =>
    `Você comprovou ${minimo} credenciais verificáveis ou mais. Seu perfil segue como candidato a Prata para análise da equipe. Aprovado, suas curadorias ganham mais peso e visibilidade.`,

  painelCredenciais: 'Credenciais reconhecidas',
  contagem: (comprovadas: number, minimo: number) =>
    comprovadas >= minimo
      ? `${comprovadas} comprovadas`
      : `${comprovadas} de ${minimo} necessárias`,
  notaOuro:
    'A classe Ouro não é atribuída no cadastro. Ela vem por convite ou por desempenho na plataforma.',
  continuar: 'Continuar',

  // -------------------------------------------- 12.5 · Bronze aprovado ----
  seloBronze: 'Curador Bronze aprovado',
  boasVindas: (primeiroNome: string) =>
    primeiroNome === '' ? 'Boas-vindas à curadoria' : `Boas-vindas, ${primeiroNome}`,
  boasVindasTexto:
    'Seu acesso está liberado. O curso de curadoria mostra como a Dissona escuta, pontua e escreve. É opcional: se preferir, vá direto para o painel.',
  cursoTitulo: 'Curso de curadoria',
  cursoResumo: '3 módulos · 39 min',
  cursoOpcional: 'Opcional',
  cursoModulos: [
    {
      numero: '01',
      titulo: 'Como a Dissona escuta',
      descricao: 'Os cinco critérios e o que cada nota significa.',
      duracao: '12 min',
    },
    {
      numero: '02',
      titulo: 'Escrever uma devolutiva',
      descricao: 'Crítica útil, sem conselho vazio e sem crueldade.',
      duracao: '18 min',
    },
    {
      numero: '03',
      titulo: 'Prazo, calibração e selo',
      descricao: 'O que mantém você calibrado e bem avaliado.',
      duracao: '9 min',
    },
  ] as const,
  comecarCurso: 'Começar o curso',
  irAoPainel: 'Ir para o painel',

  // -------------------------------------------- 12.5 · Prata em análise ---
  seloAnalise: 'Em análise',
  analiseTitulo: 'Cadastro em análise',
  analiseTexto:
    'Seu perfil de candidato a Prata foi enviado para a avaliação manual do time Dissona. Assim que for aprovado, você recebe um aviso por e-mail e o acesso à curadoria é liberado.',
  analiseNota: 'A equipe já recebeu o alerta para avaliar suas credenciais.',
  entendi: 'Entendi',
} as const;

/* ------------------- 12.6 · alteração de cadastro e mídias ---------------- */

/**
 * **Derivado.** A tela 12.6 entrou na V3.1 do discovery e **não existe no
 * protótipo** — a sidebar do curador tem "Meu cadastro", e o protótipo a
 * aponta para o wizard. O conteúdo aqui vem do PRD §12.6: tabela de mídias
 * com nome, tipo e link; inserir, editar e excluir com confirmação; editar
 * serviços e preços; e a regra grifada de que alterar mídia não altera a
 * classe.
 */
export const CURADOR_MANUTENCAO = {
  titulo: 'Meu cadastro',
  subtitulo: 'Suas mídias, seus serviços e a classe que você tem hoje.',

  classeOverline: 'Classe atual',
  /**
   * Rótulo de `perfil_curador.situacao`. `rascunho` não aparece aqui — a
   * guarda de rota manda quem não concluiu para o wizard —, e está no mapa
   * porque o enum tem cinco valores e um `Record` parcial esconderia o dia em
   * que um sexto entrar.
   */
  situacaoRotulo: {
    rascunho: 'Cadastro incompleto',
    bronze_aprovado: 'Aprovado',
    prata_em_analise: 'Em análise',
    prata_aprovado: 'Prata aprovado',
    prata_recusado: 'Prata não aprovado',
  },
  classeNota:
    'A classe vem das credenciais que você comprovou no cadastro. Alterar mídias e preços não muda a classe.',
  verClassificacao: 'Ver a classificação',

  midiasOverline: 'Mídias',
  midiasVazias: 'Você ainda não cadastrou nenhuma mídia.',
  midiasVaziasNota:
    'As mídias são os canais em que sua devolutiva pode ser compartilhada — playlist, canal, site.',
  inserirMidia: 'Inserir nova mídia',
  colunaNome: 'Nome',
  colunaTipo: 'Tipo',
  colunaLink: 'Link',
  editarMidia: 'Editar',
  excluirMidia: 'Excluir',
  /** O link abre em outra aba, e o aviso disso é para quem usa leitor de tela. */
  abrirEmNovaAba: (nome: string) => `Abrir ${nome} em outra aba`,

  servicosOverline: 'Serviços e preços',
  salvarServicos: 'Salvar serviços',
  salvandoServicos: 'Salvando…',
  servicosSalvos: 'Serviços e preços atualizados.',

  modalMidia: {
    overlineNova: 'Nova mídia',
    overlineEdicao: 'Editar mídia',
    tituloNova: 'Inserir nova mídia',
    tituloEdicao: 'Editar mídia',
    texto:
      'Nome, tipo e link. Alterar mídia não altera sua classe — ela vem das credenciais do cadastro.',
    enviar: 'Salvar mídia',
    enviando: 'Salvando…',
    cancelar: 'Cancelar',
    sucessoNova: 'Mídia adicionada.',
    sucessoEdicao: 'Mídia atualizada.',
  },

  modalExcluir: {
    overline: 'Confirmação',
    titulo: 'Excluir esta mídia?',
    alvo: (nome: string) => `“${nome}” sai da sua lista de canais de compartilhamento.`,
    texto:
      'A devolutiva que você já compartilhou por ela continua onde está. O que sai é a oferta deste canal para os próximos envios.',
    enviar: 'Excluir mídia',
    enviando: 'Excluindo…',
    cancelar: 'Cancelar',
    sucesso: 'Mídia excluída.',
  },

  erroMidiaSemNome: 'Dê um nome à mídia.',
  erroMidiaNomeLongo: 'O nome cabe em 120 caracteres.',
  erroMidiaTipo: 'Escolha o tipo da mídia.',
  erroMidiaLink: 'Informe um link válido, como site.com/seu-canal.',
  erroMidiaLinkVazio: 'Informe o link da mídia.',
} as const;
