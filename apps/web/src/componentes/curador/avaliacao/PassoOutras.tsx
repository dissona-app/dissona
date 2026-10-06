'use client';

import { useActionState, useState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Campo } from '@/componentes/base/Campo';
import type { ResultadoDeAcao } from '@/lib/acoes';
import type { AvaliacaoEmEdicao } from '@/modulos/avaliacao/tipos';
import { AVALIAR } from '@/textos/avaliacao';

import { AcoesDaAvaliacao } from './AcoesDaAvaliacao';
import { ID_DO_FORMULARIO } from './MolduraDaAvaliacao';
import estilos from './PassoOutras.module.css';

export type PropsPassoOutras = {
  readonly envioId: string;
  readonly avaliacao: AvaliacaoEmEdicao;
  readonly voltarPara: string;
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
};

const MOTIVOS: Readonly<Record<string, string>> = {
  descricao_longa: AVALIAR.erroOutrosSemDescricao,
};

/**
 * 14.3 · "Outras formas de divulgação".
 *
 * Existe só quando a modalidade escolhida em 14.2 é `outros` — `proximoPasso`
 * a pula nas outras quatro, e é o que o protótipo faz (`avStep: st.avShare.outros
 * ? 3 : 4`).
 *
 * A descrição é obrigatória por `check` do banco
 * (`compartilhamento_outros_exige_descricao`): sem dizer onde a faixa vai
 * circular, a equipe não tem o que conferir antes de liberar o acréscimo. O
 * `required` aqui é o aviso; o `check` é a regra.
 *
 * As sugestões preenchem o campo em vez de serem opções fechadas — "Rádio,
 * newsletter, podcast, aula" é uma lista de exemplos, não um enum, e fechá-la
 * excluiria a quinta forma que ninguém previu.
 */
export function PassoOutras({ envioId, avaliacao, voltarPara, acao }: PropsPassoOutras) {
  const [descricao, setDescricao] = useState(avaliacao.compartilhamento?.descricao ?? '');
  const [url, setUrl] = useState(avaliacao.compartilhamento?.url ?? '');

  const [resultado, enviar] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acao(dados),
    null,
  );

  const falhou = resultado !== null && !resultado.ok;
  const erro = falhou ? MOTIVOS[resultado.campos?.['descricao'] ?? ''] : undefined;

  return (
    <form action={enviar} id={ID_DO_FORMULARIO} className={estilos.formulario}>
      <input type="hidden" name="envioId" value={envioId} />

      {falhou && erro === undefined ? <Aviso tom="erro">{AVALIAR.erroInesperado}</Aviso> : null}

      <p className={estilos.nota}>{AVALIAR.outrasNota}</p>

      <Campo
        rotulo={AVALIAR.outrasRotulo}
        name="descricao"
        value={descricao}
        onChange={(evento) => setDescricao(evento.target.value)}
        placeholder={AVALIAR.outrasPlaceholder}
        required
        {...(erro === undefined ? {} : { erro })}
      />

      <div className={estilos.sugestoes}>
        {AVALIAR.outrasSugestoes.map((sugestao) => (
          <button
            key={sugestao}
            type="button"
            className={estilos.sugestao}
            onClick={() => setDescricao(sugestao)}
          >
            {sugestao}
          </button>
        ))}
      </div>

      <Campo
        rotulo={AVALIAR.outrasUrlRotulo}
        name="url"
        type="url"
        inputMode="url"
        placeholder={AVALIAR.outrasUrlPlaceholder}
        value={url}
        onChange={(evento) => setUrl(evento.target.value)}
      />

      <AcoesDaAvaliacao voltarPara={voltarPara} proximoEhRemuneracao />
    </form>
  );
}
