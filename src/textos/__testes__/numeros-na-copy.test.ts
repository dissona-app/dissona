import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CONTA } from '../conta';
import { EQUIPE } from '../equipe';
import { AVALIAR } from '../avaliacao';
import { CARTEIRA, ENTRAR, FILA, ONBOARDING, STATUS_DO_ENVIO } from '../prototipo';

/**
 * Números de negócio **dentro** de frases da copy.
 *
 * "Você tem 72h para responder", "sem resposta em 7 dias", "apagamos em 30
 * dias": são regras que o banco aplica, escritas por extenso numa frase que o
 * cliente validou. Mudar `prazo_avaliacao_horas` para 48 e não mexer no texto
 * faz a tela **mentir**, e nada denuncia — nenhum teste quebra, nenhuma tela
 * some.
 *
 * ## Por que travar, e não interpolar
 *
 * Interpolar (`Você tem ${horas}h`) tira a mentira e traz outra coisa pior: a
 * frase passa a se montar sozinha e ninguém relê. `prazo_devolucao_dias = 1`
 * viraria "sem resposta em 1 dias". A copy é texto que uma pessoa escreveu, com
 * concordância e ritmo; o que ela precisa não é de substituição automática, é
 * de **não poder divergir em silêncio**.
 *
 * Então: o número fica literal na frase, e este teste o amarra à fonte. Quem
 * mudar a configuração vê a falha aqui e reescreve a frase — que é exatamente
 * o momento de reler se ela ainda faz sentido.
 *
 * Onde a tela **já lê** a configuração e mostra o número como dado — o mínimo
 * de escuta em `AVALIAR.escutaMedida(minimo)` —, a interpolação continua sendo
 * o certo, e é por isso que ele não está na tabela abaixo: lá o número não está
 * na frase, ele *é* o dado.
 */

const MIGRATIONS = join(process.cwd(), 'supabase', 'migrations');

function lerMigration(fragmento: string): string {
  const arquivo = readdirSync(MIGRATIONS).find((nome) => nome.includes(fragmento));
  if (arquivo === undefined) throw new Error(`migration ${fragmento} não encontrada`);
  return readFileSync(join(MIGRATIONS, arquivo), 'utf8');
}

/** O valor semeado de uma chave de `configuracao`, lido da `0004`. */
function doSeed(chave: string): string {
  const sql = lerMigration('_0004_configuracao');
  const casado = new RegExp(`\\('${chave.replace('.', '\\.')}',\\s*'([^']+)'`).exec(sql);
  if (casado?.[1] === undefined) throw new Error(`chave ${chave} não está no seed da 0004`);
  return casado[1];
}

/**
 * A validade do convite **não** vem de `configuracao` — é constante na `0003b`,
 * em horas, com a razão escrita lá. A copy fala em dias.
 */
function validadeDoConviteEmDias(): number {
  const sql = lerMigration('_0003b_criar_convite_admin');
  const casado = /p_validade_horas integer default (\d+)/.exec(sql);
  if (casado?.[1] === undefined) throw new Error('validade do convite não encontrada na 0003b');
  return Number(casado[1]) / 24;
}

/**
 * Parte da copy escreve o número **por extenso** — "Prazo de sete dias". Um
 * `toContain('7 dias')` passaria por essas frases sem olhar, que é o pior
 * resultado possível num teste de deriva: verde e cego.
 */
const POR_EXTENSO: Readonly<Record<string, string>> = {
  '1': 'um',
  '2': 'dois',
  '3': 'três',
  '5': 'cinco',
  '7': 'sete',
  '10': 'dez',
  '15': 'quinze',
  '30': 'trinta',
  '48': 'quarenta e oito',
  '60': 'sessenta',
  '72': 'setenta e duas',
};

function extenso(valor: string): string {
  const palavra = POR_EXTENSO[valor];
  if (palavra === undefined) {
    throw new Error(`acrescente ${valor} a POR_EXTENSO — a copy escreve este número por extenso`);
  }
  return palavra;
}

type Amarra = {
  /** Onde a frase mora, para a falha dizer o arquivo. */
  readonly onde: string;
  readonly frase: string;
  readonly esperado: string;
};

