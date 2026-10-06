'use client';

import { CampoNota } from '@/componentes/base/CampoNota';
import type { Criterio } from '@/modulos/avaliacao/tipos';
import { AVALIAR } from '@/textos/avaliacao';

import estilos from './NotaDoCriterio.module.css';

export type PropsNotaDoCriterio = {
  readonly criterio: Criterio;
  /** `null` é "ainda não avaliei", que não é nota 0,0. */
  readonly nota: number | null;
  readonly onNotaMudar: (nota: number | null) => void;
  readonly justificativa: string;
  readonly onJustificativaMudar: (texto: string) => void;
  /** `configuracao.justificativa_min_caracteres` — o piso do acréscimo. */
  readonly minimoJustificativa: number;
  /** De `configuracao.criterios_obrigatorios`, não de `criterio.obrigatorio`. */
  readonly obrigatorio: boolean;
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
  justificativa,
  onJustificativaMudar,
  minimoJustificativa,
  obrigatorio,
}: PropsNotaDoCriterio) {
  const escritos = justificativa.trim().length;
  const rende = escritos >= minimoJustificativa;
  const idJustificativa = `justificativa-${criterio.chave}`;
  const idContador = `${idJustificativa}-contador`;

  const rotulo = obrigatorio
    ? `${criterio.rotulo} · ${AVALIAR.criterioObrigatorio}`
    : criterio.rotulo;

  return (
    <div className={estilos.base}>
      <div className={estilos.linha}>
        <CampoNota
          rotulo={rotulo}
          valor={nota}
          onMudar={onNotaMudar}
          textoSemNota={AVALIAR.semNota}
        />

        {/* Só aparece depois de haver o que remover: um botão permanente de
            "remover" ao lado de um campo vazio é ruído. */}
        {nota === null ? null : (
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
        rows={3}
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
