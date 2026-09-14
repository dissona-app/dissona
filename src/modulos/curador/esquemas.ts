import { z } from 'zod';

import { esquemaLink } from '@/lib/link';
import { CURADOR_CADASTRO } from '@/textos/curador';

import { TEMPO_DE_ATUACAO, TIPOS_DE_CREDENCIAL } from './tipos';

/**
 * Validação dos oito passos — módulo 12.
 *
 * As mensagens são **códigos**, como em todo o projeto: a View traduz
 * (architecture.md §8). Os códigos aqui têm nome de campo do formulário quando
 * o erro é de um campo, e nome de regra quando é do passo — `canal_sem_nome`
 * vale para a lista inteira, não para uma linha.
 *
 * As regras são as de `cadStepOk` no protótipo, com uma diferença deliberada:
 * o protótipo, sendo mock, **coage em silêncio** o que não passa (`cadMock`
 * enche o campo com um valor de exemplo e segue). Aqui o passo não avança. É a
 * mesma decisão registrada para a tela 21 em
 * [07-pendencias](docs/prd/07-pendencias-e-divergencias.md): salvar um valor
 * que a pessoa não digitou é pior que recusar.
 */

/**
 * A regra de link mora em `lib/link.ts` desde que o perfil do artista (7.1)
 * passou a precisar dela. Reexportada aqui para os pontos de uso do módulo 12
 * continuarem importando de um lugar só.
 */
export { esquemaLink, normalizarLink } from '@/lib/link';

/** Passo 2 — gêneros. Sem teto: o protótipo diz "Escolha quantos quiser". */
export const esquemaGeneros = z.object({
  generos: z.array(z.enum(CURADOR_CADASTRO.generos)).min(1, { message: 'genero_obrigatorio' }),
});

/** Passo 3 — frentes de atuação e tempo. */
export const esquemaAtuacao = z.object({
  frentes: z.array(z.enum(CURADOR_CADASTRO.frentes)).min(1, { message: 'frente_obrigatoria' }),
  tempo: z.enum(TEMPO_DE_ATUACAO.map((item) => item.codigo) as [string, ...string[]], {
    message: 'tempo_obrigatorio',
  }),
});

const TIPOS_DE_CANAL = CURADOR_CADASTRO.tiposDeCanal.map((item) => item.valor) as [
  string,
  ...string[],
];

/**
 * Passo 4 — canais.
 *
 * A lista chega achatada em três arrays paralelos, porque é assim que um
 * `FormData` carrega campos repetidos. O `superRefine` recompõe e valida linha
 * a linha, e a mensagem do passo aponta o **primeiro** problema — que é o que a
 * tela mostra.
 */
export const esquemaCanais = z
  .object({
    tipos: z.array(z.enum(TIPOS_DE_CANAL)),
    nomes: z.array(z.string()),
    links: z.array(z.string()),
  })
  .superRefine((dados, ctx) => {
    const total = Math.max(dados.tipos.length, dados.nomes.length, dados.links.length);

    // Linha vazia é linha em branco que a pessoa não preencheu, e não erro:
    // o formulário nasce com uma. O que conta é o que tem algo.
    const preenchidas = Array.from({ length: total }, (_, i) => ({
      nome: (dados.nomes[i] ?? '').trim(),
      link: (dados.links[i] ?? '').trim(),
    })).filter((linha) => linha.nome !== '' || linha.link !== '');

    if (preenchidas.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'canal_vazio', path: ['canais'] });
      return;
    }
    if (preenchidas.some((linha) => linha.nome === '')) {
      ctx.addIssue({ code: 'custom', message: 'canal_sem_nome', path: ['canais'] });
      return;
    }
    if (preenchidas.some((linha) => !esquemaLink.safeParse(linha.link).success)) {
      ctx.addIssue({ code: 'custom', message: 'canal_link', path: ['canais'] });
    }
  });

/**
 * Uma mídia, na tela de manutenção (12.6).
 *
 * Separado de `esquemaCanais` porque o objeto validado é outro: lá é a lista
 * inteira em arrays paralelos, com linha em branco permitida; aqui é **uma**
 * linha que a pessoa preencheu de propósito, e branco é erro. Um esquema que
 * servisse aos dois teria de tratar "vazio" como válido e inválido ao mesmo
 * tempo.
 */
export const esquemaMidia = z.object({
  /** Ausente ao inserir, presente ao editar. */
  midiaId: z.uuid({ message: 'midia_invalida' }).optional(),
  tipo: z.enum(TIPOS_DE_CANAL, { message: 'midia_tipo' }),
  nome: z
    .string()
    .trim()
    .min(1, { message: 'midia_sem_nome' })
    .max(120, { message: 'midia_nome_longo' }),
  link: esquemaLink,
});

export const esquemaRemocaoDeMidia = z.object({
  midiaId: z.uuid({ message: 'midia_invalida' }),
});

