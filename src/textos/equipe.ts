/**
 * Copy de Conta e equipe — telas 27.1, 27.2, 27.3 e 27.4.
 *
 * Fonte: `docs/R2/extraido/Admin.html`. Arquivo próprio pelo mesmo motivo de
 * `curador.ts` e `conta.ts`, e reexportado por `prototipo.ts`.
 *
 * Os textos de credencial (alterar senha, alterar e-mail) **não** estão aqui:
 * são os mesmos de `conta.ts`, palavra por palavra nos três ambientes, e é o
 * `ModalDeCredencial` da fatia anterior que os usa. Duplicá-los daria duas
 * versões da frase "Pedimos a senha atual antes de trocar".
 */

export const EQUIPE = {
  abas: {
    dados: 'Dados pessoais',
    equipe: 'Equipe',
    papeis: 'Papéis e permissões',
  },
  /**
   * Rótulo do grupo de abas para leitor de tela — o protótipo não tem. Ver o
   * comentário de `CONTA.abasRotulo`.
   */
  abasRotulo: 'Seções de Conta e equipe',

  // ------------------------------------------------ 27.1 · dados pessoais ---
  dados: {
    rotuloNome: 'Nome',
    rotuloCargo: 'Cargo',
    placeholderCargo: 'Head de operações',
    rotuloEmail: 'E-mail corporativo',
    /**
     * O protótipo tem "Trocar foto" com a dica "JPG ou PNG, até 2 MB" e, ao
     * clicar, troca a dica por *"Upload de imagem entra no próximo release."* —
     * é o próprio protótipo declarando a pendência. Mantida como está.
     */
    trocarFoto: 'Trocar foto',
    fotoHint: 'JPG ou PNG, a partir de 400×400.',
    fotoEnviando: 'Enviando a foto…',
    fotoEnviada: 'Foto enviada.',
    erroFotoTipo: 'A foto precisa ser JPG ou PNG.',
    erroFotoTamanho: 'A foto passa de 2 MB.',
    erroFotoAusente: 'Não encontramos a foto enviada. Escolha de novo.',
    erroFotoAlheia: 'Esse arquivo não é seu.',
    senhaTitulo: 'Senha de acesso',
    /**
     * A frase completa do protótipo é *"Alterada em 12 de março de 2026. Trocar
     * e-mail ou senha pede sua senha atual."* — as duas metades, porque a
     * segunda é o que explica a reautenticação antes de ela acontecer.
     */
    senhaNota: (data: string) =>
      `Alterada em ${data}. Trocar e-mail ou senha pede sua senha atual.`,
    senhaNotaSemData: 'Trocar e-mail ou senha pede sua senha atual.',
    salvar: 'Salvar',
    salvando: 'Salvando…',
    salvo: 'Alterações salvas.',
    erroNomeVazio: 'Informe seu nome.',
    erroNomeLongo: 'O nome cabe em 120 caracteres.',
    erroCargoLongo: 'O cargo cabe em 80 caracteres.',
  },

  // -------------------------------------------------------- 27.2 · equipe ---
  equipe: {
    overline: 'Integrantes',
    resumo: (ativos: number, pendentes: number) =>
      `${ativos} com acesso ativo · ${pendentes} aguardando aceite`,
    convidar: 'Convidar membro',

    /**
     * Lista sem linha nenhuma.
     *
     * Na prática não acontece — quem abre a tela é membro, e a própria linha
     * está na lista. Mas o cabeçalho da grade renderiza mesmo com zero linhas,
     * e uma tabela com cabeçalho e nada embaixo parece defeito, não vazio. O
     * beta começa sem dados em toda lista, e esta não é exceção.
     */
    vazio: 'Nenhum integrante ainda.',
    vazioNota: 'Convide alguém para a equipe — o convite vale 7 dias.',

    colunaMembro: 'Membro',
    colunaEmail: 'E-mail',
    colunaPapel: 'Papel',
    colunaAcoes: 'Ações',
    colunaStatus: 'Status',

    /** Rótulo de `situacao_membro_admin`. Os quatro do enum da `0003d`. */
    situacao: {
      ativo: 'Ativo',
      inativo: 'Desativado',
      pendente: 'Convite pendente',
      expirado: 'Convite expirado',
    },

    /** A linha de convite não tem nome; o protótipo põe "Convite enviado". */
    tagConvite: 'Convite enviado',
    semCargo: 'Sem cargo definido',

    reenviar: 'Reenviar convite',
    reenviando: 'Reenviando…',
    desativar: 'Desativar',
    reativar: 'Reativar',
    aplicando: 'Aplicando…',
    voce: 'Você',

    nota: 'Contas administrativas existem só por convite. O acesso começa quando o convite é aceito.',

    /**
     * Aviso do resultado de cada ação de linha. O protótipo usa a mesma faixa
     * (`flash`) para os três, com o primeiro nome de quem foi alterado.
     */
    papelAtualizado: (nome: string) => `Papel de ${nome} atualizado.`,
    desativado: (nome: string) => `${nome} foi desativado.`,
    reativado: (nome: string) => `${nome} voltou a ter acesso.`,
    conviteReenviado: (email: string) => `Convite reenviado para ${email}.`,

    /**
     * **Divergência registrada.** No protótipo o `<select>` de papel salva no
     * próprio `change`. Aqui cada linha é um `<form>` com um botão "Aplicar":
     * é o que faz a linha funcionar sem JavaScript, dá lugar ao estado
     * "aplicando" — e evita a troca de papel acidental de quem rola a lista
     * com o teclado sobre o select, que é um acidente real desse padrão.
     */
    aplicarPapel: 'Aplicar',
  },

  // ------------------------------------------------------- 27.3 · convite ---
  convite: {
    overline: 'Equipe',
    titulo: 'Convidar membro',
    texto:
      'Enviamos um convite por e-mail. O acesso vale a partir do momento em que a pessoa aceita.',
    rotuloEmail: 'E-mail corporativo',
    placeholderEmail: 'nome@dissona.com.br',
    rotuloPapel: 'Papel',
    enviar: 'Enviar convite',
    enviando: 'Enviando…',
    cancelar: 'Cancelar',
    /** Depois do sucesso o diálogo não é cancelado, é fechado. */
    fechar: 'Fechar',

    sucesso: (email: string) => `Convite enviado para ${email}.`,
    /**
     * O protótipo não tem isto, e é **temporário**: com o SMTP embutido do
     * Supabase (~2 e-mails por hora), o e-mail é a parte mais frágil do fluxo.
     * O link aparece uma vez para quem convidou copiar e mandar por outro canal
     * se o e-mail não chegar. Sai quando houver provedor real
     * ([#10](docs/open-questions.md)).
     */
    linkTitulo: 'Link do convite',
    linkNota:
      'Enquanto o envio de e-mail está em configuração, copie este link e mande por outro canal se o convite não chegar. Ele vale 7 dias e aparece só agora.',
    jaTinhaConta:
      'Essa pessoa já tem conta na Dissona. O convite vale: ela entra com a senha que já usa e o link a leva ao aceite.',

    erroEmailVazio: 'Informe o e-mail de quem você quer convidar.',
    erroEmailInvalido: 'Informe um e-mail em formato válido.',
    erroPapelInvalido: 'Escolha o papel do novo integrante.',
    erroLimite:
      'Já enviamos e-mails demais na última hora. O convite ficou registrado — use o "Reenviar convite" na lista em alguns minutos.',
    erroSemPermissao: 'Só quem gere equipe convida integrantes.',
  },

  // -------------------------------------------------------- 27.4 · papéis ---
  papeis: {
    overline: 'Permissão',
    texto: 'O papel define o que cada integrante alcança no painel.',
    salvar: 'Salvar',
    salvando: 'Salvando…',
    salvo: 'Permissões atualizadas.',
    notaAdministrador: 'Administrador mantém acesso total, inclusive a equipe e papéis.',

    /** As quatro permissões da tela, com a descrição literal do protótipo. */
    linhas: [
      {
        modulo: 'gestao',
        rotulo: 'Gerir curadores e artistas',
        descricao: 'Aprovar, calibrar e suspender contas.',
      },
      {
        modulo: 'moderacao',
        rotulo: 'Moderação e antifraude',
        descricao: 'Denúncias, devolutivas contestadas e escuta suspeita.',
      },
      {
        modulo: 'financeiro',
        rotulo: 'Financeiro e repasses',
        descricao: 'Repasses a curadores, receita e notas fiscais.',
      },
      {
        modulo: 'equipe',
        rotulo: 'Gerir equipe e papéis',
        descricao: 'Convidar integrantes e mudar permissões.',
      },
    ] as const,

    /**
     * **Divergência registrada.** O protótipo tem **uma** caixa por célula, e a
     * tabela `permissao_admin` tem `pode_ler` **e** `pode_escrever` — a
     * granularidade adotada na divergência #7c. Uma caixa não expressa dois
     * booleanos: ou ela governaria só a leitura (e a escrita ficaria congelada
     * no seed para sempre), ou governaria as duas (e desligar/religar daria
     * escrita a quem só tinha leitura, sem ninguém pedir).
     *
     * Então a célula é um `<select>` de três níveis. O grid é o do protótipo; o
     * controle é o que a tabela exige. Ver
     * `docs/prd/07-pendencias-e-divergencias.md` §B.3.
     */
    niveis: {
      nenhum: 'Sem acesso',
      ler: 'Ver',
      escrever: 'Ver e editar',
    },
    /** `aria-label` da célula: papel + permissão, como o protótipo monta. */
    rotuloDaCelula: (papel: string, permissao: string) => `${papel} · ${permissao}`,
    rotuloTravado: (papel: string, permissao: string) =>
      `${papel} · ${permissao} · exclusivo do Administrador`,
    rotuloAdministrador: (permissao: string) =>
      `Administrador · ${permissao} · acesso total, não editável`,

    erroMatriz: 'Não foi possível ler a matriz enviada. Recarregue a página e tente de novo.',
    erroSemPermissao: 'Só o Administrador altera papéis e permissões.',
  },

  // ------------------------------------------------- aceite do convite -----
  /**
   * **Derivada.** O protótipo do admin não tem a tela de aceite — ele começa no
   * login. O fluxo existe no PRD (27.3, "Aceite de convite e definição de
   * senha") e a moldura é a das telas de autenticação (design-system §3.3).
   */
  aceite: {
    overline: 'Convite da equipe',
    titulo: 'Você foi convidado para a equipe Dissona',
    texto:
      'Defina uma senha para concluir o acesso. Contas administrativas existem só por convite.',
    rotuloSenha: 'Senha de acesso',
    placeholderSenha: '8+ caracteres, com número',
    rotuloConfirmar: 'Confirmar senha',
    placeholderConfirmar: 'Repita a senha',
    enviar: 'Concluir acesso',
    enviando: 'Concluindo…',

    tituloSemToken: 'Este link não traz um convite',
    textoSemToken:
      'O endereço veio sem o código do convite. Abra o link do e-mail exatamente como ele chegou.',

    tituloInvalido: 'Este convite não vale mais',
    textoInvalido:
      'Ele pode ter expirado, já ter sido usado ou pertencer a outro endereço de e-mail. Peça um novo convite a quem gere a equipe.',

    tituloSemSessao: 'Entre para aceitar o convite',
    textoSemSessao:
      'O convite vale para o e-mail que o recebeu. Entre com essa conta e abra o link de novo.',
    irAoLogin: 'Ir para o login administrativo',

    sucessoTitulo: 'Acesso concluído',
    sucessoTexto: 'Sua conta agora faz parte da equipe. O painel administrativo já está liberado.',
    irAoPainel: 'Ir para o painel',
  },
} as const;
