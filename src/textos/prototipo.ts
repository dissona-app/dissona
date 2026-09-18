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
 * Alguns módulos moram em arquivos próprios e são **reexportados** daqui: o
 * cadastro do curador (`curador.ts`, oito telas e cinco listas de opção),
 * Conta e configurações (`conta.ts`, quatro modais) e a avaliação
 * (`avaliacao.ts`, cinco etapas e a tabela de acréscimos). Juntos eles
 * empurrariam este arquivo para além de mil linhas. A fonte é a mesma; quem
 * importa continua tendo um caminho só.
 *
 * Regra: **cópia literal, acentuação inclusive**. Onde o protótipo é corrigido
 * de propósito, o comentário diz por quê e aponta a decisão — é o caso de
 * "Submissões" → "Envios" (PRD §9) e das mensagens de validação que o
 * protótipo, sendo mock, não tem.
 */

export { AVALIAR } from './avaliacao';
export { CONTA } from './conta';
export { CURADOR_CADASTRO, CURADOR_CLASSIFICACAO, CURADOR_MANUTENCAO } from './curador';
export { EQUIPE } from './equipe';

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

  /**
   * **Derivado**, e não literal do protótipo.
   *
   * O protótipo do Admin só tem dois banners: `error` e `noaccess`. Mas o
   * PRD 19 lista "conta bloqueada" entre os estados da tela, e o estado existe
   * de verdade — o admin pode bloquear a conta de outro membro (27.2). Sem esta
   * copy, uma conta administrativa bloqueada veria "e-mail ou senha
   * incorretos" e tentaria a senha para sempre.
   *
   * O texto é o do ambiente do usuário, ajustado para quem resolve o caso aqui:
   * lá é o suporte, aqui é outro administrador.
   */
  bannerBloqueada: {
    titulo: 'Conta bloqueada',
    texto: 'O acesso desta conta foi suspenso. Outro administrador pode reativá-la.',
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
   * **Derivado.** O protótipo não tem estado de falha social — os botões dele
   * não autenticam nada, só trocam de tela. No produto o OAuth pode voltar sem
   * `code`, ou com um `code` que o Supabase recusa, e a pessoa precisa saber
   * que o caminho por senha continua ali.
   */
  bannerSocial: {
    titulo: 'Não foi possível entrar pelo provedor',
    texto: 'Tente de novo, ou entre com e-mail e senha.',
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

/** `/artista/entrar` — mesma copy de `ENTRAR`, que sempre foi a do artista. */
export const ENTRAR_ARTISTA = ENTRAR;

/**
 * `/curador/entrar` — copy própria do ambiente curador.
 *
 * Fonte: `docs/R2/extraido/Curador.txt` linhas 1-23 (overline, título e as três
 * provas do rodapé, palavra por palavra).
 */
export const ENTRAR_CURADOR = {
  ...ENTRAR,
  overline: 'Área do curador',
  titulo: 'Escute com método. Seja remunerado por isso.',
  provas: [
    'Você define seus serviços e preços',
    'Remuneração por classe e prazo',
    'Bronze, Prata e Ouro por mérito',
  ],
} as const;

/** Tela 1.1 — cadastro de artista e curador (`/cadastrar`). */
export const CADASTRAR = {
  overline: 'Área do artista',
  titulo: 'Criar conta',
  subtitulo: 'Crie sua conta e comece a enviar suas faixas.',

  rotuloNome: 'Nome completo',
  placeholderNome: 'Como você assina seu trabalho',
  rotuloEmail: 'E-mail',
  placeholderEmail: 'voce@email.com',
  rotuloSenha: 'Senha',
  placeholderSenha: '8+ caracteres, com número',
  rotuloConfirmar: 'Confirmar senha',
  placeholderConfirmar: 'Repita a senha',
  mostrarSenha: 'Mostrar senha',
  ocultarSenha: 'Ocultar senha',

  /** Níveis 0 a 3 do medidor (§2.2.9), na ordem que `forcaDaSenha` devolve. */
  forcaDaSenha: ['Mínimo 8 com número', 'Senha fraca', 'Senha média', 'Senha forte'] as const,
  requisitoTamanho: '8 caracteres ou mais',
  requisitoNumero: 'Pelo menos 1 número',

  /**
   * O aceite é uma frase com dois links no meio. Fica partida porque é assim
   * que ela se monta em JSX sem `dangerouslySetInnerHTML` — e a alternativa,
   * uma string com marcadores, precisaria de um parser para uma frase só.
   */
  aceiteAntes: 'Li e aceito os ',
  aceiteTermos: 'Termos de uso',
  aceiteEntre: ' e a ',
  aceitePrivacidade: 'Política de privacidade',
  aceiteDepois: ', incluindo o tratamento dos meus dados conforme a LGPD.',

  enviar: 'Criar conta',
  enviando: 'Criando conta…',

  ouSocial: 'ou use uma conta',
  google: 'Google',
  facebook: 'Facebook',
  soundcloud: 'SoundCloud',
  /**
   * **Derivada.** O protótipo diz "Google, Facebook ou SoundCloud preenchem seu
   * nome e e-mail", e para o SoundCloud a segunda metade é impossível: a API
   * deles não expõe endereço (open-questions #9). Prometer o que não se cumpre
   * na tela que pede confiança é pior do que a frase mais longa.
   */
  notaSocial:
    'Google e Facebook preenchem nome e e-mail. Com o SoundCloud, o nome vem e o e-mail você informa. Você confirma antes de criar.',

  temConta: 'Já tem conta?',
  entrar: 'Entrar',

  erroNomeVazio: 'Informe seu nome completo.',
  erroEmailVazio: 'Informe seu e-mail.',
  erroEmailInvalido: 'Informe um e-mail em formato válido.',
  erroSenhaFraca: 'A senha precisa de 8 caracteres e pelo menos um número.',
  erroConfirmarVazio: 'Confirme a senha.',
  erroSenhasDiferentes: 'As senhas não são iguais.',
  erroAceite: 'É preciso aceitar os Termos e a Política de privacidade.',

  bannerEmailExistente: {
    titulo: 'Esse e-mail já tem conta na Dissona',
    texto:
      'O e-mail identifica a conta. Se for você, entre e adicione o papel de artista no seu perfil.',
    acao: 'Entrar com esse e-mail',
  },
  bannerLimite: {
    titulo: 'Muitas tentativas em pouco tempo',
    texto: 'Aguarde alguns minutos antes de tentar criar a conta de novo.',
  },

  /** Aside "Como funciona", ao lado do formulário. */
  comoFunciona: {
    /**
     * "Como funciona" é o **overline** do painel, e não o título dele — é a
     * frase seguinte que o protótipo compõe como `<h2>`. Trocar os dois de
     * papel (o que estava aqui) dava um título de 16 px onde o protótipo tem
     * um rótulo de 11 px, e um parágrafo de 13 px onde ele tem o título.
     */
    overline: 'Como funciona',
    titulo: 'Envie a faixa. Receba um parecer que você pode citar.',
    passos: [
      {
        numero: '01',
        titulo: 'Envie sua música',
        texto: 'Uma faixa por envio. Quantos curadores couberem no seu saldo.',
      },
      {
        numero: '02',
        titulo: 'Receba leitura real',
        texto: 'Até 11 critérios, cada um com nota decimal e um parágrafo obrigatório.',
      },
      {
        numero: '03',
        titulo: 'Acompanhe sua evolução',
        texto: 'Relatórios que comparam faixa a faixa.',
      },
      {
        numero: '04',
        titulo: 'Circule mais longe',
        texto: 'Playlist, post ou matéria, a partir do parecer.',
      },
    ],
    nota: 'Seus dados servem só para operar a curadoria. Nada de venda de base ou publicidade dirigida.',
  },
} as const;

/**
 * Mesmo shape de `CADASTRAR`, com literais alargados para `string` — sem isto
 * `CADASTRAR_CURADOR` (overline diferente) não seria atribuível ao tipo de
 * `CADASTRAR_ARTISTA` só porque os dois nascem de `as const`.
 */
type Alargado<T> = T extends object
  ? { readonly [K in keyof T]: Alargado<T[K]> }
  : T extends string
    ? string
    : T;

export type TextosDeCadastro = Alargado<typeof CADASTRAR>;

/** `/artista/cadastrar` — mesma copy de `CADASTRAR`, que sempre foi a do artista. */
export const CADASTRAR_ARTISTA = CADASTRAR;

/**
 * `/curador/cadastrar` — copy própria do ambiente curador.
 *
 * O protótipo não tem uma tela de cadastro básico (nome/e-mail/senha) para o
 * curador com copy própria — `docs/R2/extraido/Curador.txt` vai do rodapé do
 * login direto para o wizard do módulo 12. Overline ajustado para o ambiente
 * certo; o resto do formulário e o aside "Como funciona" são **derivados** da
 * versão do artista, mesma estrutura de passos, até existir copy própria.
 */
export const CADASTRAR_CURADOR = {
  ...CADASTRAR,
  overline: 'Área do curador',
} as const;

/** Verificação de e-mail (`/verificar-email`) — tela que o protótipo acrescentou. */
export const VERIFICAR_EMAIL = {
  overline: 'Verificação',
  titulo: 'Confirme seu e-mail para continuar',

  /**
   * A frase envolve o endereço em negrito, e por isso vem partida — igual ao
   * aceite do cadastro.
   *
   * O fecho é o do protótipo do **artista** ("um tour rápido mostra como a
   * Dissona funciona"). O do curador diz "você escolhe seus papéis na
   * plataforma", e os dois estão certos para o seu ambiente — mas o cadastro é
   * único e nesta altura o papel ainda não existe, então prometer a escolha de
   * papéis seria descrever o caminho de um dos dois. O tour vale para os dois:
   * artista vai direto a ele, curador chega nele depois do wizard.
   */
  textoAntes: 'Enviamos um link de verificação para ',
  textoDepois:
    '. Ele vale por 24 horas. Depois de confirmar, um tour rápido mostra como a Dissona funciona.',
  /** Quando não há e-mail na URL — o protótipo cai para o mesmo genérico. */
  emailDesconhecido: 'seu e-mail',

  continuar: 'Já confirmei, continuar',
  reenviar: 'Reenviar e-mail',
  reenviando: 'Reenviando…',
  naoChegouAntes: 'Não chegou? Verifique o spam ou ',
  corrigirEndereco: 'corrija o endereço',
  naoChegouDepois: '.',

  bannerReenviado: {
    titulo: 'Link reenviado',
    texto: 'Se a conta ainda não estava confirmada, um link novo acabou de sair.',
  },
  bannerLimite: {
    titulo: 'Aguarde para reenviar',
    texto: 'Já enviamos um link há pouco. Espere alguns minutos antes de pedir outro.',
  },
  bannerNaoConfirmado: {
    titulo: 'Ainda não confirmamos este e-mail',
    texto: 'Abra o link que enviamos. Se ele expirou, reenvie e use o mais recente.',
  },
} as const;

/**
 * Telas 1.2, 1.3, 19.1 e 19.2 — recuperação e redefinição de senha.
 *
 * Um bloco só para os dois ambientes: o protótipo do Artista e o do Admin têm
 * **exatamente** a mesma copy nestas quatro telas, palavra por palavra. O que
 * muda é para onde os links voltam, e isso é `props` da página, não texto.
 *
 * A única diferença real é o "Redefinindo a senha de …", que o Artista tem e o
 * Admin não — e ela também some aqui, por uma razão que não é de fidelidade:
 * ver a nota em `dono`.
 */
export const SENHA = {
  // ------------------------------------------------------- 1.2 / 19.1 -----
  recuperarOverline: 'Recuperação',
  recuperarTitulo: 'Esqueci minha senha',
  recuperarTexto: 'Informe o e-mail da conta. Enviamos um link para você definir uma senha nova.',
  recuperarNota: 'Ele vale por 60 minutos e só pode ser usado uma vez.',
  rotuloEmail: 'E-mail cadastrado',
  placeholderEmail: 'voce@email.com',
  recuperarEnviar: 'Enviar link de recuperação',
  recuperarEnviando: 'Enviando…',
  lembrou: 'Lembrou a senha?',
  voltarAoLogin: 'Voltar para o Login',

  erroEmailVazio: 'Informe seu e-mail.',
  erroEmailInvalido: 'Informe um e-mail em formato válido.',

  // Confirmação neutra. O título é a frase inteira, como no protótipo.
  enviadoOverline: 'Pedido registrado',
  enviadoTitulo: 'Se este e-mail estiver cadastrado, enviamos um link de recuperação.',
  enviadoTexto:
    'Por segurança, não confirmamos se a conta existe. O link expira em 60 minutos e vale um único uso.',
  reenviar: 'Reenviar link',
  reenviando: 'Reenviando…',
  bannerLimite: {
    titulo: 'Aguarde para reenviar',
    texto: 'Já enviamos um link há pouco. Espere um instante antes de pedir outro.',
  },

  // ------------------------------------------------------- 1.3 / 19.2 -----
  redefinirOverline: 'Redefinição · link válido',
  redefinirTitulo: 'Definir nova senha',
  /**
   * **Não usado.** O protótipo mostra "Redefinindo a senha de a***@email.com",
   * mascarando o endereço que a própria pessoa digitou na tela anterior — o que
   * é teatro, porque o mock guarda o valor em memória.
   *
   * No fluxo real quem chega aqui vem do link do e-mail, e a sessão de
   * recuperação **tem** o endereço. Mostrá-lo mascarado seria esconder de
   * alguém um dado que já é dele; mostrá-lo inteiro numa tela alcançável por
   * quem tiver o link é que seria vazamento. O protótipo escolheu a máscara por
   * hábito, não por ameaça — e a tela funciona sem a linha.
   */
  dono: 'Redefinindo a senha de ',
  redefinirTexto:
    'Use 8 caracteres ou mais, com pelo menos um número. Ao redefinir, encerramos as outras sessões da conta.',
  rotuloNovaSenha: 'Nova senha',
  placeholderNovaSenha: '8+ caracteres, com número',
  rotuloConfirmar: 'Confirmar nova senha',
  placeholderConfirmar: 'Repita a nova senha',
  mostrarSenha: 'Mostrar senha',
  ocultarSenha: 'Ocultar senha',
  redefinirEnviar: 'Redefinir senha',
  redefinindo: 'Redefinindo…',

  forcaDaSenha: ['Mínimo 8 com número', 'Senha fraca', 'Senha média', 'Senha forte'] as const,
  requisitoTamanho: '8 caracteres ou mais',
  requisitoNumero: 'Pelo menos 1 número',

  erroSenhaFraca: 'A senha precisa de 8 caracteres e pelo menos um número.',
  erroConfirmarVazio: 'Confirme a nova senha.',
  erroSenhasDiferentes: 'As senhas não são iguais.',

  // Link inválido — 60 minutos, uso único.
  invalidoOverline: 'Link inválido',
  invalidoTitulo: 'Este link expirou ou já foi usado',
  invalidoTexto: 'Cada link vale 60 minutos e só funciona uma vez. Peça um novo para continuar.',
  reiniciar: 'Reiniciar recuperação',

  // Concluído.
  concluidoOverline: 'Concluído',
  concluidoTitulo: 'Senha redefinida',
  concluidoTexto: 'Encerramos as outras sessões da conta. Entre com a senha nova.',
  irAoLogin: 'Ir para o Login',

  /**
   * **Fora**: "Já está com o link em mãos? / Continuar para a redefinição".
   *
   * É atalho de protótipo — no mock a redefinição é uma tela como outra
   * qualquer, e o botão só troca de tela. No produto, chegar à redefinição
   * exige o token do e-mail, e não existe "continuar" sem ele. Manter o link
   * seria oferecer um caminho que sempre termina em "link inválido".
   */
} as const;

/**
 * Confirmação do cadastro social. **Derivada**, não literal.
 *
 * O protótipo promete, no pé do cadastro: *"Google, Facebook ou SoundCloud
 * preenchem seu nome e e-mail. Você confirma antes de criar."* Com provider
 * nativo do Supabase isso é impossível ao pé da letra — a conta nasce no
 * callback, e só voltamos a ter controle depois disso.
 *
 * Esta tela é o cumprimento possível daquela promessa: a confirmação acontece
 * **depois** de criar, e é ela que libera a navegação. Enquanto o aceite não
 * vier, a guarda de rota devolve a pessoa para cá — porque conta ativa sem
 * aceite registrado é justamente o que a LGPD não admite (RF-010).
 *
 * A metade "e e-mail" da promessa também não vale para o SoundCloud: o `/me`
 * deles não tem campo de e-mail, só `primary_email_confirmed`, que é um
 * booleano.
 *
 * Por isso a tela tem **dois modos**: com Google e Facebook o endereço é
 * conferido; com SoundCloud ele é pedido, e a conta só passa a ter e-mail
 * depois daqui. A `notaSocial` do cadastro mudou junto.
 */
export const CONFIRMAR_SOCIAL = {
  overline: 'Quase lá',
  titulo: 'Confirme seus dados',
  subtitulo: 'Trouxemos seu nome e e-mail do provedor. Confira antes de continuar.',

  rotuloNome: 'Nome completo',
  placeholderNome: 'Como você assina seu trabalho',
  rotuloEmail: 'E-mail',
  /** O e-mail vem do provedor e não se edita — ver o schema. */
  notaEmail: 'Este e-mail vem do provedor e identifica sua conta.',

  /** Modo "informe": o provedor não devolveu endereço nenhum. */
  subtituloSemEmail: 'Trouxemos seu nome do provedor. O e-mail não veio com ele.',
  placeholderEmail: 'voce@exemplo.com',
  notaEmailPedido:
    'Enviaremos um link de confirmação. É por este endereço que chegam os avisos de prazo e a recuperação de acesso.',

  aceiteAntes: 'Li e aceito os ',
  aceiteTermos: 'Termos de uso',
  aceiteEntre: ' e a ',
  aceitePrivacidade: 'Política de privacidade',
  aceiteDepois: ', incluindo o tratamento dos meus dados conforme a LGPD.',

  enviar: 'Continuar',
  enviando: 'Confirmando…',

  erroNomeVazio: 'Informe seu nome completo.',
  erroAceite: 'É preciso aceitar os Termos e a Política de privacidade.',
  erroEmailVazio: 'Informe seu e-mail.',
  erroEmailInvalido: 'Informe um e-mail em formato válido.',
  /**
   * O linking automático do Supabase é ancorado em e-mail — e uma conta que
   * nasceu sem endereço não deu a ele por onde agir. Então esta colisão só
   * aparece agora, e a saída é entrar pelo provedor de origem.
   */
  bannerEmailEmUso: {
    titulo: 'Esse e-mail já tem conta na Dissona',
    texto:
      'O e-mail identifica a conta. Entre pelo provedor que você usou da primeira vez — ou por e-mail e senha, se foi assim que começou.',
    acao: 'Ir para o login',
  },

  /** A única saída da tela, para quem decidir não aceitar. */
  desistir: 'Sair',
  notaDesistir: 'Se preferir não aceitar, saia — a conta fica sem acesso e você pode excluí-la.',
} as const;

/**
 * Tela 1.4 — seleção de perfil. **Derivada**, não literal.
 *
 * Esta tela não existe em nenhum dos três protótipos. O do Curador diz isso na
 * própria anotação: *"Sem onboarding de artista e sem seleção de perfil neste
 * ambiente"*, e o Design System §3.5 confirma que ela não foi construída. Mas
 * ela é exigida por RF-006, é o destino de quem tem conta e nenhum papel, e a
 * copy da verificação do curador a promete — *"depois de confirmar, você
 * escolhe seus papéis na plataforma"*.
 *
 * Então o texto aqui é derivado do PRD 1.4, e a forma vem do Design System:
 * card selecionável (§2.4.2) na moldura de autenticação (§3.3). As descrições
 * de cada papel reaproveitam as promessas que os dois logins já fazem, para a
 * pessoa reconhecer o que escolheu quando chegar do outro lado.
 */
export const SELECAO_DE_PERFIL = {
  overline: 'Primeiro acesso',
  titulo: 'Como você usa a Dissona?',
  subtitulo: 'Escolha por onde começar. Os papéis se acumulam.',

  artistaTitulo: 'Sou artista',
  artistaTexto: 'Quero enviar minhas faixas e receber leitura de curadores.',
  curadorTitulo: 'Sou curador',
  curadorTexto: 'Quero avaliar faixas com método e ser remunerado por isso.',

  /** A nota que o PRD 1.4 pede visível: a escolha não é definitiva. */
  nota: 'Você pode ativar o outro papel depois, em Conta e configurações — sem criar outra conta.',

  /** O que o curador vê antes de escolher, porque o caminho dele é mais longo. */
  notaCurador:
    'O cadastro de curador tem oito perguntas curtas, e você pode retomar de onde parou.',

  enviar: 'Continuar',
  enviando: 'Preparando…',
  erroSemEscolha: 'Escolha um dos dois para continuar.',
} as const;

/**
 * Tela 1.5 — onboarding, tour de 4 passos.
 *
 * O conteúdo do **artista** é literal do protótipo, incluindo as micro-notas de
 * cada passo. O do **curador** e o do **admin** são derivados: nenhum dos dois
 * existe no protótipo, e o PRD 1.5 dá apenas os títulos dos quatro passos do
 * curador (Fila · Avaliação · Remuneração · Classes) e diz que o do admin é
 * "versão enxuta".
 *
 * Os textos derivados foram escritos a partir do que as telas daqueles
 * ambientes de fato fazem — o prazo de 72h, o gate de escuta de 60%, a escala
 * por classe, a matriz de permissões — e não de promessas novas. Um onboarding
 * que promete o que o produto não faz é pior que nenhum.
 */
export const ONBOARDING = {
  pular: 'Pular',
  passoDe: (atual: number, total: number) => `Passo ${atual} de ${total}`,
  avancar: 'Avançar',
  finalizar: 'Finalizar',
  voltar: 'Voltar',
  nota: 'Você pode rever isso depois, pelo menu de ajuda.',
  rotuloDoPasso: (numero: number) => `Passo ${numero}`,

  /**
   * O painel lateral da tela 1.5.
   *
   * É o mesmo componente do aside da 1.1, com copy própria: aqui o título é
   * "Como a Dissona funciona" (sem overline), os textos são os curtos, e não há
   * a nota de LGPD — o painel termina no quarto passo. O onboarding abria sem
   * aside nenhum, o que deixava metade da tela vazia num layout de duas
   * colunas.
   */
  comoFunciona: {
    titulo: 'Como a Dissona funciona',
    passos: [
      {
        numero: '01',
        titulo: 'Envie sua música',
        texto: 'Uma faixa por envio. Quantos curadores couberem no saldo.',
      },
      {
        numero: '02',
        titulo: 'Receba leitura real',
        texto: 'Até 11 critérios, nota decimal, texto assinado.',
      },
      {
        numero: '03',
        titulo: 'Acompanhe sua evolução',
        texto: 'Relatórios que comparam faixa a faixa.',
      },
      {
        numero: '04',
        titulo: 'Circule mais longe',
        texto: 'Playlist, post ou matéria, a partir do parecer.',
      },
    ],
  },

  artista: [
    {
      titulo: 'Envie sua música',
      texto:
        'Uma faixa por envio. O curador ouve do início ao fim antes de escrever qualquer coisa. A escuta é medida: sem ela, não sai devolutiva.',
      micro:
        'Aceita WAV e MP3 até 50 MB. Você escolhe quantos curadores quiser: o limite é o seu saldo de Claves.',
    },
    {
      titulo: 'Receba leitura real',
      texto:
        'Até 11 critérios, cada um com nota decimal e um parágrafo obrigatório. Quem escreve assina e responde pela calibração.',
      micro: 'Prazo de sete dias. Passou disso, a Clave volta para você.',
    },
    {
      titulo: 'Acompanhe sua evolução',
      texto:
        'A cada devolutiva, um relatório cruza as notas e os textos das suas faixas. Você vê o que melhorou e o que continua travado.',
      micro: 'Comparação por critério, faixa a faixa, ao longo do tempo.',
    },
    {
      titulo: 'Circule mais longe',
      texto:
        'Quando uma faixa convence, o curador pode levá-la adiante: playlist, post ou matéria. Quem abre a porta é o parecer.',
      micro: 'Todo compartilhamento fica registrado no histórico da faixa.',
    },
  ],

  curador: [
    {
      titulo: 'Sua fila',
      texto:
        'As faixas que os artistas escolheram você para ouvir chegam aqui, ordenadas por urgência. Você tem 72 horas para responder com repasse cheio.',
      micro: 'Sem resposta em sete dias, a Clave volta para o artista e a faixa sai da sua fila.',
    },
    {
      titulo: 'A avaliação',
      texto:
        'Nota por critério, de 0 a 5 com uma casa decimal, mais a nota subjetiva e o feedback escrito. Cinco critérios são obrigatórios; os onze rendem mais.',
      micro: 'A escuta é medida, e a avaliação só é aceita a partir de 60% da faixa ouvidos.',
    },
    {
      titulo: 'Sua remuneração',
      texto:
        'Você recebe um percentual do que o artista pagou. O piso é da sua classe dentro do prazo, e justificar as notas, escrever um feedback longo e compartilhar a faixa aumentam o valor.',
      micro: 'A conta aparece aberta na tela antes de você concluir a avaliação.',
    },
    {
      titulo: 'As classes',
      texto:
        'Bronze é a entrada. Prata vem de credenciais comprovadas, com aprovação da equipe. Ouro não se pede: vem por convite ou por desempenho na plataforma.',
      micro: 'A classe define o seu piso de remuneração e o selo que o artista vê ao escolher.',
    },
  ],

  admin: [
    {
      titulo: 'O painel',
      texto:
        'Os indicadores da plataforma em uma tela: contas, curadorias em andamento, prazos em risco e o caixa do período.',
      micro: 'Cada bloco leva ao módulo que o originou.',
    },
    {
      titulo: 'Gestão',
      texto:
        'Curadores e artistas, com aprovação de Prata, decisão de Ouro e bloqueio. E os pacotes de Claves que o artista compra.',
      micro: 'Toda decisão de classe e todo bloqueio ficam registrados com motivo.',
    },
    {
      titulo: 'Operação',
      texto:
        'Financeiro da plataforma, com o rateio entre repasse e comissão, e a moderação por denúncia.',
      micro: 'O extrato de Claves é append-only: o saldo é derivado dele, nunca corrigido à mão.',
    },
    {
      titulo: 'Sua equipe',
      texto:
        'Contas administrativas existem só por convite, e o papel de cada integrante define o que ele alcança no painel.',
      micro: 'Só o Administrador gere equipe e papéis.',
    },
  ],
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

/**
 * Navegação dos três ambientes, **literal** da sidebar de cada protótipo.
 *
 * Os grupos não são os mesmos nos três: o artista tem "Minha música" e
 * "Curadoria"; o curador tem "Avaliações" e "Desempenho"; o admin tem "Gestão"
 * e "Operação". O código aplicava os grupos do artista também ao curador, e
 * trocava rótulos por sinônimos ("Minhas músicas" por "Minhas faixas",
 * "Escolher curadores" por "Curadores"). Aqui eles voltam a ser o que o
 * cliente validou.
 *
 * O que o protótipo **não** desenha também não aparece: "Notificações"
 * (módulos 10 e 18, R5) e "Meu cadastro" saíram da sidebar. O 12.6 continua
 * alcançável pela aba Perfil de Conta, que já leva a ele.
 */
export const NAVEGACAO_DO_ARTISTA = {
  inicio: 'Início',
  grupoMinhaMusica: 'Minha música',
  enviar: 'Enviar faixa',
  minhasFaixas: 'Minhas faixas',
  devolutivas: 'Devolutivas',
  grupoCuradoria: 'Curadoria',
  curadores: 'Curadores',
  grupoConta: 'Conta',
  perfil: 'Perfil',
  carteira: 'Carteira',
  configuracoes: 'Configurações',
} as const;

export const NAVEGACAO_DO_CURADOR = {
  inicio: 'Início',
  grupoAvaliacoes: 'Avaliações',
  fila: 'Fila',
  notas: 'Notas e feedback',
  /**
   * "Notas e feedback" é item de sidebar no protótipo e lá abre um placeholder.
   * Aqui a tela existe — o que não existe é um endereço para ela sem uma faixa
   * escolhida, porque a avaliação é sempre de um envio.
   */
  motivoNotas: 'Abre a partir de uma faixa da fila',
  grupoDesempenho: 'Desempenho',
  metricas: 'Métricas',
  financeiro: 'Financeiro',
  grupoConta: 'Conta',
  conta: 'Conta e configurações',
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

// ---------------------------------------------------------------------------
// Perfil do artista (7.1) — protótipo do Artista, tela "Editar cadastro"
// ---------------------------------------------------------------------------

/**
 * Catálogo de gêneros do **artista** — o mesmo do curador.
 *
 * O protótipo do artista tem onze e o do curador doze ("Pagode" só no
 * curador). A R3 faz matching de gênero entre a faixa e o que o curador
 * declara receber, e vocabulários diferentes deixariam "Pagode" sem par
 * possível. Adotado um catálogo só, com "Pagode" (2026-09-16, registrado em
 * [07-pendencias](docs/prd/07-pendencias-e-divergencias.md)); um teste
 * garante que as duas listas não voltem a divergir.
 *
 * A mesma lista alimenta o passo 2 do envio (módulo 3), que é onde o protótipo
 * do artista a usa pela segunda vez.
 */
export const GENEROS_DO_ARTISTA = [
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
] as const;

/**
 * 7.1 · a **vitrine** do perfil — a tela "Perfil" do protótipo.
 *
 * É a primeira das duas telas do módulo: avatar, nome, `@handle · cidade`,
 * gêneros, bio, as três estatísticas e "Suas faixas". O botão leva à segunda,
 * "Editar cadastro" (`ARTISTA_PERFIL`), que era a única implementada e ocupava
 * o endereço desta.
 */
export const ARTISTA_VITRINE = {
  titulo: 'Perfil',
  editar: 'Editar cadastro',
  bioVazia: 'Sem bio ainda. Duas linhas sobre o seu trabalho ajudam o curador a te ouvir melhor.',

  estatisticas: {
    faixas: 'Faixas',
    faixasApoio: 'Enviadas para curadoria',
    leituras: 'Leituras',
    leiturasApoio: 'Curadorias concluídas',
    indicacoes: 'Indicações',
    indicacoesApoio: 'Compartilhadas por curadores',
  },

  suasFaixas: 'Suas faixas',
  verTodas: 'Ver todas',
  /** O catálogo é o módulo 6, da R4 — o botão existe e diz por que não abre. */
  verTodasPendente: 'O catálogo completo entra na Release 4',

  /** `trackData` do protótipo, mais o estado que só o produto tem. */
  status: {
    sem_envio: 'Sem envio',
    em_analise: 'Em análise',
    lida: 'Lida',
    lida_por: (quantos: number) => `Lida por ${quantos}`,
  },

  vazioTitulo: 'Você ainda não enviou nenhuma faixa',
  vazioDescricao: 'A primeira devolutiva começa com um envio.',
  vazioAcao: 'Enviar música',
} as const;

export const ARTISTA_PERFIL = {
  titulo: 'Editar cadastro',
  /** O nome do primeiro painel, para não repetir o `<h1>` da rota. */
  tituloDoPainel: 'Seus dados',
  subtitulo: 'Curadores veem essas informações antes de ouvir você.',

  /**
   * Foto de perfil. Os textos são os do protótipo — "Trocar foto" e a dica com
   * o tamanho mínimo, que é a única linha que declara o formato aceito.
   */
  trocarFoto: 'Trocar foto',
  fotoHint: 'JPG ou PNG, a partir de 400×400. Aparece nas suas faixas e no perfil.',
  fotoEnviando: 'Enviando a foto…',
  fotoEnviada: 'Foto enviada.',
  erroFotoTipo: 'A foto precisa ser JPG ou PNG.',
  erroFotoTamanho: 'A foto passa de 2 MB.',
  erroFotoAusente: 'Não encontramos a foto enviada. Escolha de novo.',
  erroFotoAlheia: 'Esse arquivo não é seu.',

  rotuloNomeExibicao: 'Nome artístico',
  rotuloCidade: 'Cidade',
  rotuloHandle: 'Usuário',
  auxiliarHandle: 'Letras minúsculas, números e _ · de 3 a 30 caracteres',
  rotuloBio: 'Bio',
  rotuloGeneros: 'Gêneros',
  sufixoGeneros: '· até 3',
  rotuloLinks: 'Links e redes',
  rotuloInstagram: 'Instagram',
  rotuloSpotify: 'Spotify',
  rotuloYoutube: 'YouTube',
  rotuloSite: 'Site',

  /**
   * Os exemplos que o protótipo põe em cada campo de link.
   *
   * Não são decoração: `esquemaLink` aceita `open.spotify.com/artist/…` sem
   * `https://`, e é o exemplo que ensina isso — sem ele a pessoa descobre a
   * forma aceita por tentativa e erro, com a mensagem de erro como professora.
   */
  exemploInstagram: '@seuperfil',
  exemploSpotify: 'open.spotify.com/artist/…',
  exemploYoutube: 'youtube.com/@seucanal',
  exemploSite: 'seusite.com.br',

  salvar: 'Salvar alterações',
  cancelar: 'Cancelar',
  nota: 'Dados sensíveis, como e-mail e senha, ficam em Configurações.',

  contagemBio: (usados: number, total: number) => `${usados}/${total}`,
  contagemGeneros: (quantos: number, maximo: number) =>
    quantos === 0
      ? `Escolha até ${maximo}`
      : quantos === 1
        ? `1 de ${maximo} escolhido`
        : `${quantos} de ${maximo} escolhidos`,

  salvo: 'Perfil atualizado.',

  erroNomeExibicaoLongo: 'O nome artístico passa de 80 caracteres.',
  erroCidadeLonga: 'A cidade passa de 80 caracteres.',
  erroHandleFormato: 'Use de 3 a 30 caracteres, só letras minúsculas, números e _.',
  erroHandleEmUso: 'Esse usuário já está em uso.',
  erroBioLonga: 'A bio passa de 280 caracteres.',
  erroGenerosDemais: 'Escolha no máximo 3 gêneros.',
  erroGeneroDesconhecido: 'Gênero fora da lista.',
  erroLinkInvalido: 'Link inválido. Use um endereço como site.com/voce.',
  erroLinkComEspaco: 'O link não pode ter espaço.',
} as const;

// ---------------------------------------------------------------------------
// Carteira e Claves (5, 5.3) — protótipo do Artista
// ---------------------------------------------------------------------------

/**
 * O card de saldo no pé da sidebar do artista.
 *
 * É overline de navegação, e não a coluna "Saldo" do extrato nem o título
 * "Saldo disponível" da Carteira — três lugares onde a palavra aparece com
 * pesos diferentes.
 */
export const SALDO_NA_NAVEGACAO = {
  rotulo: 'Saldo',
} as const;

export const CARTEIRA = {
  saldoTitulo: 'Saldo disponível',
  saldoUnidade: 'Claves',
  /** `caSaldoReais` — o valor da Clave vem de `configuracao`, nunca daqui. */
  saldoNota: (emReais: string, valorDaClave: string) =>
    `${emReais} em crédito. Uma Clave equivale a ${valorDaClave}.`,

  comprometidas: 'Comprometidas em análise',
  devolvidas: 'Devolvidas por falta de resposta',

  comprar: 'Comprar Claves',
  verExtrato: 'Ver extrato',

  resumo: {
    adquiridas: { rotulo: 'Adquiridas', descricao: 'Compradas em pacotes até aqui' },
    usadas: { rotulo: 'Usadas', descricao: 'Gastas em envios para curadores' },
    devolvidas: { rotulo: 'Devolvidas', descricao: 'Voltaram por falta de resposta' },
  },

  ultimasTitulo: 'Últimas movimentações',
  verTudo: 'Ver tudo',

  vazioTitulo: 'Nenhuma movimentação ainda',
  vazioDescricao: 'Compre Claves para enviar sua primeira faixa para curadoria.',

  // --------------------------------------------------------- extrato (5.3) --
  extratoTitulo: 'Extrato',
  voltarParaCarteira: 'Voltar para a carteira',

  colunas: {
    data: 'Data',
    origem: 'Origem',
    tipo: 'Tipo',
    claves: 'Claves',
    saldo: 'Saldo',
  },

  filtros: {
    todas: 'Todas',
    adquiridas: 'Adquiridas',
    usadas: 'Usadas',
    devolvidas: 'Devolvidas',
  },
  filtrosRotulo: 'Tipo de movimentação',

  /** Estado vazio **por recorte** — há lançamentos, mas nenhum neste filtro. */
  vazioPorFiltroTitulo: 'Nada nesse filtro',
  vazioPorFiltroDescricao: 'Troque o tipo de movimentação para ver o restante.',

  notaDevolucao:
    'Quando um curador não responde em 7 dias, a Clave volta para a sua carteira e aparece aqui como devolvida.',

  /** Rótulo de `tipo_lancamento_clave` na coluna "Tipo". */
  tipos: {
    compra: 'Adquiridas',
    consumo: 'Usadas',
    devolucao: 'Devolvidas',
    estorno: 'Estornadas',
    ajuste: 'Ajuste',
  },
} as const;

// ---------------------------------------------------------------------------
// Envio de música (3) — protótipo do Artista, wizard de 3 passos
// ---------------------------------------------------------------------------

export const ENVIAR = {
  passos: ['Envio da faixa', 'Contexto', 'Revisar'] as const,
  passoDe: (atual: number, total: number) => `Passo ${atual} de ${total}`,

  herois: [
    'Sua faixa vai ser ouvida por quem entende.',
    'Diga o que você quer descobrir com essa faixa.',
    'Última olhada antes de soltar.',
  ] as const,

  // ------------------------------------------------------ passo 1 ---------
  colarLink: 'Colar link',
  colarLinkApoio: 'Spotify ou YouTube',
  detectar: 'Detectar faixa',
  detectando: 'Procurando os dados da faixa',
  faixaEncontrada: 'Faixa encontrada',
  corrigirDados: 'Corrigir dados',
  /** Sem detecção, o protótipo abre o preenchimento manual. */
  naoDetectada: 'Não encontramos a faixa por esse link. Preencha os dados abaixo.',
  capaDetectada: (titulo: string) => `Capa de ${titulo}`,
  erroLinkVazio: 'Cole o link do Spotify ou do YouTube.',

  enviarArquivo: 'Enviar arquivo',
  enviarArquivoApoio: 'Upload de mp3 ou wav',
  /**
   * O limite vem de `configuracao.upload.tamanho_max_mb`, nunca embutido. O
   * protótipo escreve "até 30 MB" aqui e "até 50 MB" no onboarding — a
   * configuração diz 50, e a divergência está em 07-pendências.
   */
  dropzone: (tamanhoMaxMb: number) => `mp3 ou wav até ${tamanhoMaxMb} MB`,
  /**
   * O cartão "Faixa" do passo 2 — `enFaixaTitulo` e `enFaixaInfo`.
   *
   * O passo 2 pergunta sobre uma faixa que a pessoa preencheu no passo
   * anterior, e não a mostrava: quem volta ao envio dias depois respondia "o
   * que o curador precisa saber?" sem ver de qual faixa se trata.
   */
  rotuloFaixa: 'Faixa',
  faixaInedita: (data: string) => `inédita · ${data}`,
  faixaLancada: (data: string) => `lançada em ${data}`,
  faixaSemData: 'sem data definida',

  dropzoneVazia: 'Arraste o arquivo aqui, ou clique para escolher',
  /** O rótulo enquanto o arquivo está sobre a área — `enDropLabel` do protótipo. */
  dropzoneSoltar: 'Solte para carregar',
  arquivoEscolhido: (nome: string) => `Arquivo escolhido: ${nome}`,

  /**
   * O arquivo é **sempre** exigido, inclusive no caminho por link.
   *
   * `configuracao.escuta_exigida_quando_link` e `upload.armazenar_sempre` são
   * os dois `true`: o curador precisa de um áudio que o player consiga medir,
   * e um iframe de streaming não expõe posição de reprodução — sem o arquivo,
   * o gate de 60% fica inverificável e a avaliação perde a trava. O link vira
   * fonte de metadado. Divergência registrada em 07-pendências.
   */
  arquivoSempreNecessario:
    'O arquivo é necessário mesmo com o link: é ele que o curador ouve, e é o que permite medir a escuta.',

  /** Nome do bloco de 3.1/3.2 — "Detalhes". Não repete o rótulo do campo de
      título, senão o painel e o campo disputam o mesmo nome acessível. */
  detalhesTitulo: 'Detalhes da faixa',
  capaEnviar: 'Enviar capa',
  capaTrocar: 'Trocar capa',
  rotuloTitulo: 'Título da faixa',
  rotuloEstilo: 'Estilo predominante',
  perguntaLancada: 'A faixa já foi lançada?',
  lancadaSim: 'Sim',
  lancadaNao: 'Ainda não',
  /** O rótulo da data muda conforme o caminho e a resposta — é do protótipo. */
  rotuloData: (lancada: boolean | null) =>
    lancada === true ? 'Data de lançamento' : 'Previsão de lançamento',
  rotuloSpotify: 'Spotify',
  rotuloYoutube: 'YouTube',

  // ------------------------------------------------------ passo 2 ---------
  rotuloGenero: 'Gênero da faixa',
  rotuloContexto: 'O que o curador precisa saber?',
  /** Obrigatório por RF-038 — ver o cabeçalho de `esquemaContexto`. */
  contextoApoio: 'Obrigatório. É o que direciona a escuta do curador.',
  contagemContexto: (usados: number) => `${usados} caracteres`,

  // ------------------------------------------------------ passo 3 ---------
  resumoFaixa: 'Faixa',
  resumoFonte: {
    arquivo: (nome: string) => `Arquivo enviado: ${nome}`,
    link: 'Link detectado no streaming',
    manual: 'Dados preenchidos por você',
  },
  resumoContexto: 'O que o curador precisa saber',
  avisoSelecao: (saldo: string) =>
    `A escolha dos curadores vem em seguida. Não existe limite por faixa: o teto é o seu saldo, hoje ${saldo}, e as Claves só saem quando você confirma a seleção.`,
  enviarParaCuradoria: 'Enviar para curadoria',

  // --------------------------------------------------- confirmação --------
  /**
   * "Seu envio chegou", e não "Sua submissão chegou".
   *
   * É a **única** divergência em que o protótipo não vence: a terminologia
   * decidida é "Envios", nunca "Submissões" (PRD §9, arquitetura §8), e o
   * guia de testes manda corrigir. O protótipo erra em dois lugares — esta
   * frase e o título do cabeçalho —, e os dois foram corrigidos.
   */
  confirmacaoTitulo: 'Seu envio chegou.',
  confirmacaoTexto:
    'Em breve alguém vai ouvir com atenção. Avisamos assim que a primeira leitura estiver pronta.',
  acompanharStatus: 'Acompanhar status',
  voltarParaInicio: 'Voltar para o início',
  enviarOutra: 'Enviar outra faixa',

  // -------------------------------------------------------- ações ---------
  continuar: 'Continuar',
  voltar: 'Voltar',
  salvando: 'Salvando…',

  // -------------------------------------------------------- erros ---------
  erroTituloVazio: 'Informe o título da faixa.',
  erroTituloLongo: 'O título passa de 160 caracteres.',
  erroEstiloLongo: 'O estilo passa de 80 caracteres.',
  erroDataInvalida: 'Informe a data no formato dia/mês/ano.',
  erroDataObrigatoria: 'A faixa foi lançada — informe a data.',
  erroArquivoAusente: 'Escolha o arquivo de áudio da faixa.',
  erroArquivoFormato: (formatos: readonly string[]) =>
    `Formato não aceito. Envie ${formatos.join(' ou ').toUpperCase()}.`,
  erroArquivoTamanho: (tamanhoMaxMb: number) => `O arquivo passa de ${tamanhoMaxMb} MB.`,
  erroGeneroInvalido: 'Escolha um gênero da lista.',
  erroContextoVazio: 'Escreva o que o curador precisa saber.',
  erroContextoLongo: 'O texto passa de 1000 caracteres.',
  erroLinkInvalido: 'Link inválido. Use um endereço como open.spotify.com/track/…',
  erroLinkComEspaco: 'O link não pode ter espaço.',
  erroLinkNaoSuportado: 'Por ora detectamos só links do Spotify e do YouTube.',
  erroFaixaEmCuradoria: 'Esta faixa já foi enviada para curadoria e não pode mais ser alterada.',
} as const;

// ---------------------------------------------------------------------------
// Seleção de curadores — PLACEHOLDER da R2 (a tela real, módulo 4, é da R3)
// ---------------------------------------------------------------------------

/**
 * O protótipo **não tem** esta tela: `enView:'selecao'` existe no estado dele
 * mas não tem bloco de render — é um beco sem saída, e o guia de testes diz que
 * a seleção "aparece como placeholder, entra na R3".
 *
 * Estes textos são, portanto, **derivados**. Foram escritos para dizer o mínimo
 * verdadeiro: quem recebe, quanto custa e que é aqui que as Claves saem.
 */
export const SELECAO = {
  titulo: 'Escolha quem vai ouvir',
  subtitulo:
    'Versão simplificada. A busca por gênero, o ranking e o detalhe do curador chegam na próxima release.',

  totalDaLeitura: 'Total da seleção',
  saldoApos: (saldo: string) => `Saldo depois da confirmação: ${saldo}`,

  servicoObrigatorio: 'Feedback escrito · sempre incluso',
  confirmar: 'Confirmar e enviar',
  voltar: 'Voltar para a revisão',

  vazioTitulo: 'Nenhum curador disponível agora',
  vazioDescricao:
    'Nenhum curador aprovado tem o serviço de feedback ativo. Sem ele não há devolutiva, e o envio não pode ser criado.',

  erroSelecaoVazia: 'Escolha ao menos um curador.',
  erroSaldo: 'Saldo insuficiente para esta seleção.',
  /**
   * O CTA que acompanha o bloqueio por saldo. Ele só passou a existir quando a
   * 5.1 ganhou endereço — antes, mandar a pessoa "comprar Claves" a deixaria
   * numa Carteira com o botão desabilitado, que é pior que não oferecer nada.
   */
  erroSaldoAcao: 'Comprar Claves',
  erroCuradorInvalido: 'Um dos curadores escolhidos não está disponível.',
  erroSemFeedback: 'Um dos curadores não oferece o feedback escrito.',
  erroFaixaInvalida: 'Esta faixa não está mais aguardando seleção.',
} as const;

// ---------------------------------------------------------------------------
// Status de envio (3.3) — versão mínima da R2
// ---------------------------------------------------------------------------

/**
 * O módulo 3.3 está alocado na **R3** no PRD, com barras animadas por etapa e
 * detalhe do curador. Esta é a versão mínima, somente leitura, que existe para
 * fechar o cenário B7 ("Acompanhar status") sem antecipar horas da R3.
 *
 * O botão "Simular avanço" do protótipo é recurso **do protótipo**, não do
 * produto, e por isso não existe aqui.
 */
export const STATUS_DO_ENVIO = {
  titulo: 'Status do envio',
  colunas: {
    curador: 'Curador',
    andamento: 'Andamento',
    prazo: 'Prazo',
    etapa: 'Etapa',
  },
  /** Os quatro estados que `envio.situacao` assume no caminho feliz. */
  etapas: {
    recebeu: 'Recebeu',
    ouviu: 'Ouviu',
    avaliando: 'Avaliando',
    pronto: 'Pronto',
    devolvido: 'Devolvido',
    cancelado: 'Cancelado',
  },
  vazioTitulo: 'Nenhum curador ainda',
  vazioDescricao: 'Confirme a seleção para a faixa entrar na fila de alguém.',
  nota: 'Cada curador tem 72h para responder com repasse cheio. Sem resposta em 7 dias, a Clave volta para a sua carteira e aparece no extrato.',
} as const;

// ---------------------------------------------------------------------------
// Início dos três ambientes (2, 24 e o "Painel do curador")
// ---------------------------------------------------------------------------

/**
 * Os três "Início" são placeholder **no próprio protótipo**.
 *
 * O bloco `isModulo` desenha um card com o overline "Próximo release", e o
 * título e o texto saem do mapa `modules`/`modulos` do view-model — não do
 * markup. É de lá que vêm as strings abaixo, verbatim.
 *
 * `titulo` e `sublegenda` são do cabeçalho (`appTitle`/`appSub`); `vazio` e
 * `descricao` são do card. O `vazio` nomeia a release porque é o padrão desta
 * aplicação para tela de módulo futuro — o protótipo não numera releases.
 *
 * ⚠️ O texto do card **não** promete nada que já exista: a versão anterior
 * dizia "a fila de avaliações entra na Release 2" numa tela publicada depois
 * de a fila entrar no ar.
 */
export const PAINEIS = {
  artista: {
    titulo: 'Painel do artista',
    sublegenda: 'Suas faixas, prazos e devolutivas.',
    vazio: 'O painel do artista entra na Release 4',
    descricao: 'Faixas em análise, devolutivas recentes, saldo de Claves e próximos prazos.',
  },
  curador: {
    titulo: 'Painel do curador',
    sublegenda: 'Suas leituras, prazos e ganhos do período.',
    vazio: 'O painel do curador entra na Release 4',
    descricao: 'Convites abertos, leituras em andamento, prazos e Claves do período.',
  },
  admin: {
    titulo: 'Painel administrativo',
    sublegenda: 'Visão geral da plataforma.',
    vazio: 'O painel administrativo entra na Release 4',
    descricao:
      'Volume de envios, devolutivas em atraso, receita do período e alertas de moderação.',
  },
} as const;

// ---------------------------------------------------------------------------
// Fila de avaliações (13, 13.1) — protótipo do Curador
// ---------------------------------------------------------------------------

export const FILA = {
  titulo: 'Fila de avaliações',

  colunas: {
    musica: 'Música',
    genero: 'Gênero',
    servico: 'Serviço',
    prazo: 'Prazo',
    status: 'Status',
  },

  /**
   * `filaResumo` do protótipo: "N faixas na fila · M com prazo curto".
   *
   * O segundo trecho só aparece quando há algum — é o `(urgentes ? … : '')` do
   * protótipo. Concatenar sempre fazia uma fila tranquila anunciar "· 0 com
   * prazo curto", que é ruído com cara de alerta.
   */
  resumo: (naFila: number, curtos: number) =>
    `${naFila} ${naFila === 1 ? 'faixa' : 'faixas'} na fila` +
    (curtos > 0 ? ` · ${curtos} com prazo curto` : ''),

  filtros: {
    todas: 'Todas',
    nova: 'Nova',
    em_escuta: 'Em escuta',
    atrasada: 'Atrasada',
  },
  filtrosRotulo: 'Status da faixa',
  generoRotulo: 'Gênero',
  generoTodos: 'Todos os gêneros',

  /** Formato de `filaPrazo`, literal do protótipo. */
  prazoVencidoDias: (dias: number) => `Vencido há ${dias}d`,
  prazoVencidoHoras: (horas: number) => `Vencido há ${horas}h`,
  prazoHoras: (horas: number) => `${horas}h`,
  prazoDias: (dias: number, horas: number) => `${dias}d ${horas}h`,

  vazioTitulo: 'Nada nesse recorte',
  vazioDescricao: 'Troque o status ou o gênero para ver outras faixas.',
  vazioFilaTitulo: 'Nenhuma faixa na sua fila',
  vazioFilaDescricao: 'Quando um artista escolher você, a faixa aparece aqui.',

  nota: 'Você tem 72h para responder com repasse cheio. Sem resposta em 7 dias, a Clave volta para o artista e a faixa sai da sua fila.',

  // ------------------------------------------------------- 13.1 ------------
  voltarParaFila: 'Voltar para a fila',
  /**
   * O rótulo do campo é "Enviada", e o valor é só o tempo — é o par
   * `Enviada / {{ fdEnviado }}` do protótipo.
   *
   * Antes o rótulo era "Faixa" e a palavra "Enviada" vinha dentro do valor, o
   * que ocupava o nome de um campo que o protótipo usa para outra coisa (o
   * formato da faixa, "Single · master final" — dado que o produto não guarda).
   */
  rotuloEnviada: 'Enviada',
  rotuloDuracao: 'Duração',
  rotuloStatus: 'Status',
  oQueOArtistaQuerSaber: 'O que o artista quer saber',
  semContexto: 'O artista não escreveu nada.',
  prazoRestante: 'Prazo restante',
  /** As duas notas condicionais do protótipo, conforme o prazo. */
  notaNoPrazo:
    'Responda dentro das 72h para receber o repasse cheio. Sem resposta em 7 dias, a Clave volta para o artista.',
  notaAtrasado: (dias: number) =>
    `Fora das 72h, o repasse cai. Em ${dias} ${dias === 1 ? 'dia' : 'dias'} sem resposta a Clave volta para o artista.`,
  rotuloServico: 'Serviço',
  totalDaLeitura: 'Total da leitura',
  iniciarAvaliacao: 'Iniciar avaliação',
  /** O envio saiu de `recebeu`/`ouviu` — outra aba, ou o job de 7 dias. */
  erroNaoEstaMaisNaFila:
    'Esta faixa não está mais disponível para avaliação. Volte para a fila e recarregue.',

  servicos: {
    feedback: 'Feedback escrito',
    playlist: 'Playlist',
    post: 'Post no Instagram',
    materia: 'Matéria',
    outro: 'Outra divulgação',
  },
} as const;

// ---------------------------------------------------------------------------
// Pacotes de Claves (5.1) e checkout (5.2) — protótipo do Artista
//
// A copy é a da tela `isPacotes`/`isCheckout` de `docs/R2/extraido/Artista.html`,
// palavra por palavra. O que **não** vem de lá são os números: o protótipo
// semeia `[[10, 100, 0], [30, 285, 5], [60, 540, 10], [100, 850, 15]]` em
// `caPacotesSeed()`, e aqui os pacotes vêm de `pacote_clave`, que é o que a
// tela 21 do admin edita. Duas listas do mesmo pacote é como o preço da
// vitrine passa a discordar do preço cobrado.
// ---------------------------------------------------------------------------

export const PACOTES = {
  titulo: 'Comprar Claves',
  chamada:
    'Quanto maior o pacote, menor o preço por Clave. O crédito não expira e vale para qualquer curador da plataforma.',
  voltarParaCarteira: 'Voltar para a carteira',

  unidade: 'Claves',
  escolher: 'Escolher',
  semDesconto: 'Sem desconto',
  /** `p.eyebrow` — o desconto **derivado do valor**, não a coluna. */
  comDesconto: (percentual: string) => `${percentual} de desconto`,
  /** `p.porClave`, com a economia só quando existe. */
  porClave: (preco: string) => `${preco} por Clave`,
  porClaveComEconomia: (preco: string, economia: string) =>
    `${preco} por Clave · economia de ${economia}`,

  /**
   * A nota de rodapé do protótipo, que ali dizia "Pagamento simulado neste
   * protótipo". Aqui ela só aparece quando o provedor **é** o simulado — em
   * produção com Asaas ela some, porque passaria a ser falsa.
   */
  notaSimulado: 'Pagamento simulado nesta versão. Nenhuma cobrança é feita.',

  vazioTitulo: 'Nenhum pacote disponível',
  vazioDescricao: 'Os pacotes voltam assim que a equipe reativar algum.',
} as const;

export const CHECKOUT = {
  titulo: 'Checkout',
  trocarDePacote: 'Trocar de pacote',

  meioRotulo: 'Forma de pagamento',
  meios: {
    cartao: 'Cartão',
    pix: 'Pix',
  },

  // ------------------------------------------------------------- cartão ----
  numero: 'Número do cartão',
  numeroDica: '0000 0000 0000 0000',
  nome: 'Nome impresso',
  nomeDica: 'Como está no cartão',
  validade: 'Validade',
  validadeDica: 'MM/AA',
  cvv: 'Código de segurança',
  cvvDica: '000',
  /**
   * O que a tela promete, e o que o código cumpre: os dados do cartão seguem
   * para o processador e não são gravados. Ver `modulos/claves/esquemas.ts`.
   */
  cartaoNota: 'Os dados do cartão vão direto para o processador de pagamento e não são guardados.',

  // ------------------------------------------------------ dados pessoais ---
  /** **Derivado.** O Asaas só gera cobrança com CPF, nos dois meios. */
  cpf: 'CPF',
  cpfDica: '000.000.000-00',
  cpfNota: 'Exigido pelo processador de pagamento para emitir a cobrança.',
  telefone: 'Telefone com DDD',
  telefoneDica: '(11) 90000-0000',
  cep: 'CEP do titular',
  cepDica: '00000-000',

  // ---------------------------------------------------------------- pix ----
  pixQr: 'QR PIX',
  pixTitulo: 'Pague com o código copia e cola',
  pixDescricao: 'O crédito entra na carteira assim que o banco confirma.',
  pixCopiar: 'Copiar código',
  pixCopiado: 'Código copiado',
  /** Antes de confirmar: o código nasce no provedor, depois do pedido. */
  pixPendente: 'O QR code e o código copia e cola aparecem depois de confirmar a compra.',
  pixAguardandoTitulo: 'Aguardando o Pix',
  pixAguardandoTexto:
    'Escaneie o QR code ou use o copia e cola no app do seu banco. Esta tela atualiza sozinha quando o pagamento cair.',
  pixQrAlt: 'QR code do Pix desta compra',
  pixCodigoRotulo: 'Código copia e cola',
  pixExpirado: 'Este Pix venceu sem pagamento. Nada foi cobrado; gere outro para tentar de novo.',

  // --------------------------------------------------------- simulação ----
  simularRotulo: 'Simular resultado',
  simulacoes: {
    aprovado: 'Aprovado',
    recusado: 'Recusado',
  },

  // ------------------------------------------------------------ resumo ----
  resumoTitulo: 'Resumo do pedido',
  quantidade: (claves: string) => `${claves} Claves`,
  desconto: 'Desconto do pacote',
  descontoValor: (valor: string, percentual: string) => `-${valor} (${percentual})`,
  total: 'Total',
  porClave: (preco: string) => `${preco} por Clave. O crédito não expira.`,
  confirmar: 'Confirmar compra',

  // ------------------------------------------------------------ estados ---
  processando: 'Processando o pagamento',

  aprovadoTitulo: 'Pagamento aprovado',
  aprovadoTexto: (claves: string, saldo: string) =>
    `${claves} Claves entraram na sua carteira. Novo saldo: ${saldo} Claves.`,
  irParaCarteira: 'Ir para a carteira',
  verNoExtrato: 'Ver no extrato',

  recusadoTitulo: 'Pagamento recusado',
  recusadoTexto: 'O banco não autorizou a cobrança.',
  recusadoApoio:
    'Nada foi debitado e o saldo continua o mesmo. Troque a forma de pagamento ou tente de novo.',
  tentarDeNovo: 'Tentar de novo',

  // --------------------------------------------------------------- erros ---
  erroCartaoNumero: 'Informe um número de cartão válido.',
  erroCartaoNome: 'Informe o nome impresso no cartão.',
  erroCartaoValidade: 'Informe a validade no formato MM/AA.',
  erroCartaoCvv: 'Informe o código de segurança.',
  erroCpf: 'Informe um CPF válido.',
  erroTelefone: 'Informe um telefone com DDD.',
  erroCep: 'Informe um CEP com 8 dígitos.',
  /**
   * Provedor de pagamento ausente. Não é "tente de novo": tentar de novo não
   * resolve nada enquanto o Asaas não estiver configurado.
   */
  erroIndisponivel: 'A compra está indisponível no momento. A equipe já foi avisada.',
  erroPacote: 'Este pacote saiu de circulação. Escolha outro.',
  erroGenerico: 'Não foi possível concluir a compra. Tente de novo em instantes.',
} as const;
