'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { EstadoEscuta } from '@/lib/escuta';
import { MedidorDeEscuta } from '@/lib/escuta';

import { BarraProgresso } from './BarraProgresso';
import estilos from './Player.module.css';

export type PropsPlayer = {
  readonly src: string;
  readonly titulo: string;
  readonly artista?: string;
  /**
   * Mínimo exigido, de `configuracao.escuta_minima_percentual`. Passar
   * `null` mede sem exigir nada — é o caso de pré-escuta pelo artista.
   *
   * O valor está travado pela pendência #1 (60% ou 100%); o componente não
   * embute nenhum número.
   */
  readonly minimoPercentual: number | null;
  /** Chamado a cada mudança da medição, para a tela travar ou liberar o envio. */
  readonly onEscutaMudar?: (estado: EstadoEscuta) => void;
};

const ESTADO_INICIAL: EstadoEscuta = {
  percentual: 0,
  segundosOuvidos: 0,
  duracao: 0,
  completa: false,
};

function formatarTempo(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos < 0) return '0:00';
  const minutos = Math.floor(segundos / 60);
  const resto = Math.floor(segundos % 60);
  return `${minutos}:${resto.toString().padStart(2, '0')}`;
}

/**
 * O detalhe da barra: `avEscutaLabel` do protótipo.
 *
 * "62% ouvidos · escuta válida" quando passou do mínimo, "48% ouvidos · faltam
 * 12%" quando não. O número sozinho — que era o que a barra mostrava — não diz
 * o que falta, e "faltam 12%" é a única forma de a pessoa saber quanto ainda
 * precisa ouvir sem fazer a conta de cabeça.
 */
function detalheDaEscuta(percentual: number, minimo: number | null): string {
  if (minimo === null) return `${percentual}%`;
  return percentual >= minimo
    ? `${percentual}% ouvidos · escuta válida`
    : `${percentual}% ouvidos · faltam ${minimo - percentual}%`;
}

/**
 * Player com medição de escuta confiável.
 *
 * A medição é do `MedidorDeEscuta` (`lib/escuta.ts`), que credita intervalos
 * distintos em vez de tempo de reprodução — seek para frente não conta, pausa
 * não conta, e repetir um trecho não conta duas vezes.
 *
 * `playbackRate` é travado em 1: sem isso, ouvir a 4× marcaria a faixa inteira
 * em um quarto do tempo, o que é um caminho aberto para avaliação em massa —
 * risco já registrado em open-questions §5.
 */
