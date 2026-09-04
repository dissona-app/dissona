/**
 * Medição de escuta.
 *
 * O curador só pode enviar a avaliação depois de ouvir a faixa; o percentual
 * mínimo vem de `configuracao.escuta_minima_percentual` e está travado pela
 * pendência #1 (60% ou 100%). O mecanismo de medição, que é o que este módulo
 * resolve, não depende dessa decisão.
 *
 * **Por que não usar `currentTime`.** `currentTime` diz onde a agulha está,
 * não o que foi ouvido. Arrastar a barra para o fim deixaria `currentTime` no
 * fim sem um segundo de áudio reproduzido. E somar o tempo de reprodução
 * também não serve: ouvir o mesmo refrão oito vezes somaria mais que a
 * duração da faixa.
 *
 * **O que este medidor faz.** A faixa é dividida em intervalos curtos, e cada
 * um é marcado quando a agulha passa por ele **tocando**. O percentual é a
 * fração de intervalos distintos marcados. Repetir um trecho não marca duas
 * vezes; pular um trecho deixa os intervalos dele em branco.
 */

/** Tamanho do intervalo, em segundos. */
export const TAMANHO_INTERVALO_S = 0.5;

/**
 * Salto máximo, em segundos, que ainda é creditado como escuta contínua.
 *
 * Os eventos de progresso do `<audio>` chegam a cada ~250 ms, mas podem
 * atrasar quando a aba perde prioridade. Preencher a lacuna evita buraco
 * falso na medição. Acima disso, presume-se descontinuidade e credita-se
 * apenas o intervalo atual — é o que impede que um seek vire escuta.
 */
const SALTO_MAXIMO_S = 1.5;

export type EstadoEscuta = {
  readonly percentual: number;
  readonly segundosOuvidos: number;
  readonly duracao: number;
  readonly completa: boolean;
};

export class MedidorDeEscuta {
  private readonly intervalos: Uint8Array;
  private readonly duracaoSegundos: number;
  private marcados = 0;
  /** Última posição creditada, ou `null` quando houve descontinuidade. */
  private ultimaPosicao: number | null = null;

  constructor(duracaoSegundos: number) {
    if (!Number.isFinite(duracaoSegundos) || duracaoSegundos <= 0) {
      throw new Error('MedidorDeEscuta exige duração finita e positiva');
    }
    this.duracaoSegundos = duracaoSegundos;
    this.intervalos = new Uint8Array(Math.ceil(duracaoSegundos / TAMANHO_INTERVALO_S));
  }

  private indiceDe(tempo: number): number {
    const bruto = Math.floor(tempo / TAMANHO_INTERVALO_S);
    return Math.min(Math.max(bruto, 0), this.intervalos.length - 1);
  }

  private marcar(indice: number): void {
    if (this.intervalos[indice] === 1) return;
    this.intervalos[indice] = 1;
    this.marcados += 1;
  }

  /**
   * Registra a posição da agulha.
   *
   * Chamar a cada evento de progresso. `tocando` falso registra a posição sem
   * creditar nada — o que garante que tempo pausado não conta.
   */
  registrar(tempo: number, tocando: boolean): void {
    if (!Number.isFinite(tempo) || tempo < 0) return;

    if (!tocando) {
      // Pausa é descontinuidade: retomar não deve creditar o intervalo entre
      // a pausa e a retomada, e nem o trecho pulado durante ela.
      this.ultimaPosicao = null;
      return;
    }

    const anterior = this.ultimaPosicao;
    const atual = this.indiceDe(tempo);

    if (anterior === null || tempo < anterior || tempo - anterior > SALTO_MAXIMO_S) {
      // Sem histórico, retrocesso, ou salto grande: credita só onde está.
      this.marcar(atual);
    } else {
      // Escuta contínua: preenche a lacuna entre a leitura anterior e esta.
      for (let indice = this.indiceDe(anterior); indice <= atual; indice += 1) {
        this.marcar(indice);
      }
    }

    this.ultimaPosicao = tempo;
  }

  /**
   * Declara descontinuidade explícita — ligar aos eventos `seeking` e
   * `pause` do `<audio>`. Sem isso, um seek de menos de `SALTO_MAXIMO_S`
   * seria creditado como escuta contínua.
   */
  marcarDescontinuidade(): void {
    this.ultimaPosicao = null;
  }

  get estado(): EstadoEscuta {
    const total = this.intervalos.length;
    const percentual = total === 0 ? 0 : (this.marcados / total) * 100;
    return {
      // Arredondado para uma casa: o limiar de negócio é percentual inteiro,
      // e expor float cru na interface só gera ruído.
      percentual: Math.round(percentual * 10) / 10,
      segundosOuvidos: Math.min(this.marcados * TAMANHO_INTERVALO_S, this.duracaoSegundos),
      duracao: this.duracaoSegundos,
      completa: this.marcados === total,
    };
  }

  /** Atingiu o mínimo exigido por `configuracao.escuta_minima_percentual`. */
  atingiu(percentualMinimo: number): boolean {
    return this.estado.percentual >= percentualMinimo;
  }
}
