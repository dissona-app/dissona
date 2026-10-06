'use client';

import { useActionState, useState } from 'react';

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

export type PropsPassoCompartilhamento = {
  readonly envioId: string;
  readonly avaliacao: AvaliacaoEmEdicao;
  readonly voltarPara: string;
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
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
export function PassoCompartilhamento({
  envioId,
  avaliacao,
  voltarPara,
  acao,
}: PropsPassoCompartilhamento) {
  const [modalidade, setModalidade] = useState<ModalidadeCompartilhamento | ''>(
    avaliacao.compartilhamento?.modalidade ?? '',
  );
  const [url, setUrl] = useState(avaliacao.compartilhamento?.url ?? '');

  const [resultado, enviar] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acao(dados),
    null,
  );

  // O link não se aplica a quem declara que não vai compartilhar: o `check`
  // `compartilhamento_nao_compartilhou_e_vazio` recusa os dois juntos.
  const aceitaLink = modalidade !== '' && modalidade !== 'nao_compartilhou';

  return (
    <form action={enviar} id={ID_DO_FORMULARIO} className={estilos.formulario}>
      <input type="hidden" name="envioId" value={envioId} />

      {resultado !== null && !resultado.ok ? (
        <Aviso tom="erro">{AVALIAR.erroInesperado}</Aviso>
      ) : null}

      <p className={estilos.nota}>{AVALIAR.compartilhamentoNota}</p>

      <fieldset className={estilos.grupo}>
        <legend className={estilos.legenda}>{AVALIAR.compartilhamentoRotulo}</legend>

        <div className={estilos.cartoes}>
          {MODALIDADES_DE_DIVULGACAO.map((chave) => (
            <label key={chave} className={estilos.cartao}>
              <input
                type="radio"
                name="modalidade"
                value={chave}
                className={estilos.entrada}
                checked={modalidade === chave}
                onChange={() => setModalidade(chave)}
                required
              />
              <span className={estilos.pintura}>
                <span className={estilos.rotulo}>{AVALIAR.modalidades[chave].rotulo}</span>
                <span className={estilos.apoio}>{AVALIAR.modalidades[chave].apoio}</span>
                <span className={estilos.estado}>
                  {modalidade === chave ? AVALIAR.selecionado : AVALIAR.marcar}
                </span>
              </span>
            </label>
          ))}
        </div>

        {/* Fora da grade dos quatro, como no protótipo: recusar não é uma
            quinta forma de divulgar. */}
        <label className={estilos.recusa}>
          <input
            type="radio"
            name="modalidade"
            value="nao_compartilhou"
            className={estilos.entrada}
            checked={modalidade === 'nao_compartilhou'}
            onChange={() => setModalidade('nao_compartilhou')}
          />
          <span className={estilos.pinturaRecusa}>
            <span className={estilos.rotulo}>{AVALIAR.modalidades.nao_compartilhou.rotulo}</span>
            <span className={estilos.apoio}>{AVALIAR.modalidades.nao_compartilhou.apoio}</span>
          </span>
        </label>
      </fieldset>

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
