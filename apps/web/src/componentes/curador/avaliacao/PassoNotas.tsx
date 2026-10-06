'use client';

import { useActionState, useState } from 'react';

import { Aviso } from '@dissona/nucleo/componentes/base/Aviso';
import { Painel } from '@/componentes/base/Painel';
import type { ResultadoDeAcao } from '@dissona/nucleo/lib/acoes';
import type {
  AvaliacaoEmEdicao,
  Criterio,
  RegrasDaAvaliacao,
} from '@dissona/nucleo/modulos/avaliacao/tipos';
import { AVALIAR } from '@dissona/nucleo/textos/avaliacao';

import { AcoesDaAvaliacao } from './AcoesDaAvaliacao';
import { ID_DO_FORMULARIO } from './MolduraDaAvaliacao';
import { NotaDoCriterio } from './NotaDoCriterio';
import { PlayerComMedicao } from './PlayerComMedicao';
import estilos from './PassoNotas.module.css';

export type PropsPassoNotas = {
  readonly envioId: string;
  readonly titulo: string;
  readonly artista: string;
  readonly audioUrl: string | null;
  readonly avaliacao: AvaliacaoEmEdicao;
  readonly criterios: readonly Criterio[];
  readonly regras: RegrasDaAvaliacao;
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
};

/** Texto → estado inicial dos campos, indexado pela chave do critério. */
function estadoInicial(
  avaliacao: AvaliacaoEmEdicao,
  criterios: readonly Criterio[],
): {
  readonly notas: Record<string, number | null>;
  readonly justificativas: Record<string, string>;
} {
  const notas: Record<string, number | null> = {};
  const justificativas: Record<string, string> = {};

  for (const criterio of criterios) {
    const salva = avaliacao.notas.find((nota) => nota.criterio === criterio.chave);
    notas[criterio.chave] = salva?.nota ?? null;
    justificativas[criterio.chave] = salva?.justificativa ?? '';
  }

  return { notas, justificativas };
}

/**
 * 14 · Notas objetivas.
 *
 * O estado local existe por **dois** motivos, e nenhum deles é guardar o que
 * vai ser enviado — isso os campos já fazem sozinhos. Ele existe para o resumo
 * "N de M respondidos · K obrigatórios em aberto" recontar a cada mudança, e
 * para distinguir "sem nota" de "nota 0,0", que um `<input type="range">`
 * sozinho não distingue.
 *
 * Os critérios vêm do catálogo `criterio` (seed da `0008`), e os **obrigatórios**
 * de `configuracao.criterios_obrigatorios` — que é a lista que
 * `enviar_avaliacao` de fato consulta. `criterio.obrigatorio` é conveniência de
 * UI e pode divergir; usá-la aqui faria a tela prometer uma exigência diferente
 * da que o banco aplica.
 */
export function PassoNotas({
  envioId,
  titulo,
  artista,
  audioUrl,
  avaliacao,
  criterios,
  regras,
  acao,
}: PropsPassoNotas) {
  const inicial = estadoInicial(avaliacao, criterios);
  const [notas, setNotas] = useState(inicial.notas);
  const [justificativas, setJustificativas] = useState(inicial.justificativas);

  const [resultado, enviar] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acao(dados),
    null,
  );

  const obrigatorios = new Set(regras.criteriosObrigatorios);
  const respondidos = criterios.filter((c) => notas[c.chave] != null).length;
  const emAberto = regras.criteriosObrigatorios.filter((chave) => notas[chave] == null).length;

  const grupos = [...new Set(criterios.map((criterio) => criterio.grupo))];

  return (
    <form action={enviar} id={ID_DO_FORMULARIO} className={estilos.formulario}>
      <input type="hidden" name="envioId" value={envioId} />

      {resultado !== null && !resultado.ok ? (
        <Aviso tom="erro">{AVALIAR.erroInesperado}</Aviso>
      ) : null}

      <PlayerComMedicao
        envioId={envioId}
        src={audioUrl}
        titulo={titulo}
        artista={artista}
        minimoPercentual={regras.escutaMinimaPercentual}
        escutaSalva={avaliacao.escutaPercentual}
      />

      <Painel
        titulo={AVALIAR.tituloNotas}
        sublegenda={AVALIAR.resumoDosItens(respondidos, criterios.length, emAberto)}
        nivel={3}
      >
        <div className={estilos.grupos}>
          {grupos.map((grupo) => (
            <fieldset key={grupo} className={estilos.grupo}>
              <legend className={estilos.legenda}>{AVALIAR.grupos[grupo]}</legend>

              {criterios
                .filter((criterio) => criterio.grupo === grupo)
                .map((criterio) => (
                  <NotaDoCriterio
                    key={criterio.chave}
                    criterio={criterio}
                    nota={notas[criterio.chave] ?? null}
                    onNotaMudar={(nota) =>
                      setNotas((anterior) => ({ ...anterior, [criterio.chave]: nota }))
                    }
                    justificativa={justificativas[criterio.chave] ?? ''}
                    onJustificativaMudar={(texto) =>
                      setJustificativas((anterior) => ({ ...anterior, [criterio.chave]: texto }))
                    }
                    minimoJustificativa={regras.justificativaMinCaracteres}
                    obrigatorio={obrigatorios.has(criterio.chave)}
                  />
                ))}
            </fieldset>
          ))}
        </div>

        <p className={estilos.notaRodape}>
          {AVALIAR.notaDosCriterios(
            regras.criteriosObrigatorios.length,
            criterios.length,
            regras.justificativaMinCaracteres,
          )}
        </p>
      </Painel>

      <AcoesDaAvaliacao voltarPara={null} proximoEhRemuneracao={false} />
    </form>
  );
}
