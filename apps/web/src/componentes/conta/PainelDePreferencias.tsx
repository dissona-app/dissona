'use client';

import { useState, useTransition } from 'react';

import { Aviso } from '@dissona/nucleo/componentes/base/Aviso';
import { Etiqueta } from '@dissona/nucleo/componentes/base/Etiqueta';
import { Grupo } from '@/componentes/base/Grupo';
import { Painel } from '@/componentes/base/Painel';
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

  function alternar(evento: PreferenciaDeEvento, canal: Canal, ligado: boolean) {
    setErro(null);
    const anteriores = locais;

    setLocais((atuais) =>
      atuais.map((cada) =>
        cada.evento === evento.evento
          ? { ...cada, [canal === 'in_app' ? 'inApp' : 'email']: ligado }
          : cada,
      ),
    );

    iniciar(async () => {
      const resultado = await acaoDeCanal({ evento: evento.evento, canal, ligado });
      if (!resultado.ok) {
        setLocais(anteriores);
        setErro(
          resultado.detalhes?.['motivo'] === 'evento_critico'
            ? TEXTOS.erroCritico
            : TEXTOS.erroSalvar,
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

      <Painel
        titulo={TEXTOS.notificacoesTitulo}
        sublegenda={TEXTOS.criticoNota}
        acao={<span className={estilos.auto}>{TEXTOS.salvoAutomaticamente}</span>}
      >
        <table className={estilos.tabela}>
          <caption className="dsn-apenas-leitor">{TEXTOS.notificacoesTitulo}</caption>
          <thead>
            <tr>
              <th scope="col">{TEXTOS.colunaEvento}</th>
              <th scope="col" className={estilos.canal}>
                {TEXTOS.colunaInApp}
              </th>
              <th scope="col" className={estilos.canal}>
                {TEXTOS.colunaEmail}
              </th>
            </tr>
          </thead>
          <tbody>
            {locais.map((evento) => (
              <tr key={evento.evento}>
                <th scope="row" className={estilos.evento}>
                  <span>{evento.titulo}</span>
                  {evento.critico ? <Etiqueta tom="info">{TEXTOS.critico}</Etiqueta> : null}
                </th>

                <td className={estilos.canal}>
                  {evento.temInApp ? (
                    <input
                      type="checkbox"
                      checked={evento.inApp}
                      disabled={evento.critico}
                      aria-label={`${TEXTOS.colunaInApp} · ${evento.titulo}`}
                      onChange={(e) => alternar(evento, 'in_app', e.target.checked)}
                    />
                  ) : null}
                </td>

                <td className={estilos.canal}>
                  {evento.temEmail ? (
                    <input
                      type="checkbox"
                      checked={evento.email}
                      disabled={evento.critico}
                      aria-label={`${TEXTOS.colunaEmail} · ${evento.titulo}`}
                      onChange={(e) => alternar(evento, 'email', e.target.checked)}
                    />
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Painel>

      <Painel
        titulo={TEXTOS.idiomaTitulo}
        sublegenda={ambiente === 'artista' ? TEXTOS.idiomaNotaArtista : TEXTOS.idiomaNotaCurador}
        nivel={3}
      >
        <Grupo
          rotulo={TEXTOS.idiomaTitulo}
          rotuloOculto
          opcoes={IDIOMAS.map((cada) => ({ valor: cada, rotulo: TEXTOS.idiomas[cada] }))}
          valor={idiomaLocal}
          onMudar={trocarIdioma}
        />
      </Painel>
    </div>
  );
}
