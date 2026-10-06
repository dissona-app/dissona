import { z } from 'zod';

import { esquemaLinkOpcional } from '@/lib/link';

import { notaValida, truncarNota } from './servico';
import { MODALIDADES } from './tipos';

/**
 * Validação das cinco etapas da avaliação.
 *
 * As mensagens são **códigos**; a View traduz (architecture.md §8).
 *
 * Nada aqui é a fronteira. `enviar_avaliacao` refaz cada checagem no banco e
 * recusa com `DS001`–`DS005` — estes esquemas existem para a pessoa descobrir
 * o problema no campo em que ele está, e não num erro de RPC depois de cinco
 * telas preenchidas.
 */

/** `"3,5"` e `"3.5"` são a mesma nota: o teclado decimal pt-BR dá vírgula. */
const comPontoDecimal = (valor: string) => valor.trim().replace(',', '.');

/**
 * Nota de um critério — **pode ser vazia**.
 *
 * Vazio é "ainda não avaliei", que não é nota 0: seis dos onze critérios são
 * opcionais, e zerá-los por omissão baixaria a média objetiva de quem só
 * respondeu os obrigatórios.
 */
const valorDeNotaOpcional = z
  .string()
  .transform(comPontoDecimal)
  .refine((valor) => valor === '' || notaValida(Number(valor)), { message: 'nota_invalida' })
  .transform((valor) => (valor === '' ? null : truncarNota(Number(valor))));

/**
 * O limite da justificativa é de **coluna**, não de negócio.
 *
 * `justificativa_min_caracteres` (250) é o piso que rende acréscimo e vem de
 * `configuracao`; este 4000 é só o teto que impede um `text` de crescer sem
 * limite. Os dois não se confundem — o mínimo nunca aparece aqui.
 */
const JUSTIFICATIVA_MAX = 4000;
const FEEDBACK_MAX = 5000;
const DESCRICAO_MAX = 280;

const textoOpcional = (maximo: number, codigo: string) =>
  z
    .string()
    .trim()
    .max(maximo, { message: codigo })
    .transform((valor) => (valor === '' ? null : valor));

/** Etapa 14 — uma linha da tabela de critérios. */
export const esquemaNotaDeCriterio = z.object({
  criterio: z.string().trim().min(1, { message: 'criterio_invalido' }),
  nota: valorDeNotaOpcional,
  justificativa: textoOpcional(JUSTIFICATIVA_MAX, 'justificativa_longa'),
});

export type EntradaDeNota = z.input<typeof esquemaNotaDeCriterio>;

/**
 * Etapa 14.1 — nota subjetiva e feedback.
 *
 * ## Por que o feedback vazio passa aqui
 *
 * Estes esquemas validam **rascunho**, não entrega. "Salvar e sair" existe em
 * todas as etapas, e recusar o vazio aqui tornaria impossível sair de 14.1 sem
 * escrever a devolutiva inteira — que é justamente o trabalho que se quis
 * interromper.
 *
 * A obrigatoriedade continua existindo em dois lugares mais altos: o campo é
 * `required` no HTML, então "Avançar" não passa sem ele; e `enviar_avaliacao`
 * recusa a conclusão com `DS003`. Vazio vira `null`, que é o que a coluna
 * guarda.
 *
 * A nota subjetiva, ao contrário das objetivas, é sempre enviada: o slider tem
 * posição desde o primeiro render, e `nota_avaliacao.nf = no + ns` trata a
 * ausência como zero — "não respondi" passaria a valer o mesmo que "não me
 * pegou".
 */
export const esquemaSubjetiva = z.object({
  notaSubjetiva: z
    .string()
    .transform(comPontoDecimal)
    .refine((valor) => valor !== '' && notaValida(Number(valor)), { message: 'nota_invalida' })
    .transform((valor) => truncarNota(Number(valor))),
  feedback: textoOpcional(FEEDBACK_MAX, 'feedback_longo'),
});

export type EntradaDeSubjetiva = z.input<typeof esquemaSubjetiva>;

/**
 * Etapa 14.2 — a modalidade, exclusiva.
 *
 * `nao_compartilhou` vem sem `url` por `check` do banco
 * (`compartilhamento_nao_compartilhou_e_vazio`): declarar que não vai
 * compartilhar e anexar link é incoerente, e o registro precisa ser auditável.
 * Aqui o link é apagado em vez de recusado — a pessoa pode ter colado um e
 * mudado de ideia, e um erro de validação por isso não ajudaria ninguém.
 */
export const esquemaCompartilhamento = z
  .object({
    modalidade: z.enum(MODALIDADES, { message: 'modalidade_invalida' }),
    url: esquemaLinkOpcional,
  })
  .transform((escolha) =>
    escolha.modalidade === 'nao_compartilhou' ? { ...escolha, url: null } : escolha,
  );

export type EntradaDeCompartilhamento = z.input<typeof esquemaCompartilhamento>;

/**
 * Etapa 14.3 — "Outras formas".
 *
 * A descrição é obrigatória por `check` da `0008`
 * (`compartilhamento_outros_exige_descricao`): a modalidade `outros` sem dizer
 * onde a faixa vai circular não é verificável pela equipe. Vazia, aqui, é
 * rascunho — e a ação apaga a escolha em vez de gravar uma linha que o banco
 * recusaria. Ver o comentário de `salvarEscolhaDeCompartilhamento`.
 */
export const esquemaOutras = z.object({
  descricao: textoOpcional(DESCRICAO_MAX, 'descricao_longa'),
  url: esquemaLinkOpcional,
});

export type EntradaDeOutras = z.input<typeof esquemaOutras>;

/**
 * A escuta medida pelo player, em pontos percentuais.
 *
 * Validada porque chega de uma ação chamada pelo cliente e vai para uma coluna
 * com `check (escuta_percentual between 0 and 100)`. Não é gate de nada: quem
 * decide é `enviar_avaliacao`, e o trigger `avaliacao_escuta_so_cresce` grava
 * `greatest(old, new)`, então um valor forjado para baixo é inócuo.
 */
export const esquemaEscuta = z.number().min(0).max(100);
