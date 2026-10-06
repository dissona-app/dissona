import { describe, expect, it } from 'vitest';

import {
  impedimentosParaConcluir,
  justificativasLongas,
  mediaObjetiva,
  mediasPorGrupo,
  notaValida,
  obrigatoriosFaltando,
  opcionaisCumpridos,
  passoAnterior,
  podeConcluir,
  proximoPasso,
  truncarNota,
} from '../servico';
import type {
  AvaliacaoEmEdicao,
  Criterio,
  RegrasDaAvaliacao,
} from '@dissona/nucleo/modulos/avaliacao/tipos';

/**
 * Regra da avaliação (14).
 *
 * Estas funções são um **espelho** do que `enviar_avaliacao` decide no banco.
 * Divergir significa a tela 14.4 prometer um valor e o extrato do curador
 * pagar outro — daí cada item ter o seu teste.
 */

/** Os 11 do seed da `0008`. */
const CRITERIOS: readonly Criterio[] = [
  { chave: 'afinacao', grupo: 'execucao_tecnica', rotulo: 'Afinação', obrigatorio: true, ordem: 1 },
  { chave: 'ritmo', grupo: 'execucao_tecnica', rotulo: 'Ritmo', obrigatorio: true, ordem: 2 },
  { chave: 'melodia', grupo: 'composicao', rotulo: 'Melodia', obrigatorio: true, ordem: 3 },
  { chave: 'letra', grupo: 'composicao', rotulo: 'Letra', obrigatorio: false, ordem: 4 },
  {
    chave: 'personalidade',
    grupo: 'identidade',
    rotulo: 'Personalidade',
    obrigatorio: true,
    ordem: 5,
  },
  {
    chave: 'expressividade',
    grupo: 'identidade',
    rotulo: 'Expressividade',
    obrigatorio: false,
    ordem: 6,
  },
  {
    chave: 'originalidade',
    grupo: 'identidade',
    rotulo: 'Originalidade',
    obrigatorio: false,
    ordem: 7,
  },
  { chave: 'conexao', grupo: 'impacto', rotulo: 'Conexão', obrigatorio: true, ordem: 8 },
  {
    chave: 'memorabilidade',
    grupo: 'impacto',
    rotulo: 'Memorabilidade',
    obrigatorio: false,
    ordem: 9,
  },
  { chave: 'mixagem', grupo: 'producao', rotulo: 'Mixagem', obrigatorio: false, ordem: 10 },
  { chave: 'arranjo', grupo: 'producao', rotulo: 'Arranjo', obrigatorio: false, ordem: 11 },
];

/** Os valores do seed da `0004`. */
const REGRAS: RegrasDaAvaliacao = {
  escutaMinimaPercentual: 60,
  feedbackMinCaracteres: 150,
  justificativaMinCaracteres: 250,
  criteriosObrigatorios: ['afinacao', 'ritmo', 'melodia', 'personalidade', 'conexao'],
  acrescimoJustificativaMinItens: 1,
};

const texto = (tamanho: number) => 'a'.repeat(tamanho);

function avaliacao(parcial: Partial<AvaliacaoEmEdicao> = {}): AvaliacaoEmEdicao {
  return {
    id: 'a1',
    envioId: 'e1',
    notaSubjetiva: 3.5,
    feedback: texto(200),
    escutaPercentual: 80,
    passoAtual: 1,
    concluida: false,
    notas: REGRAS.criteriosObrigatorios.map((criterio) => ({
      criterio,
      nota: 4,
      justificativa: null,
    })),
    compartilhamento: { modalidade: 'nao_compartilhou', descricao: null, url: null },
    ...parcial,
  };
}

describe('notas', () => {
  it('aceita 0 a 5 com uma casa', () => {
    for (const n of [0, 2.5, 4.9, 5]) expect(notaValida(n), String(n)).toBe(true);
  });

  it('recusa fora da faixa e com duas casas', () => {
    for (const n of [-0.1, 5.1, 4.26]) expect(notaValida(n), String(n)).toBe(false);
  });

  it('trunca, e não arredonda', () => {
    // "4,26" vira 4,2. Arredondar daria 4,3 — uma nota que o curador não deu.
    expect(truncarNota(4.26)).toBe(4.2);
    expect(truncarNota(4.29)).toBe(4.2);
    expect(truncarNota(7)).toBe(5);
    expect(truncarNota(-1)).toBe(0);
  });
});

