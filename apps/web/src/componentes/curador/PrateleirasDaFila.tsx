'use client';

import Link from 'next/link';
import { useRef } from 'react';

import { capaDoEnvio } from './capas';
import type { LinhaDaFila } from './TabelaDaFila';
import estilos from './PrateleirasDaFila.module.css';

/**
 * 13 · Fila — as prateleiras do protótipo aprovado.
 *
 * Duas fileiras de capas, como num catálogo de streaming: "Ouça primeiro"
 * (menos de 24h para responder) e "Na sua estante" (o resto). Cada capa leva o
 * status, o prazo e o botão de ouvir; o cartão inteiro abre o detalhe (13.1).
 *
 * A faixa ainda não tem capa própria no banco: a capa sai de um dos cinco
 * discos do protótipo, escolhido pelo id do envio — estável entre visitas.
 */

const ROTULO_DO_STATUS: Record<LinhaDaFila['status'], string> = {
  nova: 'Novo',
  em_escuta: 'Em escuta',
  atrasada: 'Atrasada',
};

function contagem(n: number): string {
  return `${n} ${n === 1 ? 'faixa' : 'faixas'}`;
}

export function PrateleirasDaFila({ linhas }: { readonly linhas: readonly LinhaDaFila[] }) {
  const urgentes = linhas.filter((linha) => linha.urgente);
  const comFolga = linhas.filter((linha) => !linha.urgente);

  return (
    <div className={estilos.base}>
      {urgentes.length > 0 ? (
        <Prateleira titulo="Ouça primeiro" sobretitulo="Até 24h para responder" itens={urgentes} />
      ) : null}
      {comFolga.length > 0 ? (
        <Prateleira titulo="Na sua estante" sobretitulo="Mais de 24h de prazo" itens={comFolga} />
      ) : null}
    </div>
  );
}

function Prateleira({
  titulo,
  sobretitulo,
  itens,
}: {
  readonly titulo: string;
  readonly sobretitulo: string;
  readonly itens: readonly LinhaDaFila[];
}) {
  const trilho = useRef<HTMLUListElement>(null);
  const rolar = (sentido: 1 | -1) => {
    const el = trilho.current;
    if (el !== null) {
      el.scrollBy({ left: sentido * Math.max(200, el.clientWidth * 0.8), behavior: 'smooth' });
    }
  };

  return (
    <section className={estilos.prateleira} aria-label={titulo}>
      <div className={estilos.cabecalho}>
        <div className={estilos.titulos}>
          <h2 className={estilos.titulo}>{titulo}</h2>
          <span className={estilos.sobretitulo}>{sobretitulo}</span>
        </div>
        <div className={estilos.navegacao}>
          <span className={estilos.contagem}>{contagem(itens.length)}</span>
          <button
            type="button"
            className={estilos.seta}
            onClick={() => rolar(-1)}
            aria-label="Voltar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            className={estilos.seta}
            onClick={() => rolar(1)}
            aria-label="Avançar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <ul ref={trilho} className={estilos.trilho}>
        {itens.map((linha) => (
          <li key={linha.envioId} className={estilos.item}>
            <Link
              className={estilos.cartao}
              href={`/curador/fila/${linha.envioId}`}
              aria-label={`Abrir ${linha.titulo} de ${linha.artista}`}
            >
              <span
                className={estilos.capa}
                style={{ backgroundImage: `url('${capaDoEnvio(linha.envioId)}')` }}
              >
                <span className={estilos.capaVeu} aria-hidden="true" />
                <span className={estilos.status} data-status={linha.status}>
                  {ROTULO_DO_STATUS[linha.status]}
                </span>
                <span
                  className={[
                    estilos.prazo,
                    linha.status === 'atrasada' ? estilos.prazoUrgente : undefined,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" />
                    <path
                      d="M12 7v5l3 2"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  </svg>
                  {linha.prazo.replace(' restantes', '')}
                </span>
                <span className={estilos.ouvir} aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5.5v13l10.5-6.5z" />
                  </svg>
                </span>
              </span>
              <span className={estilos.textos}>
                <span className={estilos.faixa}>{linha.titulo}</span>
                <span className={estilos.artista}>
                  {linha.artista} · {linha.genero}
                </span>
                <span className={estilos.servico}>{linha.servico}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
