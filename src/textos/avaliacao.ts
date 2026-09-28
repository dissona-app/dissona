/**
 * Copy do módulo 14 — a avaliação em cinco etapas.
 *
 * Arquivo próprio pelo mesmo motivo de `curador.ts`: são cinco telas, onze
 * critérios, quatro modalidades de compartilhamento e a tabela de acréscimos,
 * e junto do resto empurrariam `prototipo.ts` para além de mil linhas. A fonte
 * é a mesma — `docs/R2/extraido/Curador.html`, bloco `isAv` e `avVM()` — e
 * `prototipo.ts` reexporta daqui.
 *
 * Notas de fidelidade, nos pontos em que o protótipo **não** foi copiado ao pé
 * da letra:
 *
 *  - O protótipo escreve "Curadora Prata", no feminino, porque a persona dele é
 *    a Marina. Aqui a classe aparece pelo `<SeloClasse>` sob o rótulo neutro
 *    "Sua classe": flexionar o cabeçalho pelo gênero de quem está logado é
 *    informação que a aplicação não tem.
 *  - Os números — 60% de escuta, 250 e 150 caracteres, 8 pontos de penalidade,
 *    os percentuais de acréscimo — **não** estão escritos aqui. Todos vêm de
 *    `configuracao` e entram como argumento, que é a regra do AGENTS.md sobre
 *    número de negócio. O protótipo os tem embutidos no texto; as funções
 *    abaixo os recebem.
 *  - A justificativa do protótipo é um único `<textarea>` que muda de assunto
 *    conforme o critério selecionado na lista. Aqui cada critério tem o seu, e
 *    por isso existe `justificativaDe`: um campo por item é o que permite
 *    preencher onze justificativas sem JavaScript, e o que dá a cada
 *    `<textarea>` um rótulo próprio para o leitor de tela.
 */

import type {
  ClasseCurador,
  GrupoCriterio,
  ModalidadeCompartilhamento,
} from '@/modulos/avaliacao/tipos';

