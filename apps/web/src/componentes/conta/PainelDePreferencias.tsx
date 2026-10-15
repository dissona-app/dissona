'use client';

import { useState, useTransition } from 'react';

import { Aviso } from '@dissona/nucleo/componentes/base/Aviso';
import type { ResultadoDeAcao } from '@dissona/nucleo/lib/acoes';
import type { Papel } from '@dissona/nucleo/lib/papeis';
import type { Canal, Idioma, PreferenciaDeEvento } from '@/modulos/preferencias/tipos';
import { IDIOMAS } from '@/modulos/preferencias/tipos';
import { PREFERENCIAS as TEXTOS } from '@dissona/nucleo/textos/conta';

import estilos from './PainelDePreferencias.module.css';

export type PropsPainelDePreferencias = {
  readonly ambiente: Extract<Papel, 'artista' | 'curador'>;
  readonly eventos: readonly PreferenciaDeEvento[];
  readonly idioma: Idioma;
  readonly acaoDeCanal: (entrada: unknown) => Promise<ResultadoDeAcao>;
  readonly acaoDeIdioma: (entrada: unknown) => Promise<ResultadoDeAcao>;
};

/**
 * 7.3 / 17.3 · Preferências.
 *
 * Salva a cada toque, sem botão — é o que o protótipo diz ("Salvo
 * automaticamente"). O estado é otimista: a caixa vira na hora e só volta se a
 * ação falhar. Numa lista de dezenas de avisos, esperar o round trip a cada
 * clique faria a tela parecer travada.
 *
 * Evento crítico aparece **travado e com etiqueta**, e não escondido: a pessoa
 * precisa saber que aquele aviso existe e que ele vai chegar de qualquer jeito.
 * A trava real é do servidor — a ação lê a criticidade do catálogo e
 * `exigirQuePossaAlternar` recusa o desligamento. Esta aqui é só para a tela
 * não oferecer o que o servidor nega.
 */
export function PainelDePreferencias({
  ambiente,
  eventos,
  idioma,
  acaoDeCanal,
  acaoDeIdioma,
}: PropsPainelDePreferencias) {
  const [, iniciar] = useTransition();
  const [locais, setLocais] = useState<readonly PreferenciaDeEvento[]>(eventos);
  const [idiomaLocal, setIdiomaLocal] = useState<Idioma>(idioma);
  const [erro, setErro] = useState<string | null>(null);

  // As categorias do protótipo, com os eventos que existem para esta conta.
  const categorias = TEXTOS.categorias[ambiente].map((categoria) => {
    const doGrupo = locais.filter((evento) =>
      (categoria.eventos as readonly string[]).includes(evento.evento),
    );
    const critica = doGrupo.length > 0 && doGrupo.every((evento) => evento.critico);
    const ligada = doGrupo.some(
      (evento) => (evento.temInApp && evento.inApp) || (evento.temEmail && evento.email),
    );
    return { ...categoria, doGrupo, critica, ligada };
  });

  function alternarCategoria(doGrupo: readonly PreferenciaDeEvento[], ligado: boolean) {
    setErro(null);
    const anteriores = locais;
    const alvos = doGrupo.filter((evento) => !evento.critico);

    setLocais((atuais) =>
      atuais.map((cada) =>
        alvos.some((alvo) => alvo.evento === cada.evento)
          ? {
              ...cada,
              inApp: cada.temInApp ? ligado : cada.inApp,
              email: cada.temEmail ? ligado : cada.email,
            }
          : cada,
      ),
    );

    iniciar(async () => {
      const chamadas: Promise<ResultadoDeAcao>[] = [];
      for (const evento of alvos) {
        const canais: Canal[] = [];
        if (evento.temInApp) canais.push('in_app');
        if (evento.temEmail) canais.push('email');
        for (const canal of canais) {
          chamadas.push(acaoDeCanal({ evento: evento.evento, canal, ligado }));
        }
      }
      const resultados = await Promise.all(chamadas);
      const falha = resultados.find((resultado) => !resultado.ok);
      if (falha !== undefined && !falha.ok) {
        setLocais(anteriores);
        setErro(
          falha.detalhes?.['motivo'] === 'evento_critico' ? TEXTOS.erroCritico : TEXTOS.erroSalvar,
        );
      }
    });
  }

  function trocarIdioma(novo: Idioma) {
    setErro(null);
    const anterior = idiomaLocal;
    setIdiomaLocal(novo);

    iniciar(async () => {
      const resultado = await acaoDeIdioma({ idioma: novo });
      if (!resultado.ok) {
        setIdiomaLocal(anterior);
        setErro(TEXTOS.erroSalvar);
      }
    });
  }

  return (
    <div className={estilos.base}>
      {erro !== null ? <Aviso tom="erro">{erro}</Aviso> : null}

      {/* Protótipo aprovado: um cartão só — as categorias com interruptor e,
          no pé, o idioma da interface. */}
      <section className={estilos.cartao} aria-labelledby="titulo-notificacoes">
        <div className={estilos.cabecalho}>
          <h2 id="titulo-notificacoes" className={estilos.overline}>
            {TEXTOS.notificacoesTitulo}
          </h2>
          <span className={estilos.auto}>{TEXTOS.salvoAutomaticamente}</span>
        </div>

        <ul className={estilos.categorias}>
          {categorias.map((categoria, indice) => {
            const semEvento = categoria.doGrupo.length === 0;
            const travada = categoria.critica || semEvento;
            const id = `categoria-de-aviso-${indice}`;
            return (
              <li key={categoria.titulo} className={estilos.categoria}>
                <span className={estilos.textos}>
                  <span className={estilos.titulo} id={id}>
                    {categoria.titulo}
                  </span>
                  <span className={estilos.texto}>{categoria.texto}</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  className={estilos.interruptor}
                  aria-checked={categoria.critica ? true : categoria.ligada}
                  aria-labelledby={id}
                  aria-disabled={travada || undefined}
                  title={
                    categoria.critica
                      ? `${TEXTOS.critico}. ${TEXTOS.criticoNota}`
                      : semEvento
                        ? TEXTOS.novidadesPendente
                        : undefined
                  }
                  onClick={() => {
                    if (travada) return;
                    alternarCategoria(categoria.doGrupo, !categoria.ligada);
                  }}
                >
                  <span className={estilos.bolinha} />
                  {categoria.critica ? (
                    <span className="dsn-apenas-leitor">{` — ${TEXTOS.critico}`}</span>
                  ) : null}
                </button>
              </li>
            );
          })}

          <li className={estilos.categoria}>
            <label className={estilos.titulo} htmlFor="idioma-da-interface">
              {TEXTOS.idiomaTitulo}
            </label>
            <select
              id="idioma-da-interface"
              className={estilos.selecao}
              value={idiomaLocal}
              onChange={(evento) => trocarIdioma(evento.target.value as Idioma)}
            >
              {IDIOMAS.map((cada) => (
                <option key={cada} value={cada}>
                  {TEXTOS.idiomas[cada]}
                </option>
              ))}
            </select>
          </li>
        </ul>
      </section>
    </div>
  );
}