/**
 * Preço em Claves.
 *
 * Inteiro de até três dígitos, como o protótipo limita (`slice(0, 3)`), e
 * maior que zero, como o `check servico_curador_preco_positivo` exige. A coluna
 * é `numeric(10,2)`, mas a tela não oferece centavo — 1 Clave é R$ 10, e meia
 * Clave não é um preço que alguém digite.
 */
export const esquemaPreco = z.coerce
  .number({ message: 'preco_invalido' })
  .int({ message: 'preco_invalido' })
  .positive({ message: 'preco_invalido' })
  .max(999, { message: 'preco_invalido' });

/** Passo 5 — serviços. `feedback` é sempre ativo e sempre precisa de preço. */
export const esquemaServicos = z
  .object({
    precoFeedback: esquemaPreco.catch(() => Number.NaN),
    opcionais: z.array(
      z.object({
        tipo: z.enum(['playlist', 'post', 'materia']),
        ativo: z.boolean(),
        preco: z.string(),
      }),
    ),
  })
  .superRefine((dados, ctx) => {
    if (!Number.isFinite(dados.precoFeedback)) {
      ctx.addIssue({ code: 'custom', message: 'preco_feedback', path: ['precoFeedback'] });
    }

    const ativoSemPreco = dados.opcionais.some(
      (servico) => servico.ativo && !esquemaPreco.safeParse(servico.preco).success,
    );
    if (ativoSemPreco) {
      ctx.addIssue({ code: 'custom', message: 'preco_servicos', path: ['opcionais'] });
    }
  });

/**
 * Passo 6 — credenciais.
 *
 * Marcar sem comprovar é o erro que o protótipo pega (`credOk`): a caixa
 * marcada exige link válido, ou anexo no caso de `formacao`. Não marcar nada é
 * válido — o passo é pulável, e sem credencial a classificação é Bronze.
 */
export const esquemaCredenciais = z
  .object({
    marcadas: z.array(z.enum(TIPOS_DE_CREDENCIAL)),
    links: z.record(z.enum(TIPOS_DE_CREDENCIAL), z.string()),
    /** `true` quando há anexo — o novo do formulário ou o já gravado. */
    temAnexoDeFormacao: z.boolean(),
  })
  .superRefine((dados, ctx) => {
    for (const tipo of dados.marcadas) {
      const comprovada =
        tipo === 'formacao'
          ? dados.temAnexoDeFormacao
          : esquemaLink.safeParse(dados.links[tipo] ?? '').success;

      if (!comprovada) {
        ctx.addIssue({ code: 'custom', message: 'credencial_sem_prova', path: ['credenciais'] });
        return;
      }
    }
  });

export const BIO_MIN_CARACTERES = 40;
export const BIO_MAX_CARACTERES = 400;

/**
 * Passo 7 — bio e especialidade.
 *
 * Bio vazia passa (o passo é pulável); bio **começada** tem de chegar aos 40
 * caracteres, que é exatamente o que o protótipo verifica. O teto de 400 é o
 * `maxlength` da tela.
 */
export const esquemaBio = z.object({
  bio: z
    .string()
    .trim()
    .max(BIO_MAX_CARACTERES, { message: 'bio_longa' })
    .refine((valor) => valor === '' || valor.length >= BIO_MIN_CARACTERES, {
      message: 'bio_curta',
    }),
  especialidade: z.string().trim().max(200, { message: 'especialidade_longa' }),
});

/**
 * Foto de perfil e anexo de credencial.
 *
 * Os limites são do protótipo: "JPG ou PNG, até 2 MB" (tela 27.1 do admin, a
 * única que os declara). O anexo de comprovação aceita PDF também, e 5 MB —
 * certificado escaneado passa de 2 MB com frequência, e recusá-lo faria a
 * pessoa perder a credencial por causa do scanner dela.
 */
export const FOTO_TIPOS = ['image/jpeg', 'image/png'] as const;
export const FOTO_MAX_BYTES = 2 * 1024 * 1024;

export const ANEXO_TIPOS = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const ANEXO_MAX_BYTES = 5 * 1024 * 1024;

export type ResultadoDeArquivo =
  | { readonly ok: true; readonly arquivo: File | null }
  | { readonly ok: false; readonly motivo: 'tipo' | 'tamanho' };

/**
 * Confere um arquivo do formulário sem lê-lo inteiro na memória.
 *
 * `File` do `FormData` já traz `type` e `size`, e os dois bastam para recusar
 * antes do upload. Um arquivo ausente (`size === 0`) não é erro: os dois campos
 * são opcionais.
 */
export function conferirArquivo(
  valor: unknown,
  tiposAceitos: readonly string[],
  maxBytes: number,
): ResultadoDeArquivo {
  if (!(valor instanceof File) || valor.size === 0) return { ok: true, arquivo: null };
  if (!tiposAceitos.includes(valor.type)) return { ok: false, motivo: 'tipo' };
  if (valor.size > maxBytes) return { ok: false, motivo: 'tamanho' };
  return { ok: true, arquivo: valor };
}