const PRAZO_AVALIACAO = doSeed('prazo_avaliacao_horas');
const PRAZO_DEVOLUCAO = doSeed('prazo_devolucao_dias');
const ESCUTA_MINIMA = doSeed('escuta_minima_percentual');
const DIAS_EXPURGO = doSeed('lgpd.dias_expurgo');

const AMARRAS: readonly Amarra[] = [
  // prazo_avaliacao_horas
  { onde: 'AVALIAR.pisoNoPrazo', frase: AVALIAR.pisoNoPrazo, esperado: `${PRAZO_AVALIACAO}h` },
  { onde: 'AVALIAR.pisoAtrasado', frase: AVALIAR.pisoAtrasado, esperado: `${PRAZO_AVALIACAO}h` },
  { onde: 'FILA.nota', frase: FILA.nota, esperado: `${PRAZO_AVALIACAO}h` },
  { onde: 'FILA.notaNoPrazo', frase: FILA.notaNoPrazo, esperado: `${PRAZO_AVALIACAO}h` },
  { onde: 'FILA.notaAtrasado', frase: FILA.notaAtrasado(7), esperado: `${PRAZO_AVALIACAO}h` },
  {
    onde: 'STATUS_DO_ENVIO.nota',
    frase: STATUS_DO_ENVIO.nota,
    esperado: `${PRAZO_AVALIACAO}h`,
  },
  {
    onde: 'ONBOARDING.curador (prazo)',
    frase: ONBOARDING.curador.map((passo) => `${passo.texto} ${passo.micro}`).join(' '),
    esperado: `${PRAZO_AVALIACAO} horas`,
  },

  // prazo_devolucao_dias
  { onde: 'FILA.nota', frase: FILA.nota, esperado: `${PRAZO_DEVOLUCAO} dias` },
  { onde: 'FILA.notaNoPrazo', frase: FILA.notaNoPrazo, esperado: `${PRAZO_DEVOLUCAO} dias` },
  { onde: 'STATUS_DO_ENVIO.nota', frase: STATUS_DO_ENVIO.nota, esperado: `${PRAZO_DEVOLUCAO} dias` },
  {
    onde: 'CARTEIRA.notaDevolucao',
    frase: CARTEIRA.notaDevolucao,
    esperado: `${PRAZO_DEVOLUCAO} dias`,
  },
  {
    onde: 'ENTRAR.provas',
    frase: ENTRAR.provas.join(' · '),
    esperado: `${PRAZO_DEVOLUCAO} dias`,
  },

  // escuta_minima_percentual
  {
    onde: 'ONBOARDING.curador (escuta)',
    frase: ONBOARDING.curador.map((passo) => `${passo.texto} ${passo.micro}`).join(' '),
    esperado: `${ESCUTA_MINIMA}%`,
  },

  // prazo_devolucao_dias, escrito por extenso
  {
    onde: 'ONBOARDING.artista (devolução, por extenso)',
    frase: ONBOARDING.artista.map((passo) => passo.micro).join(' '),
    esperado: `${extenso(PRAZO_DEVOLUCAO)} dias`,
  },
  {
    onde: 'ONBOARDING.curador (devolução, por extenso)',
    frase: ONBOARDING.curador.map((passo) => passo.micro).join(' '),
    esperado: `${extenso(PRAZO_DEVOLUCAO)} dias`,
  },

  // lgpd.dias_expurgo
  {
    onde: 'CONTA.excluirContaNota',
    frase: CONTA.excluirContaNota,
    esperado: `${DIAS_EXPURGO} dias`,
  },
  {
    onde: 'CONTA.modalExcluir.texto',
    frase: CONTA.modalExcluir.texto,
    esperado: `${DIAS_EXPURGO} dias`,
  },
];

describe('números de negócio na copy', () => {
  it.each(AMARRAS)('$onde cita $esperado, como a configuração manda', ({ frase, esperado }) => {
    expect(frase).toContain(esperado);
  });

  it('a validade do convite na copy bate com a constante da 0003b', () => {
    const dias = validadeDoConviteEmDias();
    expect(EQUIPE.equipe.vazioNota).toContain(`${dias} dias`);
    expect(EQUIPE.convite.linkNota).toContain(`${dias} dias`);
  });
});