export const AVALIAR = {
  /**
   * As **quatro** marcas do indicador, para **cinco** etapas.
   *
   * "Outras formas" (14.3) não ganha marca própria: o protótipo agrupa-a sob
   * Compartilhamento (`passoAtual = avStep >= 4 ? 3 : …`). Ver
   * `PASSO_NO_INDICADOR` em `modulos/avaliacao/tipos.ts`.
   */
  passos: ['Notas objetivas', 'Nota e feedback', 'Compartilhamento', 'Remuneração'] as const,

  salvarESair: 'Salvar e sair',
  voltar: 'Voltar',
  avancar: 'Avançar',
  /** O último "Avançar" muda de nome, porque o destino é a conta final. */
  verRemuneracao: 'Ver remuneração',
  voltarParaFila: 'Voltar para a fila',

  // ----------------------------------------------------------- 14 · notas ---
  tituloNotas: 'Notas por critério · 0 a 5 com uma casa decimal',

  /** `escuta_minima_percentual`, nunca o "60%" literal do protótipo. */
  escutaMedida: (minimo: number) =>
    `A escuta é medida. A avaliação só é aceita a partir de ${minimo}% da faixa ouvidos.`,

  /** `avResumoItens` — "N de M respondidos · K obrigatórios em aberto". */
  resumoDosItens: (respondidos: number, total: number, emAberto: number) =>
    `${respondidos} de ${total} respondidos · ${emAberto} obrigatórios em aberto`,

  criterioObrigatorio: 'obrig.',
  semNota: 'Sem nota',
  removerNota: 'Remover nota',

  justificarESugerir: 'Justificar e sugerir',
  justificativaDe: (criterio: string) => `Justificativa de ${criterio}`,
  justificativaPlaceholder:
    'Diga o que sustenta a nota e o que você faria diferente. Vale citar trecho e tempo da faixa.',
  justificativaValida: 'Justificativa válida para o acréscimo',
  justificativaDica: (minimo: number) =>
    `Opcional. A partir de ${minimo} caracteres rende acréscimo`,

  /**
   * O rodapé do painel de critérios.
   *
   * O protótipo escreve "Cinco critérios são obrigatórios" e "Os onze rendem
   * acréscimo". Os dois números são derivados: os obrigatórios vêm de
   * `configuracao.criterios_obrigatorios` e o total vem do catálogo `criterio`.
   */
  notaDosCriterios: (obrigatorios: number, total: number, minimoJustificativa: number) =>
    `${obrigatorios} critérios são obrigatórios. Os ${total} rendem acréscimo na remuneração, ` +
    `e a justificativa de ${minimoJustificativa} caracteres também.`,

  // ------------------------------------------------------ 14.1 · subjetiva ---
  resumoObjetivo: 'Suas notas objetivas',
  mediaDeCriterios: (quantos: number) =>
    `média de ${quantos} ${quantos === 1 ? 'critério' : 'critérios'}`,
  semNotaNoGrupo: '—',

  notaSubjetiva: 'Nota subjetiva',
  notaSubjetivaApoio: 'O quanto a faixa te pegou, para além dos critérios.',
  /**
   * O rótulo do **campo**, distinto do título da seção.
   *
   * `Painel` expõe `aria-label`, e um campo com o mesmo nome do painel que o
   * contém deixa dois elementos com o mesmo nome acessível — o leitor de tela
   * anuncia "Nota subjetiva" duas vezes e não diz qual é o controle. O
   * protótipo não tem rótulo visível aqui: ele mostra os extremos "0,0" e
   * "5,0" sob o slider, que é o que este texto diz em palavras.
   */
  notaSubjetivaCampo: 'Sua nota, de 0,0 a 5,0',
  feedback: 'Feedback para o artista · obrigatório',
  feedbackPlaceholder:
    'Escreva a devolutiva que você assinaria em público. Diga o que funciona, o que não sustenta e o que você faria na próxima.',
  feedbackValido: 'Tamanho suficiente para o acréscimo',
  feedbackDica: (minimo: number) => `A partir de ${minimo} caracteres o acréscimo entra`,

  // ------------------------------------------------ 14.2 · compartilhamento ---
  compartilhamentoNota:
    'Compartilhar não é obrigatório. Quando você leva a faixa para fora da plataforma, o acréscimo entra na sua remuneração e o artista aparece na home. O crédito é liberado nos dois caminhos.',

  compartilhamentoRotulo: 'Como você vai divulgar a faixa',

  /** `shareMeta` do protótipo, na ordem dele. `nao_compartilhou` é o item à parte. */
  modalidades: {
    playlist: { rotulo: 'Playlist', apoio: 'Inclusão na sua playlist pública' },
    post: { rotulo: 'Post no Instagram', apoio: 'Publicação nas suas redes com comentário' },
    materia: { rotulo: 'Matéria', apoio: 'Texto no veículo em que você escreve' },
    outros: { rotulo: 'Outros', apoio: 'Rádio, newsletter, podcast, aula' },
    nao_compartilhou: {
      rotulo: 'Não vou compartilhar desta vez',
      apoio: 'Confirma a entrega sem o acréscimo e libera o crédito do mesmo jeito.',
    },
  } satisfies Record<ModalidadeCompartilhamento, { rotulo: string; apoio: string }>,

  selecionado: 'Selecionado',
  marcar: 'Marcar',

  // ----------------------------------------------------- 14.3 · outras -------
  outrasNota:
    'Diga onde a faixa vai circular. A equipe confere o registro antes de liberar o acréscimo.',
  outrasRotulo: 'Outra forma de divulgação',
  outrasPlaceholder: 'Programa de rádio, newsletter, podcast, aula',
  outrasSugestoes: ['Programa de rádio', 'Newsletter', 'Podcast', 'Aula ou oficina'] as const,
  outrasUrlRotulo: 'Link do registro (opcional)',
  outrasUrlPlaceholder: 'https://',

  // ------------------------------------------------- 14.4 · remuneração ------
  tituloRemuneracao: 'Como sua remuneração foi calculada',
  suaClasse: 'Sua classe',

  /**
   * Os pisos são os da tabela do board (regras §3), decisão do cliente em
   * open-questions #5: um piso para quem entrega no prazo e outro, menor, para
   * quem atrasa — e o atraso também limita o total.
   */
  pisoNoPrazo: 'Piso da classe dentro das 72h',
  pisoAtrasado: 'Piso da classe fora das 72h',
  pisoNotaNoPrazo: 'Entrega dentro do prazo garante o piso cheio da sua classe.',
  pisoNotaAtrasado: (tetoAtraso: number) =>
    `A faixa passou do prazo: vale o piso de atraso, e o total vai no máximo a ${tetoAtraso}%.`,

  /** Os quatro opcionais de `calcular_remuneracao`, na ordem em que ela os devolve. */
  acrescimos: {
    onze_criterios: (total: number) => `${total} critérios respondidos`,
    justificativas_250: (minimo: number) => `Justificativa de ${minimo} caracteres`,
    feedback_150: (minimo: number) => `Feedback com ${minimo} caracteres`,
    compartilhou: 'Compartilhamento confirmado',
  },

  detalheCriterios: (respondidos: number, total: number) =>
    `${respondidos} de ${total} preenchidos`,
  detalheJustificativas: (quantos: number) =>
    quantos === 0
      ? 'Nenhum critério justificado ainda'
      : `${quantos} ${quantos === 1 ? 'critério justificado' : 'critérios justificados'}`,
  detalheFeedback: (caracteres: number) =>
    `${caracteres} ${caracteres === 1 ? 'caractere escrito' : 'caracteres escritos'}`,
  detalheSemCompartilhamento: 'Sem compartilhamento nesta entrega',

  /** Acréscimo não cumprido: o protótipo mostra um travessão no lugar do valor. */
  acrescimoAusente: '—',
  acrescimoPercentual: (percentual: number) => `+${percentual}%`,

  /**
   * Um teto só, desde a `0009b`. O protótipo dizia "N% na avaliação e M% com
   * compartilhamento" — dois degraus que a tabela do board não tem. O valor é o
   * teto **efetivo** que `calcular_remuneracao` devolve: fora das 72h ele já
   * vem limitado.
   */
  tetoNota: (classe: string, teto: number) =>
    `Teto da classe ${classe}: ${teto}%. Os acréscimos somam até o teto.`,

  voceRecebe: 'Você recebe',
  valorNota: (percentual: number, pagoPeloArtista: string) =>
    `${percentual}% de ${pagoPeloArtista} pagos pelo artista`,

  rotuloFaixa: 'Faixa',
  rotuloServico: 'Serviço',
  rotuloCompartilhamento: 'Compartilhamento',
  compartilhamentoRecusado: 'Recusado',
  compartilhamentoSemEscolha: 'Sem escolha',

  concluir: 'Concluir e liberar crédito',
  concluirNota:
    'O crédito entra no seu financeiro assim que a entrega é confirmada. O artista recebe a devolutiva na hora.',

  // ------------------------------------------------------------- erros -------
  //
  // A View traduz `CodigoErro`; o serviço nunca devolve texto (architecture §8).
  // Os cinco primeiros são `DS001`–`DS005` de `enviar_avaliacao`.
  erroEscuta: (minimo: number, medido: number) =>
    `Você ouviu ${medido}% da faixa. A avaliação só é aceita a partir de ${minimo}%.`,
  erroCriterios: 'Faltam critérios obrigatórios. Volte às notas e preencha os que estão em aberto.',
  erroFeedback: 'O feedback escrito para o artista é obrigatório.',
  erroSituacao:
    'Este envio não está mais em avaliação. Volte para a fila e recarregue para ver o estado atual.',
  erroJaConcluida: 'Esta avaliação já foi concluída. O crédito correspondente já foi liberado.',
  erroCompartilhamentoSemEscolha:
    'Escolha uma forma de divulgação, ou marque "Não vou compartilhar desta vez".',
  erroOutrosSemDescricao: 'Diga onde a faixa vai circular.',
  erroInesperado: 'Não foi possível concluir agora. Tente de novo.',

  /** O envio não é do curador da sessão, ou saiu da fila. */
  erroNaoDisponivel: 'Esta faixa não está disponível para avaliação.',

  concluidaTitulo: 'Avaliação concluída',
  concluidaNota: (valor: string) =>
    `Devolutiva enviada. Crédito de ${valor} liberado no seu financeiro.`,

  semAudio:
    'O arquivo desta faixa não pôde ser carregado. Sem áudio a escuta não é medida, e a avaliação não pode ser concluída.',

  // ------------------------------------------------------------- grupos ------
  /** Os cinco grupos de `grupo_criterio`, com o nome que o protótipo lhes dá. */
  grupos: {
    execucao_tecnica: 'Execução técnica',
    composicao: 'Composição',
    identidade: 'Identidade',
    impacto: 'Impacto',
    producao: 'Produção',
  } satisfies Record<GrupoCriterio, string>,

  classes: {
    bronze: 'Bronze',
    prata: 'Prata',
    ouro: 'Ouro',
  } satisfies Record<ClasseCurador, string>,
} as const;

