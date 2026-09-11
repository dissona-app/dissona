'use client';

import { useActionState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Botao } from '@/componentes/base/Botao';
import { Selecao } from '@/componentes/base/Selecao';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { CodigoErro } from '@/lib/erros';
import type { CelulaDaMatriz, PapelAdmin } from '@/modulos/equipe/tipos';
import { NivelDeAcesso, PAPEIS_ADMIN, celulaTravada } from '@/modulos/equipe/tipos';
import { EQUIPE } from '@/textos/prototipo';

import estilos from './MatrizDePermissoes.module.css';

const { papeis: TEXTOS } = EQUIPE;

const OPCOES_DE_NIVEL = [
  { valor: NivelDeAcesso.NENHUM, rotulo: TEXTOS.niveis.nenhum },
  { valor: NivelDeAcesso.LER, rotulo: TEXTOS.niveis.ler },
  { valor: NivelDeAcesso.ESCREVER, rotulo: TEXTOS.niveis.escrever },
];

export type PropsMatrizDePermissoes = {
  readonly celulas: readonly CelulaDaMatriz[];
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
  /** Sem permissão de escrita a matriz é leitura — nem `<select>` aparece. */
  readonly podeEditar: boolean;
};

/**
 * Matriz de papéis e permissões (27.4).
 *
 * ## Três níveis por célula, e não uma caixa
 *
 * O protótipo tem uma caixa por célula; a tabela `permissao_admin` tem
 * `pode_ler` **e** `pode_escrever`, granularidade adotada na divergência #7c.
 * Uma caixa não expressa dois booleanos: governando só a leitura, a escrita
 * ficaria congelada no seed para sempre; governando as duas, desligar e religar
 * daria escrita a quem só tinha leitura, sem ninguém pedir. A célula é um
 * `<select>` de três níveis, no grid do protótipo. Ver
 * `docs/prd/07-pendencias-e-divergencias.md` §B.3.
 *
 * ## Duas células travadas, nos dois lados
 *
 * A linha do `administrador` e a coluna de `equipe` não são editáveis — é o que
 * o protótipo desenha (`travado = adminRole || soAdmin`) e o que a RPC recusa
 * com `DS020`. Aqui elas aparecem como texto, sem controle: oferecer o que o
 * servidor vai negar é o pior dos casos, porque um `update` recusado pela RLS
 * afeta zero linhas **sem erro nenhum**.
 *
 * ## Um formulário para as dezesseis
 *
 * O protótipo tem um "Salvar" só, e a RPC recebe a matriz inteira em `jsonb`,
 * numa transação. Uma chamada por célula deixaria a matriz metade nova e metade
 * velha se falhasse no meio.
 */
export function MatrizDePermissoes({ celulas, acao, podeEditar }: PropsMatrizDePermissoes) {
  const [resultado, enviar, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acao(dados),
    null,
  );

  const nivelDaCelula = (papel: PapelAdmin, modulo: string): string => {
    // O `administrador` tem acesso total por definição, e a célula de `equipe`
    // dos outros é sempre negada. Nos dois casos a tabela concorda, mas o
    // fallback aqui é o que a tela **mostra** quando a linha ainda não existe.
    if (papel === 'administrador') return NivelDeAcesso.ESCREVER;
    const encontrada = celulas.find((celula) => celula.papel === papel && celula.modulo === modulo);
    return encontrada?.nivel ?? NivelDeAcesso.NENHUM;
  };

  const falhou = resultado !== null && !resultado.ok;

  return (
    <form action={enviar} className={estilos.base}>
      <div className={estilos.cabecalho}>
        <div className={estilos.textos}>
          <span className={estilos.overline}>{TEXTOS.overline}</span>
          <span className={estilos.descricao}>{TEXTOS.texto}</span>
        </div>
        {PAPEIS_ADMIN.map((papel) => (
          <span key={papel.valor} className={estilos.nomeDoPapel}>
            {papel.rotulo}
          </span>
        ))}
      </div>

      {TEXTOS.linhas.map((linha) => (
        <div key={linha.modulo} className={estilos.linha}>
          <div className={estilos.permissao}>
            <span className={estilos.permissaoRotulo}>{linha.rotulo}</span>
            <span className={estilos.permissaoDescricao}>{linha.descricao}</span>
          </div>

          {PAPEIS_ADMIN.map((papel) => {
            const travada = celulaTravada(papel.valor, linha.modulo);
            const nivel = nivelDaCelula(papel.valor, linha.modulo);

            if (travada || !podeEditar) {
              return (
                <span
                  key={papel.valor}
                  className={estilos.celulaFixa}
                  title={
                    papel.valor === 'administrador'
                      ? TEXTOS.rotuloAdministrador(linha.rotulo)
                      : TEXTOS.rotuloTravado(papel.rotulo, linha.rotulo)
                  }
                >
                  {rotuloDoNivel(nivel)}
                </span>
              );
            }

            return (
              <span key={papel.valor} className={estilos.celula}>
                {/* `celula` e `nivel` viajam como campos repetidos, na mesma
                    ordem. A ação recompõe `papel:modulo` a partir do primeiro. */}
                <input type="hidden" name="celula" value={`${papel.valor}:${linha.modulo}`} />
                <Selecao
                  name="nivel"
                  rotulo={TEXTOS.rotuloDaCelula(papel.rotulo, linha.rotulo)}
                  rotuloOculto
                  variante="tabela"
                  defaultValue={nivel}
                  opcoes={OPCOES_DE_NIVEL}
                  disabled={pendente}
                />
              </span>
            );
          })}
        </div>
      ))}

      <div className={estilos.rodape}>
        {podeEditar ? (
          <Botao type="submit" tamanho="denso" carregando={pendente}>
            {pendente ? TEXTOS.salvando : TEXTOS.salvar}
          </Botao>
        ) : null}

        <span className={estilos.nota}>{TEXTOS.notaAdministrador}</span>

        {resultado !== null && resultado.ok ? <Aviso tom="sucesso">{TEXTOS.salvo}</Aviso> : null}

        {falhou ? (
          <Aviso tom="erro">
            {resultado.codigo === CodigoErro.NAO_AUTORIZADO
              ? TEXTOS.erroSemPermissao
              : TEXTOS.erroMatriz}
          </Aviso>
        ) : null}
      </div>
    </form>
  );
}

function rotuloDoNivel(nivel: string): string {
  if (nivel === NivelDeAcesso.ESCREVER) return TEXTOS.niveis.escrever;
  if (nivel === NivelDeAcesso.LER) return TEXTOS.niveis.ler;
  return TEXTOS.niveis.nenhum;
}
