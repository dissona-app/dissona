'use client';

import { useActionState, useState } from 'react';

import { Botao } from '@/componentes/base/Botao';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { ONBOARDING } from '@/textos/prototipo';

import estilos from './TourDeOnboarding.module.css';

export type PassoDoTour = {
  readonly titulo: string;
  readonly texto: string;
  readonly micro: string;
};

export type PropsTourDeOnboarding = {
  readonly passos: readonly PassoDoTour[];
  readonly acaoDeEncerrar: () => Promise<ResultadoDeAcao>;
  /** `true` quando o tour foi reaberto pelo menu de ajuda, e não é 1º acesso. */
  readonly revendo: boolean;
};

const ESTADO_INICIAL: ResultadoDeAcao | null = null;

/**
 * Tela 1.5 — o tour de quatro passos.
 *
 * ## "Pular" e "Finalizar" são a mesma ação
 *
 * RF-007: *"dado que pulo ou finalizo, então entro no ambiente e o tour não
 * reaparece"*. Os dois botões chamam a mesma coisa, e é por isso que quem pula
 * não vê o tour de novo no próximo login — que é a leitura óbvia de "pular", e
 * a que uma implementação com dois caminhos erraria.
 *
 * ## O passo é estado local, e não rota
 *
 * `/onboarding?passo=3` seria alcançável, compartilhável e voltaria no
 * histórico — e nada disso serve a um tour de quatro telas. Com estado local, o
 * "Voltar" do navegador sai do tour, que é o que a pessoa espera dele.
 *
 * Os dots são um `<ol>` com `aria-current`, e não `role="tablist"`: eles não
 * são controles, e não há o que selecionar. O protótipo os faz `<button>`; aqui
 * são indicadores, e quem navega por teclado usa "Avançar" e "Voltar" — dois
 * alvos em vez de seis.
 */
export function TourDeOnboarding({ passos, acaoDeEncerrar, revendo }: PropsTourDeOnboarding) {
  const [indice, setIndice] = useState(0);
  // `FormData` como carga, e ignorada: é o que `<form action>` entrega, e o
  // encerramento não tem campo nenhum. Tipar como `void` compilaria a chamada
  // e não o `<form>`.
  const [, encerrar, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async () => acaoDeEncerrar(),
    ESTADO_INICIAL,
  );

  const total = passos.length;
  const passo = passos[indice];
  const ultimo = indice === total - 1;

  // `passos` vem de um registro literal e nunca é vazio, mas
  // `noUncheckedIndexedAccess` não sabe disso — e um `!` aqui esconderia o dia
  // em que alguém passar um array filtrado.
  if (passo === undefined) return null;

  return (
    <>
      <div className={estilos.topo}>
        <span className={estilos.contador}>{ONBOARDING.passoDe(indice + 1, total)}</span>

        {/*
          "Pular" só no primeiro acesso. Quem reabriu pelo menu de ajuda já
          conhece o tour: para essa pessoa o botão certo é "Finalizar", e um
          "Pular" ao lado dele seria a mesma ação com dois nomes.
        */}
        {revendo ? null : (
          <form action={encerrar}>
            <button type="submit" className={estilos.pular} disabled={pendente}>
              {ONBOARDING.pular}
            </button>
          </form>
        )}
      </div>

      <div className={estilos.conteudo}>
        <h1 className={estilos.titulo}>{passo.titulo}</h1>
        <p className={estilos.texto}>{passo.texto}</p>
        <p className={estilos.micro}>{passo.micro}</p>
      </div>

      <ol className={estilos.dots} aria-label="Progresso do tour">
        {passos.map((cada, i) => (
          <li
            key={cada.titulo}
            className={[estilos.dot, i <= indice ? estilos.dotAtivo : undefined]
              .filter(Boolean)
              .join(' ')}
            aria-current={i === indice ? 'step' : undefined}
          >
            <span className="dsn-apenas-leitor">{ONBOARDING.rotuloDoPasso(i + 1)}</span>
          </li>
        ))}
      </ol>

      <div className={estilos.acoes}>
        {indice > 0 ? (
          <Botao
            type="button"
            variante="secundario"
            onClick={() => setIndice((atual) => atual - 1)}
            disabled={pendente}
          >
            {ONBOARDING.voltar}
          </Botao>
        ) : null}

        {ultimo ? (
          <form action={encerrar} className={estilos.formularioFinal}>
            <Botao type="submit" carregando={pendente} blocoInteiro>
              {ONBOARDING.finalizar}
            </Botao>
          </form>
        ) : (
          <Botao
            type="button"
            onClick={() => setIndice((atual) => atual + 1)}
            blocoInteiro
            disabled={pendente}
          >
            {ONBOARDING.avancar}
          </Botao>
        )}
      </div>

      <p className={estilos.nota}>{ONBOARDING.nota}</p>
    </>
  );
}
