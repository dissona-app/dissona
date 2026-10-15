'use client';

import { useActionState } from 'react';

import { Aviso } from '@dissona/nucleo/componentes/base/Aviso';
import { Botao } from '@dissona/nucleo/componentes/base/Botao';
import type { ResultadoDeAcao } from '@dissona/nucleo/lib/acoes';
import { erroGeralDe } from '@dissona/nucleo/textos/erros';
import { ONBOARDING } from '@dissona/nucleo/textos/prototipo';

import { useEstadoDoTour } from './estado-do-tour';
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
 * ## O passo é estado de cliente, e não rota
 *
 * `/onboarding?passo=3` seria alcançável, compartilhável e voltaria no
 * histórico — e nada disso serve a um tour de quatro telas. Com estado de
 * cliente, o "Voltar" do navegador sai do tour, que é o que a pessoa espera
 * dele. O estado fica em `estado-do-tour`, e não aqui, porque o painel lateral
 * também o controla.
 *
 * Os dots são um `<ol>` com `aria-current`, e não `role="tablist"`: eles não
 * são controles, e não há o que selecionar. O protótipo os faz `<button>`; aqui
 * são indicadores, e quem navega por teclado usa "Avançar" e "Voltar" — dois
 * alvos em vez de seis.
 */
export function TourDeOnboarding({ passos, acaoDeEncerrar, revendo }: PropsTourDeOnboarding) {
  // O passo vive no contexto porque o painel lateral (`NavegadorDoTour`) o
  // controla também — no protótipo as quatro linhas de lá são botões que saltam
  // para o passo, e as duas colunas leem o mesmo `obStep`.
  const { indice, irPara } = useEstadoDoTour();
  // `FormData` como carga, e ignorada: é o que `<form action>` entrega, e o
  // encerramento não tem campo nenhum. Tipar como `void` compilaria a chamada
  // e não o `<form>`.
  const [resultado, encerrar, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async () => acaoDeEncerrar(),
    ESTADO_INICIAL,
  );

  // A ação só volta com resultado quando **falha** — no sucesso ela redireciona
  // e este componente sai da tela. O único código possível é `NAO_AUTENTICADO`,
  // e sem esta linha o botão voltava ao repouso sem dizer que a sessão caiu.
  const erro = erroGeralDe(resultado !== null && !resultado.ok ? resultado : null, []);

  const total = passos.length;
  const passo = passos[indice];
  const ultimo = indice === total - 1;

  // `passos` vem de um registro literal e nunca é vazio, mas
  // `noUncheckedIndexedAccess` não sabe disso — e um `!` aqui esconderia o dia
  // em que alguém passar um array filtrado.
  if (passo === undefined) return null;

  return (
    <>
      {erro === undefined ? null : <Aviso tom="erro">{erro}</Aviso>}

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
        {/* Protótipo aprovado: um ícone por passo, num quadrado lilás. */}
        <span className={estilos.icone} aria-hidden="true">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {ICONES_DOS_PASSOS[indice % ICONES_DOS_PASSOS.length]}
          </svg>
        </span>
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
            onClick={() => irPara(indice - 1)}
            disabled={pendente}
          >
            {ONBOARDING.voltar}
          </Botao>
        ) : null}

        {ultimo ? (
          <form action={encerrar} className={estilos.formularioFinal}>
            <Botao type="submit" carregando={pendente}>
              {ONBOARDING.finalizar}
            </Botao>
          </form>
        ) : (
          <Botao type="button" onClick={() => irPara(indice + 1)} disabled={pendente}>
            {ONBOARDING.avancar}
          </Botao>
        )}
      </div>

      <p className={estilos.nota}>{ONBOARDING.nota}</p>
    </>
  );
}

/** Ondas e seta, folha, gráfico e alto-falante — um ícone por passo do tour. */
const ICONES_DOS_PASSOS = [
  <>
    <path d="M4 15V11" />
    <path d="M8 18V9" />
    <path d="M12 16v-5" />
    <path d="M16 6v12" />
    <path d="M20 3v4M18 5l2-2 2 2" />
  </>,
  <>
    <path d="M7 3h7l4 4v14H7z" />
    <path d="M14 3v4h4M10 12h5M10 16h5" />
  </>,
  <>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </>,
  <>
    <path d="M11 5L6 9H3v6h3l5 4z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
  </>,
] as const;
