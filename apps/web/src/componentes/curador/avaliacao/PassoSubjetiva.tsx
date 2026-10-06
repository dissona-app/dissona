'use client';

import { useActionState, useState } from 'react';

import { Aviso } from '@dissona/nucleo/componentes/base/Aviso';
import { BarraProgresso } from '@/componentes/base/BarraProgresso';
import { CampoNota, NOTA_MAXIMA } from '@/componentes/base/CampoNota';
import { Painel } from '@/componentes/base/Painel';
import type { ResultadoDeAcao } from '@dissona/nucleo/lib/acoes';
import { mediaObjetiva, mediasPorGrupo } from '@/modulos/avaliacao/servico';
import type {
  AvaliacaoEmEdicao,
  Criterio,
  RegrasDaAvaliacao,
} from '@dissona/nucleo/modulos/avaliacao/tipos';
import { AVALIAR } from '@dissona/nucleo/textos/avaliacao';

import { AcoesDaAvaliacao } from './AcoesDaAvaliacao';
import { ID_DO_FORMULARIO } from './MolduraDaAvaliacao';
import estilos from './PassoSubjetiva.module.css';

export type PropsPassoSubjetiva = {
  readonly envioId: string;
  readonly avaliacao: AvaliacaoEmEdicao;
  readonly criterios: readonly Criterio[];
  readonly regras: RegrasDaAvaliacao;
  readonly voltarPara: string;
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
};

/**
 * A posição inicial do slider quando ainda não houve nota.
 *
 * O protótipo abre em 3,5 (`avSub: '3.5'`). É o meio da faixa útil, e não uma
 * opinião: um slider aberto em 0,0 sugeriria que a faixa já foi reprovada, e em
 * 5,0 que já foi aprovada.
 */
const NOTA_INICIAL = 3.5;

function formatar(valor: number): string {
  return valor.toFixed(1).replace('.', ',');
}

/**
 * 14.1 · Nota subjetiva e feedback escrito.
 *
 * O resumo do topo é leitura do que a etapa anterior gravou — média geral e
 * média por grupo, de `mediaObjetiva` e `mediasPorGrupo`, que são puras e
 * testadas. Ele não recalcula nada a partir dos campos desta tela.
 *
 * O feedback é `required` no HTML, e o esquema do servidor **não** o exige: o
 * `required` barra o "Avançar", e "Salvar e sair" o contorna com
 * `formNoValidate` porque interromper no meio é justamente o que ele serve
 * para fazer. A obrigatoriedade real é de `enviar_avaliacao` (`DS003`).
 */
export function PassoSubjetiva({
  envioId,
  avaliacao,
  criterios,
  regras,
  voltarPara,
  acao,
}: PropsPassoSubjetiva) {
  const [nota, setNota] = useState(avaliacao.notaSubjetiva ?? NOTA_INICIAL);
  const [feedback, setFeedback] = useState(avaliacao.feedback ?? '');

  const [resultado, enviar] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acao(dados),
    null,
  );

  const media = mediaObjetiva(avaliacao);
  const porGrupo = mediasPorGrupo(avaliacao, criterios);

  const escritos = feedback.trim().length;
  const rende = escritos >= regras.feedbackMinCaracteres;

  return (
    <form action={enviar} id={ID_DO_FORMULARIO} className={estilos.formulario}>
      <input type="hidden" name="envioId" value={envioId} />

      {resultado !== null && !resultado.ok ? (
        <Aviso tom="erro">{AVALIAR.erroInesperado}</Aviso>
      ) : null}

      <Painel titulo={AVALIAR.resumoObjetivo} nivel={3}>
        <p className={estilos.media}>
          <strong className={estilos.mediaValor}>
            {media === null ? AVALIAR.semNotaNoGrupo : formatar(media)}
          </strong>
          <span className={estilos.mediaApoio}>
            {AVALIAR.mediaDeCriterios(avaliacao.notas.length)}
          </span>
        </p>

        <ul className={estilos.grupos}>
          {[...porGrupo].map(([grupo, valor]) => (
            <li key={grupo} className={estilos.grupo}>
              <BarraProgresso
                percentual={valor === null ? 0 : (valor / NOTA_MAXIMA) * 100}
                rotulo={AVALIAR.grupos[grupo]}
                detalhe={valor === null ? AVALIAR.semNotaNoGrupo : formatar(valor)}
              />
            </li>
          ))}
        </ul>
      </Painel>

      <Painel titulo={AVALIAR.notaSubjetiva} sublegenda={AVALIAR.notaSubjetivaApoio} nivel={3}>
        {/* O rótulo do campo é diferente do título do painel de propósito —
            ver `notaSubjetivaCampo`. */}
        <CampoNota rotulo={AVALIAR.notaSubjetivaCampo} valor={nota} onMudar={setNota} />
        <input type="hidden" name="notaSubjetiva" value={nota} />

        <div className={estilos.campoFeedback}>
          <label className={estilos.rotulo} htmlFor="feedback">
            {AVALIAR.feedback}
          </label>

          <textarea
            id="feedback"
            name="feedback"
            className={estilos.feedback}
            value={feedback}
            onChange={(evento) => setFeedback(evento.target.value)}
            placeholder={AVALIAR.feedbackPlaceholder}
            rows={8}
            required
            aria-describedby="feedback-contador"
          />

          <div className={estilos.rodapeDoCampo} id="feedback-contador">
            <span className={rende ? estilos.dicaAtingida : estilos.dica}>
              {rende ? AVALIAR.feedbackValido : AVALIAR.feedbackDica(regras.feedbackMinCaracteres)}
            </span>
            <span className={rende ? estilos.contadorAtingido : estilos.contador}>
              {escritos} / {regras.feedbackMinCaracteres}
            </span>
          </div>
        </div>
      </Painel>

      <AcoesDaAvaliacao voltarPara={voltarPara} proximoEhRemuneracao={false} />
    </form>
  );
}
