'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { Aviso } from '@dissona/nucleo/componentes/base/Aviso';
import type { ResultadoDeAcao } from '@dissona/nucleo/lib/acoes';
import type {
  AvaliacaoEmEdicao,
  Criterio,
  RegrasDaAvaliacao,
} from '@dissona/nucleo/modulos/avaliacao/tipos';
import { AVALIAR } from '@dissona/nucleo/textos/avaliacao';

import { AcoesDaAvaliacao } from './AcoesDaAvaliacao';
import { ID_DO_FORMULARIO, ID_DO_PLAYER } from './MolduraDaAvaliacao';
import { JustificativaDoCriterio, NotaDoCriterio } from './NotaDoCriterio';
import { PlayerComMedicao } from './PlayerComMedicao';
import estilos from './PassoNotas.module.css';
import { useAcaoDoFormulario } from '@dissona/nucleo/hooks/useAcaoDoFormulario';

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
 * Põe o player na coluna da capa, como no protótipo aprovado. O portal mantém
 * o player na árvore deste passo — o estado da escuta continua aqui — e, sem a
 * coluna (tela estreita, outra moldura), ele fica onde está.
 */
function NaColunaDaCapa({ children }: { readonly children: ReactNode }) {
  const [alvo, setAlvo] = useState<HTMLElement | null>(null);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    // Depois da hidratação: o servidor não conhece o `document`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAlvo(document.getElementById(ID_DO_PLAYER));
    setMontado(true);
  }, []);

  if (!montado) return null;
  return alvo === null ? <>{children}</> : createPortal(children, alvo);
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

  const [resultado, enviar, , aoEnviar] = useAcaoDoFormulario<ResultadoDeAcao | null>(
    async (_anterior, dados) => acao(dados),
    null,
  );

  const obrigatorios = new Set(regras.criteriosObrigatorios);
  const respondidos = criterios.filter((c) => notas[c.chave] != null).length;
  const emAberto = regras.criteriosObrigatorios.filter((chave) => notas[chave] == null).length;

  // Protótipo aprovado: obrigatórios num cartão, opcionais no outro, e a
  // justificativa do critério ativo no painel ao lado.
  const listaObrigatorios = criterios.filter((c) => obrigatorios.has(c.chave));
  const listaOpcionais = criterios.filter((c) => !obrigatorios.has(c.chave));
  const [ativo, setAtivo] = useState<string>(criterios[0]?.chave ?? '');
  const rende = (chave: string) =>
    (justificativas[chave] ?? '').trim().length >= regras.justificativaMinCaracteres;
  const justificados = criterios.filter((c) => rende(c.chave)).map((c) => c.rotulo);

  const cartao = (
    titulo: string,
    apoio: string,
    lista: readonly Criterio[],
    obrigatorio: boolean,
  ) =>
    lista.length === 0 ? null : (
      <fieldset className={estilos.cartao}>
        <legend className={estilos.legenda}>{titulo}</legend>
        <p className={estilos.apoio}>{apoio}</p>
        {/* Os cinco blocos do RF-059 continuam como `fieldset`s dentro de cada
            cartão: o leitor de tela anuncia "Mixagem" dizendo que é Produção. */}
        {[...new Set(lista.map((criterio) => criterio.grupo))].map((grupo) => (
          <fieldset key={grupo} className={estilos.grupo}>
            <legend className={estilos.legendaDoGrupo}>{AVALIAR.grupos[grupo]}</legend>
            <div className={estilos.linhas}>
              {lista
                .filter((criterio) => criterio.grupo === grupo)
                .map((criterio) => (
                  <NotaDoCriterio
                    key={criterio.chave}
                    criterio={criterio}
                    nota={notas[criterio.chave] ?? null}
                    onNotaMudar={(nota) =>
                      setNotas((anterior) => ({ ...anterior, [criterio.chave]: nota }))
                    }
                    obrigatorio={obrigatorio}
                    ativo={ativo === criterio.chave}
                    justificado={rende(criterio.chave)}
                    onAtivar={() => setAtivo(criterio.chave)}
                  />
                ))}
            </div>
          </fieldset>
        ))}
      </fieldset>
    );

  return (
    <form action={enviar} onSubmit={aoEnviar} id={ID_DO_FORMULARIO} className={estilos.formulario}>
      <input type="hidden" name="envioId" value={envioId} />

      {resultado !== null && !resultado.ok ? (
        <Aviso tom="erro">{AVALIAR.erroInesperado}</Aviso>
      ) : null}

      <NaColunaDaCapa>
        <PlayerComMedicao
          envioId={envioId}
          src={audioUrl}
          titulo={titulo}
          artista={artista}
          minimoPercentual={regras.escutaMinimaPercentual}
          escutaSalva={avaliacao.escutaPercentual}
        />
      </NaColunaDaCapa>

      <div className={estilos.grade}>
        <div className={estilos.colunaNotas}>
          <h3 className={estilos.titulo}>{AVALIAR.tituloNotas}</h3>
          <p className={estilos.resumo}>
            {AVALIAR.resumoDosItens(respondidos, criterios.length, emAberto)}
          </p>
          {cartao(
            AVALIAR.grupoObrigatorios,
            AVALIAR.apoioObrigatorios(listaObrigatorios.length),
            listaObrigatorios,
            true,
          )}
          {cartao(AVALIAR.grupoOpcionais, AVALIAR.apoioOpcionais, listaOpcionais, false)}

          <p className={estilos.notaRodape}>
            {AVALIAR.notaDosCriterios(
              regras.criteriosObrigatorios.length,
              criterios.length,
              regras.justificativaMinCaracteres,
            )}
          </p>
        </div>

        <aside className={estilos.painel}>
          <p className={estilos.instrucao}>{AVALIAR.painelJustificativa}</p>
          {criterios.map((criterio) => (
            <JustificativaDoCriterio
              key={criterio.chave}
              criterio={criterio}
              justificativa={justificativas[criterio.chave] ?? ''}
              onJustificativaMudar={(texto) =>
                setJustificativas((anterior) => ({ ...anterior, [criterio.chave]: texto }))
              }
              minimoJustificativa={regras.justificativaMinCaracteres}
              visivel={ativo === criterio.chave}
            />
          ))}
          <p className={estilos.justificados}>{AVALIAR.justificados(justificados)}</p>
        </aside>
      </div>

      <AcoesDaAvaliacao voltarPara={null} proximoEhRemuneracao={false} />
    </form>
  );
}
