import { describe, expect, it } from 'vitest';

import { MedidorDeEscuta, TAMANHO_INTERVALO_S } from '../escuta';

/** Faixa de 100 s = 200 intervalos de 0,5 s. Cada intervalo vale 0,5%. */
const DURACAO = 100;

/** Simula reprodução contínua de `de` até `ate`, no passo dos eventos reais. */
function tocarDe(medidor: MedidorDeEscuta, de: number, ate: number, passo = 0.25) {
  for (let t = de; t <= ate; t += passo) {
    medidor.registrar(t, true);
  }
}

describe('MedidorDeEscuta', () => {
  it('exige duração válida', () => {
    expect(() => new MedidorDeEscuta(0)).toThrow();
    expect(() => new MedidorDeEscuta(-1)).toThrow();
    expect(() => new MedidorDeEscuta(Number.NaN)).toThrow();
    expect(() => new MedidorDeEscuta(Number.POSITIVE_INFINITY)).toThrow();
  });

  it('começa em zero', () => {
    const medidor = new MedidorDeEscuta(DURACAO);
    expect(medidor.estado.percentual).toBe(0);
    expect(medidor.estado.segundosOuvidos).toBe(0);
    expect(medidor.estado.completa).toBe(false);
  });

  it('conta escuta contínua', () => {
    const medidor = new MedidorDeEscuta(DURACAO);
    tocarDe(medidor, 0, 50);
    // Metade da faixa ouvida — tolerância de um intervalo na borda.
    expect(medidor.estado.percentual).toBeGreaterThanOrEqual(50);
    expect(medidor.estado.percentual).toBeLessThanOrEqual(51);
  });

  it('chega a 100% e marca completa ao ouvir tudo', () => {
    const medidor = new MedidorDeEscuta(DURACAO);
    tocarDe(medidor, 0, DURACAO);
    expect(medidor.estado.percentual).toBe(100);
    expect(medidor.estado.completa).toBe(true);
    expect(medidor.estado.segundosOuvidos).toBe(DURACAO);
  });

  // ------------------------------------------------------- o que não conta

  it('seek para frente NÃO conta como ouvido', () => {
    const medidor = new MedidorDeEscuta(DURACAO);
    tocarDe(medidor, 0, 10);
    const antes = medidor.estado.percentual;

    // Arrasta a barra de 10 s para 90 s e continua tocando.
    medidor.marcarDescontinuidade();
    tocarDe(medidor, 90, 100);

    // Creditou só os 10 s iniciais e os 10 s finais — nunca os 80 pulados.
    expect(medidor.estado.percentual).toBeLessThan(25);
    expect(medidor.estado.percentual).toBeGreaterThan(antes);
  });

  it('salto grande sem aviso de seek também não é creditado', () => {
    const medidor = new MedidorDeEscuta(DURACAO);
    medidor.registrar(0, true);
    // Sem chamar marcarDescontinuidade: o salto por si já é grande demais.
    medidor.registrar(80, true);
    // Dois intervalos marcados de 200 = 1%.
    expect(medidor.estado.percentual).toBe(1);
  });

  it('arrastar direto para o fim não completa a escuta', () => {
    const medidor = new MedidorDeEscuta(DURACAO);
    medidor.marcarDescontinuidade();
    medidor.registrar(DURACAO, true);
    expect(medidor.estado.completa).toBe(false);
    expect(medidor.estado.percentual).toBe(0.5);
  });

  it('tempo pausado não conta', () => {
    const medidor = new MedidorDeEscuta(DURACAO);
    tocarDe(medidor, 0, 10);
    const antes = medidor.estado.percentual;

    // Cem leituras paradas no mesmo ponto, pausado.
    for (let i = 0; i < 100; i += 1) {
      medidor.registrar(10, false);
    }
    expect(medidor.estado.percentual).toBe(antes);
  });

  it('pausar e retomar no mesmo ponto não cria buraco nem crédito extra', () => {
    const medidor = new MedidorDeEscuta(DURACAO);
    tocarDe(medidor, 0, 10);
    const antes = medidor.estado.percentual;

    medidor.registrar(10, false);
    tocarDe(medidor, 10, 20);

    // Ganhou ~10 s, não mais que isso.
    const ganho = medidor.estado.percentual - antes;
    expect(ganho).toBeGreaterThanOrEqual(9.5);
    expect(ganho).toBeLessThanOrEqual(10.5);
  });

  it('pular trecho durante a pausa não credita o trecho pulado', () => {
    const medidor = new MedidorDeEscuta(DURACAO);
    tocarDe(medidor, 0, 10);
    medidor.registrar(10, false);
    // Retoma em 60 s, depois de mexer na barra enquanto estava pausado.
    tocarDe(medidor, 60, 70);
    expect(medidor.estado.percentual).toBeLessThan(25);
  });

  it('repetir o mesmo trecho NÃO conta duas vezes', () => {
    const medidor = new MedidorDeEscuta(DURACAO);
    tocarDe(medidor, 0, 20);
    const umaVez = medidor.estado.percentual;

    // Volta e ouve o mesmo trecho sete vezes.
    for (let volta = 0; volta < 7; volta += 1) {
      medidor.marcarDescontinuidade();
      tocarDe(medidor, 0, 20);
    }

    expect(medidor.estado.percentual).toBe(umaVez);
  });

  it('somar tempo de reprodução ultrapassaria 100%; o medidor não', () => {
    const medidor = new MedidorDeEscuta(DURACAO);
    // 10 voltas no primeiro terço = 330 s de reprodução numa faixa de 100 s.
    for (let volta = 0; volta < 10; volta += 1) {
      medidor.marcarDescontinuidade();
      tocarDe(medidor, 0, 33);
    }
    expect(medidor.estado.percentual).toBeLessThanOrEqual(34);
    expect(medidor.estado.segundosOuvidos).toBeLessThanOrEqual(DURACAO);
  });

  // ------------------------------------------------------------- robustez

  it('ignora leitura inválida', () => {
    const medidor = new MedidorDeEscuta(DURACAO);
    medidor.registrar(Number.NaN, true);
    medidor.registrar(-5, true);
    medidor.registrar(Number.POSITIVE_INFINITY, true);
    expect(medidor.estado.percentual).toBe(0);
  });

  it('limita posição além da duração ao último intervalo', () => {
    const medidor = new MedidorDeEscuta(DURACAO);
    medidor.registrar(DURACAO + 30, true);
    expect(medidor.estado.percentual).toBe(0.5);
  });

  it('preenche lacuna curta de evento sem creditar salto grande', () => {
    const curto = new MedidorDeEscuta(10);
    curto.registrar(0, true);
    // Lacuna de 1 s — dentro da tolerância, preenche.
    curto.registrar(1, true);
    expect(curto.estado.percentual).toBe(15); // intervalos 0, 1 e 2 de 20

    const longo = new MedidorDeEscuta(10);
    longo.registrar(0, true);
    // Lacuna de 3 s — acima da tolerância, credita só o intervalo atual.
    longo.registrar(3, true);
    expect(longo.estado.percentual).toBe(10); // intervalos 0 e 6
  });

  it('atingiu() compara com o mínimo de configuracao', () => {
    const medidor = new MedidorDeEscuta(DURACAO);
    tocarDe(medidor, 0, 62);
    expect(medidor.atingiu(60)).toBe(true);
    expect(medidor.atingiu(100)).toBe(false);
  });

  it('o intervalo declarado é o usado no cálculo', () => {
    const medidor = new MedidorDeEscuta(TAMANHO_INTERVALO_S * 4);
    medidor.registrar(0, true);
    expect(medidor.estado.percentual).toBe(25);
  });
});