export function Player({ src, titulo, artista, minimoPercentual, onEscutaMudar }: PropsPlayer) {
  const audio = useRef<HTMLAudioElement>(null);
  const medidor = useRef<MedidorDeEscuta | null>(null);
  const [escuta, setEscuta] = useState<EstadoEscuta>(ESTADO_INICIAL);
  const [tocando, setTocando] = useState(false);
  const [posicao, setPosicao] = useState(0);
  const [duracao, setDuracao] = useState(0);

  const publicar = useCallback(() => {
    const atual = medidor.current;
    if (atual === null) return;
    setEscuta(atual.estado);
    onEscutaMudar?.(atual.estado);
  }, [onEscutaMudar]);

  // Trocar de faixa zera a medição: o percentual é por faixa.
  //
  // Ajuste durante o render, e não num efeito: é o padrão que o React
  // recomenda para "resetar estado quando uma prop muda", e evita o render
  // extra com os dados da faixa anterior ainda na tela.
  const [srcMedido, setSrcMedido] = useState(src);
  if (srcMedido !== src) {
    setSrcMedido(src);
    setEscuta(ESTADO_INICIAL);
    setPosicao(0);
    setDuracao(0);
    setTocando(false);
  }

  useEffect(() => {
    const elemento = audio.current;
    if (elemento === null) return;

    // Faixa nova, medição nova.
    medidor.current = null;
    elemento.playbackRate = 1;

    function aoCarregarMetadados() {
      const total = elemento?.duration ?? 0;
      if (!Number.isFinite(total) || total <= 0) return;
      setDuracao(total);
      medidor.current = new MedidorDeEscuta(total);
      publicar();
    }

    function aoProgredir() {
      if (elemento === null) return;
      setPosicao(elemento.currentTime);
      medidor.current?.registrar(elemento.currentTime, !elemento.paused);
      publicar();
    }

    function aoBuscar() {
      // O seek em si é a descontinuidade. Sem isto, um arrasto curto seria
      // creditado como escuta contínua.
      medidor.current?.marcarDescontinuidade();
    }

    function aoTocar() {
      setTocando(true);
    }

    function aoPausar() {
      setTocando(false);
      medidor.current?.marcarDescontinuidade();
    }

    function aoMudarVelocidade() {
      if (elemento !== null && elemento.playbackRate !== 1) elemento.playbackRate = 1;
    }

    elemento.addEventListener('loadedmetadata', aoCarregarMetadados);
    elemento.addEventListener('timeupdate', aoProgredir);
    elemento.addEventListener('seeking', aoBuscar);
    elemento.addEventListener('play', aoTocar);
    elemento.addEventListener('pause', aoPausar);
    elemento.addEventListener('ended', aoPausar);
    elemento.addEventListener('ratechange', aoMudarVelocidade);

    // A faixa pode já estar com metadados prontos no primeiro render.
    if (elemento.readyState >= 1) aoCarregarMetadados();

    return () => {
      elemento.removeEventListener('loadedmetadata', aoCarregarMetadados);
      elemento.removeEventListener('timeupdate', aoProgredir);
      elemento.removeEventListener('seeking', aoBuscar);
      elemento.removeEventListener('play', aoTocar);
      elemento.removeEventListener('pause', aoPausar);
      elemento.removeEventListener('ended', aoPausar);
      elemento.removeEventListener('ratechange', aoMudarVelocidade);
    };
  }, [src, publicar]);

  function alternar() {
    const elemento = audio.current;
    if (elemento === null) return;
    if (elemento.paused) void elemento.play();
    else elemento.pause();
  }

  const atingiu = minimoPercentual === null || escuta.percentual >= minimoPercentual;

  return (
    <div className={estilos.base}>
      <div className={estilos.linha}>
        <button
          type="button"
          className={estilos.play}
          onClick={alternar}
          aria-label={tocando ? `Pausar ${titulo}` : `Tocar ${titulo}`}
          title={tocando ? 'Pausar' : 'Tocar'}
        >
          <span aria-hidden="true">{tocando ? '❙❙' : '▶'}</span>
        </button>

        <div className={estilos.info}>
          <span className={estilos.titulo}>{titulo}</span>
          {artista !== undefined ? <span className={estilos.artista}>{artista}</span> : null}
        </div>

        <span className={estilos.tempo}>
          {formatarTempo(posicao)} / {formatarTempo(duracao)}
        </span>
      </div>

      <div className={estilos.medicao}>
        <BarraProgresso
          percentual={escuta.percentual}
          rotulo="Escutado"
          tom={atingiu ? 'sucesso' : 'marca'}
          detalhe={detalheDaEscuta(escuta.percentual, minimoPercentual)}
        />

        {minimoPercentual !== null ? (
          // `aria-live="polite"`: o curador precisa saber que liberou, sem ser
          // interrompido a cada tique da barra.
          <span
            className={[estilos.aviso, atingiu ? estilos.atingido : undefined]
              .filter(Boolean)
              .join(' ')}
            aria-live="polite"
          >
            {atingiu
              ? 'Escuta mínima atingida.'
              : `Ouça ao menos ${minimoPercentual}% da faixa para enviar a avaliação. Adiantar não conta.`}
          </span>
        ) : null}
      </div>

      {/* Sem `controls`: a barra nativa permitiria arrastar sem medição
          visível, e o objetivo é que o percentual seja a única pista de
          progresso que importa. */}
      <audio ref={audio} src={src} preload="metadata" />
    </div>
  );
}