describe('obrigatoriosFaltando', () => {
  it('a fonte é configuracao, não a flag do catálogo', () => {
    expect(obrigatoriosFaltando(avaliacao(), REGRAS)).toEqual([]);
  });

  it('lista os que faltam', () => {
    const sem = avaliacao({ notas: [{ criterio: 'afinacao', nota: 4, justificativa: null }] });
    expect(obrigatoriosFaltando(sem, REGRAS)).toEqual([
      'ritmo',
      'melodia',
      'personalidade',
      'conexao',
    ]);
  });
});

describe('opcionaisCumpridos', () => {
  it('onze_criterios só com os 11 respondidos', () => {
    expect(opcionaisCumpridos(avaliacao(), CRITERIOS, REGRAS).onze_criterios).toBe(false);

    const todos = avaliacao({
      notas: CRITERIOS.map((c) => ({ criterio: c.chave, nota: 4, justificativa: null })),
    });
    expect(opcionaisCumpridos(todos, CRITERIOS, REGRAS).onze_criterios).toBe(true);
  });

  it('basta UMA justificativa de 250 para o acréscimo', () => {
    // `acrescimo_justificativa_min_itens = 1`. Exigir todas seria outra regra.
    const uma = avaliacao({
      notas: [
        { criterio: 'afinacao', nota: 4, justificativa: texto(250) },
        { criterio: 'ritmo', nota: 4, justificativa: null },
      ],
    });
    expect(opcionaisCumpridos(uma, CRITERIOS, REGRAS).justificativas_250).toBe(true);
  });

  it('justificativa curta não conta', () => {
    const curta = avaliacao({
      notas: [{ criterio: 'afinacao', nota: 4, justificativa: texto(249) }],
    });
    expect(opcionaisCumpridos(curta, CRITERIOS, REGRAS).justificativas_250).toBe(false);
  });

  it('feedback conta a partir de 150', () => {
    expect(
      opcionaisCumpridos(avaliacao({ feedback: texto(150) }), CRITERIOS, REGRAS).feedback_150,
    ).toBe(true);
    expect(
      opcionaisCumpridos(avaliacao({ feedback: texto(149) }), CRITERIOS, REGRAS).feedback_150,
    ).toBe(false);
  });

  it('"não vou compartilhar" NÃO conta como compartilhamento', () => {
    // É escolha válida que libera o crédito, mas sem o acréscimo de 8 pontos.
    expect(opcionaisCumpridos(avaliacao(), CRITERIOS, REGRAS).compartilhou).toBe(false);

    const comPlaylist = avaliacao({
      compartilhamento: { modalidade: 'playlist', descricao: null, url: 'https://x.com/p' },
    });
    expect(opcionaisCumpridos(comPlaylist, CRITERIOS, REGRAS).compartilhou).toBe(true);
  });

  it('conta as justificativas longas', () => {
    const duas = avaliacao({
      notas: [
        { criterio: 'afinacao', nota: 4, justificativa: texto(300) },
        { criterio: 'ritmo', nota: 4, justificativa: texto(250) },
        { criterio: 'melodia', nota: 4, justificativa: texto(10) },
      ],
    });
    expect(justificativasLongas(duas, REGRAS)).toBe(2);
  });
});

describe('impedimentosParaConcluir', () => {
  it('sem impedimento, conclui', () => {
    expect(podeConcluir(avaliacao(), REGRAS)).toBe(true);
  });

  it('escuta abaixo do mínimo impede', () => {
    const impedimentos = impedimentosParaConcluir(avaliacao({ escutaPercentual: 59.9 }), REGRAS);
    expect(impedimentos[0]).toEqual({ tipo: 'escuta', medido: 59.9, minimo: 60 });
  });

  it('a escuta vem PRIMEIRO, antes de critérios e feedback', () => {
    // A ordem é a de `enviar_avaliacao` (DS001 → DS002 → DS003). Avisar do
    // feedback antes da escuta faria a pessoa escrever o texto para só então
    // descobrir que precisa ouvir a faixa.
    const tudoErrado = avaliacao({ escutaPercentual: 10, notas: [], feedback: '' });
    const tipos = impedimentosParaConcluir(tudoErrado, REGRAS).map((i) => i.tipo);
    expect(tipos.indexOf('escuta')).toBeLessThan(tipos.indexOf('criterios'));
    expect(tipos.indexOf('criterios')).toBeLessThan(tipos.indexOf('feedback'));
  });

  it('feedback vazio impede, mas curto não', () => {
    // 150 é o limiar do **acréscimo**, não o da obrigatoriedade.
    expect(podeConcluir(avaliacao({ feedback: '   ' }), REGRAS)).toBe(false);
    expect(podeConcluir(avaliacao({ feedback: 'Curto, mas existe.' }), REGRAS)).toBe(true);
  });

  it('não escolher nada em compartilhamento impede', () => {
    expect(podeConcluir(avaliacao({ compartilhamento: null }), REGRAS)).toBe(false);
  });

  it('"outros" sem descrição impede — é o check da 0008', () => {
    const semDescricao = avaliacao({
      compartilhamento: { modalidade: 'outros', descricao: '  ', url: null },
    });
    expect(podeConcluir(semDescricao, REGRAS)).toBe(false);

    const comDescricao = avaliacao({
      compartilhamento: { modalidade: 'outros', descricao: 'Rádio comunitária', url: null },
    });
    expect(podeConcluir(comDescricao, REGRAS)).toBe(true);
  });
});