/**
 * "Notas e feedback" — o histórico do curador.
 *
 * **Derivada.** O protótipo só descreve o módulo, no card de próximo release
 * (`modules.notas`): "Escrita da devolutiva por critério, notas e histórico do
 * que você já entregou". O título e o subtítulo vêm de lá; o resto segue o tom
 * da fila (13).
 */
export const HISTORICO = {
  titulo: 'Notas e feedback',
  subtitulo: 'Escrita da devolutiva por critério, notas e histórico do que você já entregou.',

  emAndamentoTitulo: 'Em andamento',
  emAndamentoResumo: (n: number) => `${n} ${n === 1 ? 'avaliação' : 'avaliações'} em rascunho`,
  entreguesTitulo: 'Entregues',
  entreguesResumo: (n: number) =>
    `${n} ${n === 1 ? 'devolutiva entregue' : 'devolutivas entregues'}`,

  colunas: {
    musica: 'Música',
    etapa: 'Etapa',
    prazo: 'Prazo',
    entregue: 'Entregue em',
    nota: 'Nota',
    pontualidade: 'Pontualidade',
    valor: 'Valor',
    acao: 'Ação',
  },

  continuar: 'Continuar',
  ver: 'Ver',
  noPrazo: 'No prazo',
  foraDoPrazo: 'Fora das 72h',
  semValor: '—',

  vazioTitulo: 'Nenhuma avaliação ainda',
  vazioDescricao:
    'Suas devolutivas aparecem aqui assim que você começar a avaliar uma faixa da fila.',
  irParaFila: 'Ir para a fila',
  vazioEmAndamento: 'Nenhuma avaliação em rascunho.',
  vazioEntregues: 'Nenhuma devolutiva entregue ainda.',
} as const;
