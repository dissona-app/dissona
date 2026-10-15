'use client';

import { useState } from 'react';

import { Aviso } from '@dissona/nucleo/componentes/base/Aviso';
import { Campo } from '@dissona/nucleo/componentes/base/Campo';
import type { ResultadoDeAcao } from '@dissona/nucleo/lib/acoes';
import type {
  AvaliacaoEmEdicao,
  ModalidadeCompartilhamento,
} from '@dissona/nucleo/modulos/avaliacao/tipos';
import { MODALIDADES_DE_DIVULGACAO } from '@dissona/nucleo/modulos/avaliacao/tipos';
import { AVALIAR } from '@dissona/nucleo/textos/avaliacao';

import { AcoesDaAvaliacao } from './AcoesDaAvaliacao';
import { ID_DO_FORMULARIO } from './MolduraDaAvaliacao';
import estilos from './PassoCompartilhamento.module.css';
import { useAcaoDoFormulario } from '@dissona/nucleo/hooks/useAcaoDoFormulario';

export type PropsPassoCompartilhamento = {
  readonly envioId: string;
  readonly avaliacao: AvaliacaoEmEdicao;
  readonly voltarPara: string;
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
  /** A previsão da remuneração — o cartão ao lado, como no protótipo aprovado. */
  readonly previa?: {
    readonly aplicado: number;
    readonly piso: number;
    readonly teto: number;
    readonly classe: string;
  } | null;
};

/**
 * 14.2 · Compartilhamento.
 *
 * ## Radio, e não os cartões multisseleção do protótipo
 *
 * O protótipo deixa marcar playlist **e** post ao mesmo tempo. O banco guarda
 * uma linha por avaliação, com uma `modalidade` — `compartilhamento.avaliacao_id`
 * é `unique`. E o acréscimo é o mesmo 8% em qualquer caso, então a multiescolha
 * do protótipo não muda nem a remuneração nem o registro: ela só prometeria
 * gravar algo que não seria gravado.
 *
 * Os `<input type="radio">` são reais e visualmente escondidos, como em
 * `Chips`: a escolha viaja no `FormData` sem JavaScript, ←/→ percorre o grupo,
 * e o leitor de tela anuncia "opção 2 de 5" sem `role` escrito à mão.
 *
 * ⚠️ Para o E2E: o `<input>` fica sob o rótulo pintado, então `locator.check()`
 * é interceptado pelo `<label>`. Clique no texto, ou use `check({ force: true })`.
 */
/** A sigla de cada forma, no quadradinho lilás da linha (protótipo aprovado). */
const SIGLA: Readonly<Record<string, string>> = {
  playlist: 'PL',
  post: 'IG',
  materia: 'MT',
  outros: 'OU',
};

export function PassoCompartilhamento({
  envioId,
  avaliacao,
  voltarPara,
  acao,
  previa = null,
}: PropsPassoCompartilhamento) {
  const [modalidade, setModalidade] = useState<ModalidadeCompartilhamento | ''>(
    avaliacao.compartilhamento?.modalidade ?? '',
  );
  const [url, setUrl] = useState(avaliacao.compartilhamento?.url ?? '');

  const [resultado, enviar, , aoEnviar] = useAcaoDoFormulario<ResultadoDeAcao | null>(
    async (_anterior, dados) => acao(dados),
    null,
  );

  // O link não se aplica a quem declara que não vai compartilhar: o `check`
  // `compartilhamento_nao_compartilhou_e_vazio` recusa os dois juntos.
  const aceitaLink = modalidade !== '' && modalidade !== 'nao_compartilhou';

  return (
    <form action={enviar} onSubmit={aoEnviar} id={ID_DO_FORMULARIO} className={estilos.formulario}>
      <input type="hidden" name="envioId" value={envioId} />

      {resultado !== null && !resultado.ok ? (
        <Aviso tom="erro">{AVALIAR.erroInesperado}</Aviso>
      ) : null}

      {/* Protótipo aprovado: a pergunta em Anton, as formas em linhas e, ao
          lado, quanto esta entrega rende. */}
      <div className={estilos.cabecalho}>
        <h2 className={estilos.pergunta}>Onde a faixa vai circular?</h2>
        <p className={estilos.nota}>{AVALIAR.compartilhamentoNota}</p>
      </div>

      <div className={estilos.grade}>
        <fieldset className={estilos.grupo}>
          <legend className="dsn-apenas-leitor">{AVALIAR.compartilhamentoRotulo}</legend>

          <div className={estilos.linhas}>
            {MODALIDADES_DE_DIVULGACAO.map((chave) => (
              <label key={chave} className={estilos.linha}>
                <input
                  type="radio"
                  name="modalidade"
                  value={chave}
                  className={estilos.marcador}
                  checked={modalidade === chave}
                  onChange={() => setModalidade(chave)}
                  required
                />
                <span className={estilos.sigla} aria-hidden="true">
                  {SIGLA[chave]}
                </span>
                <span className={estilos.textos}>
                  <span className={estilos.rotulo}>{AVALIAR.modalidades[chave].rotulo}</span>
                  <span className={estilos.apoio}>{AVALIAR.modalidades[chave].apoio}</span>
                </span>
              </label>
            ))}
          </div>

          <span className={estilos.ou}>ou</span>

          {/* Fora das formas de divulgar: recusar não é uma quinta forma. */}
          <label className={estilos.linha}>
            <input
              type="radio"
              name="modalidade"
              value="nao_compartilhou"
              className={estilos.marcador}
              checked={modalidade === 'nao_compartilhou'}
              onChange={() => setModalidade('nao_compartilhou')}
            />
            <span className={estilos.textos}>
              <span className={estilos.rotulo}>{AVALIAR.modalidades.nao_compartilhou.rotulo}</span>
              <span className={estilos.apoio}>{AVALIAR.modalidades.nao_compartilhou.apoio}</span>
            </span>
          </label>
        </fieldset>

        {previa === null ? null : (
          <aside className={estilos.previa} aria-label="Remuneração desta entrega">
            <span className={estilos.previaRotulo}>Remuneração desta entrega</span>
            <p className={estilos.previaValor}>
              {previa.aplicado}%{' '}
              <span className={estilos.previaApoio}>
                {previa.aplicado > previa.piso ? 'com acréscimo' : 'sem acréscimo'}
              </span>
            </p>
            <dl className={estilos.previaLinhas}>
              <div>
                <dt>Piso da classe</dt>
                <dd>{previa.piso}%</dd>
              </div>
              <div>
                <dt>Teto da classe {previa.classe}</dt>
                <dd>{previa.teto}%</dd>
              </div>
            </dl>
            <p className={estilos.previaNota}>
              Escala da classe {previa.classe}. O crédito é liberado com ou sem compartilhamento.
            </p>
          </aside>
        )}
      </div>

      {aceitaLink ? (
        <Campo
          rotulo={AVALIAR.outrasUrlRotulo}
          name="url"
          type="url"
          inputMode="url"
          placeholder={AVALIAR.outrasUrlPlaceholder}
          value={url}
          onChange={(evento) => setUrl(evento.target.value)}
        />
      ) : null}

      <AcoesDaAvaliacao
        voltarPara={voltarPara}
        proximoEhRemuneracao={modalidade !== '' && modalidade !== 'outros'}
      />
    </form>
  );
}