describe('médias', () => {
  it('média objetiva com duas casas', () => {
    const notas = avaliacao({
      notas: [
        { criterio: 'afinacao', nota: 4, justificativa: null },
        { criterio: 'ritmo', nota: 3.5, justificativa: null },
        { criterio: 'melodia', nota: 5, justificativa: null },
      ],
    });
    expect(mediaObjetiva(notas)).toBe(4.17);
  });

  it('sem nota nenhuma, é null — e não zero', () => {
    // Zero seria uma nota; a ausência de nota não é.
    expect(mediaObjetiva(avaliacao({ notas: [] }))).toBeNull();
  });

  it('média por grupo, com null no grupo vazio', () => {
    const notas = avaliacao({
      notas: [
        { criterio: 'afinacao', nota: 4, justificativa: null },
        { criterio: 'ritmo', nota: 5, justificativa: null },
      ],
    });
    const medias = mediasPorGrupo(notas, CRITERIOS);
    expect(medias.get('execucao_tecnica')).toBe(4.5);
    expect(medias.get('producao')).toBeNull();
  });
});

describe('proximoPasso', () => {
  it('pula 14.3 quando a modalidade não é "outros"', () => {
    expect(proximoPasso('compartilhamento', avaliacao())).toBe('remuneracao');
  });

  it('passa por 14.3 quando é "outros"', () => {
    const outros = avaliacao({
      compartilhamento: { modalidade: 'outros', descricao: 'Podcast', url: null },
    });
    expect(proximoPasso('compartilhamento', outros)).toBe('outras');
  });

  it('a sequência inicial é fixa', () => {
    expect(proximoPasso('notas', avaliacao())).toBe('subjetiva');
    expect(proximoPasso('subjetiva', avaliacao())).toBe('compartilhamento');
    expect(proximoPasso('outras', avaliacao())).toBe('remuneracao');
  });
});

describe('passoAnterior', () => {
  it('espelha o salto de proximoPasso: de 14.4 volta a 14.2 sem "outros"', () => {
    expect(passoAnterior('remuneracao', avaliacao())).toBe('compartilhamento');
  });

  it('volta a 14.3 quando a modalidade é "outros"', () => {
    const outros = avaliacao({
      compartilhamento: { modalidade: 'outros', descricao: 'Podcast', url: null },
    });
    expect(passoAnterior('remuneracao', outros)).toBe('outras');
  });

  it('a sequência inicial é fixa, e 14 não tem anterior', () => {
    expect(passoAnterior('subjetiva', avaliacao())).toBe('notas');
    expect(passoAnterior('compartilhamento', avaliacao())).toBe('subjetiva');
    expect(passoAnterior('outras', avaliacao())).toBe('compartilhamento');
    expect(passoAnterior('notas', avaliacao())).toBeNull();
  });

  it('desfaz proximoPasso em todos os caminhos', () => {
    const cenarios: readonly AvaliacaoEmEdicao[] = [
      avaliacao(),
      avaliacao({ compartilhamento: { modalidade: 'outros', descricao: 'Rádio', url: null } }),
    ];

    for (const estado of cenarios) {
      for (const passo of ['notas', 'subjetiva', 'compartilhamento'] as const) {
        const proximo = proximoPasso(passo, estado);
        expect(passoAnterior(proximo, estado), `${passo} → ${proximo}`).toBe(passo);
      }
    }
  });
});
