'use client';

import { CampoNota } from '@/componentes/base/CampoNota';
import type { Criterio } from '@dissona/nucleo/modulos/avaliacao/tipos';
import { AVALIAR } from '@dissona/nucleo/textos/avaliacao';

import estilos from './NotaDoCriterio.module.css';

export type PropsNotaDoCriterio = {
  readonly criterio: Criterio;
  /** `null` é "ainda não avaliei", que não é nota 0,0. */
  readonly nota: number | null;
  readonly onNotaMudar: (nota: number | null) => void;
  /** De `configuracao.criterios_obrigatorios`, não de `criterio.obrigatorio`. */
  readonly obrigatorio: boolean;
  /** O critério cuja justificativa está aberta no painel ao lado. */
  readonly ativo: boolean;
  /** Já tem justificativa que rende acréscimo — marca a linha. */
  readonly justificado: boolean;
  readonly onAtivar: () => void;
};

export type PropsJustificativaDoCriterio = {
  readonly criterio: Criterio;
  readonly justificativa: string;
  readonly onJustificativaMudar: (texto: string) => void;
  /** `configuracao.justificativa_min_caracteres` — o piso do acréscimo. */
  readonly minimoJustificativa: number;
  /** Fora do painel continua no formulário (é enviado), só não aparece. */
  readonly visivel: boolean;
};

/**
 * Uma linha da tabela de critérios (14): nota, justificativa e contador.
 *
 * ## Por que há um `<input type="hidden">`
 *
 * `CampoNota` é um `<input type="range">` sem `name` — ele é controlado por
 * `valor`/`onMudar`, e um range sempre tem posição. Se o `name` estivesse nele,
 * um critério nunca tocado enviaria `0`, e nota 0,0 é uma avaliação: baixaria a
 * média objetiva de quem só respondeu os cinco obrigatórios. O campo escondido
 * envia string vazia enquanto não houver nota, que é o que `valorDeNotaOpcional`
 * lê como `null`.
 *
 * ## O contador conta o mínimo, não o máximo
 *
 * `AreaTexto` tem um `limite` embutido, e ele significa **teto** — passar dele
 * pinta o contador de vermelho. Aqui o número é o oposto: 250 é o piso a partir
 * do qual o acréscimo entra, e ultrapassá-lo é bom. Por isso o `<textarea>` é
 * cru e o contador é próprio.
 */
export function NotaDoCriterio({
  criterio,
  nota,
  onNotaMudar,
  obrigatorio,
  ativo,
  justificado,
  onAtivar,
}: PropsNotaDoCriterio) {
  // Na tela só o nome, como no protótipo aprovado (o cartão já diz que é
  // obrigatório); o "· obrig." segue no nome acessível.
  const rotulo = (
    <>
      {criterio.rotulo}
      {obrigatorio ? (
        <span className="dsn-apenas-leitor">{` · ${AVALIAR.criterioObrigatorio}`}</span>
      ) : null}
    </>
  );

  return (
    // Foco ou clique em qualquer parte da linha abre a justificativa dela no
    // painel ao lado — o comportamento do protótipo aprovado.
    <div
      className={[estilos.base, ativo ? estilos.ativo : undefined].filter(Boolean).join(' ')}
      onFocusCapture={onAtivar}
      onPointerDownCapture={onAtivar}
      data-justificado={justificado || undefined}
    >
      <div className={estilos.linha}>
        <CampoNota
          rotulo={rotulo}
          valor={nota}
          onMudar={onNotaMudar}
          textoSemNota={AVALIAR.semNota}
          semExtremos
        />

        {/* Só aparece depois de haver o que remover, e só no critério aberto:
            o protótipo não tem o botão, e onze dele apertariam os sliders. O
            foco no slider abre o critério, então o Tab seguinte chega nele. */}
        {nota === null || !ativo ? null : (
          <button
            type="button"
            className={estilos.remover}
            onClick={() => onNotaMudar(null)}
            aria-label={`${AVALIAR.removerNota}: ${criterio.rotulo}`}
          >
            {AVALIAR.removerNota}
          </button>
        )}
      </div>

      <input type="hidden" name={`nota.${criterio.chave}`} value={nota === null ? '' : nota} />
    </div>
  );
}

/**
 * A justificativa de um critério, no painel ao lado das notas.
 *
 * Todas ficam no formulário — as fechadas com `hidden`, que ainda envia —, e
 * cada uma mantém o próprio rótulo. Só a do critério ativo aparece.
 */
export function JustificativaDoCriterio({
  criterio,
  justificativa,
  onJustificativaMudar,
  minimoJustificativa,
  visivel,
}: PropsJustificativaDoCriterio) {
  const escritos = justificativa.trim().length;
  const rende = escritos >= minimoJustificativa;
  const idJustificativa = `justificativa-${criterio.chave}`;
  const idContador = `${idJustificativa}-contador`;

  return (
    <div className={estilos.justificativaBloco} hidden={!visivel}>
      <label className={estilos.rotuloJustificativa} htmlFor={idJustificativa}>
        {AVALIAR.justificativaDe(criterio.rotulo)}
      </label>

      <textarea
        id={idJustificativa}
        name={`justificativa.${criterio.chave}`}
        className={estilos.justificativa}
        value={justificativa}
        onChange={(evento) => onJustificativaMudar(evento.target.value)}
        placeholder={AVALIAR.justificativaPlaceholder}
        rows={8}
        aria-describedby={idContador}
      />

      <div className={estilos.rodape} id={idContador}>
        <span className={rende ? estilos.dicaAtingida : estilos.dica}>
          {rende ? AVALIAR.justificativaValida : AVALIAR.justificativaDica(minimoJustificativa)}
        </span>
        <span className={rende ? estilos.contadorAtingido : estilos.contador}>
          {escritos} / {minimoJustificativa}
        </span>
      </div>
    </div>
  );
}
