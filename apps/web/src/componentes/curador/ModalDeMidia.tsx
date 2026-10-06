'use client';

import { useActionState, useEffect } from 'react';

import { Aviso } from '@dissona/nucleo/componentes/base/Aviso';
import { Botao } from '@dissona/nucleo/componentes/base/Botao';
import { Campo } from '@dissona/nucleo/componentes/base/Campo';
import { Modal } from '@dissona/nucleo/componentes/base/Modal';
import { Selecao } from '@dissona/nucleo/componentes/base/Selecao';
import type { ResultadoDeAcao } from '@dissona/nucleo/lib/acoes';
import type { CanalDoCurador } from '@dissona/nucleo/modulos/curador/tipos';
import { erroGeralDe } from '@dissona/nucleo/textos/erros';
import { CURADOR_CADASTRO, CURADOR_MANUTENCAO } from '@dissona/nucleo/textos/curador';

import estilos from './ModalDeMidia.module.css';

const MOTIVOS: Readonly<Record<string, string>> = {
  midia_sem_nome: CURADOR_MANUTENCAO.erroMidiaSemNome,
  midia_nome_longo: CURADOR_MANUTENCAO.erroMidiaNomeLongo,
  midia_tipo: CURADOR_MANUTENCAO.erroMidiaTipo,
  midia_invalida: CURADOR_MANUTENCAO.erroMidiaTipo,
  link_vazio: CURADOR_MANUTENCAO.erroMidiaLinkVazio,
  link_com_espaco: CURADOR_MANUTENCAO.erroMidiaLink,
  link_invalido: CURADOR_MANUTENCAO.erroMidiaLink,
};

export type PropsModalDeMidia = {
  /** `null` fecha o modal; `undefined` no `midia` significa inserção. */
  readonly alvo: { readonly midia: CanalDoCurador | undefined } | null;
  readonly onFechar: () => void;
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
  readonly onSucesso: (mensagem: string) => void;
};

/**
 * Inserir e editar mídia (12.6) — um modal para os dois.
 *
 * A diferença entre inserir e editar é um `input` oculto com o `id`, e é essa a
 * razão de ser um componente só: os campos, a validação e as mensagens são
 * idênticos, e dois modais dariam duas listas de erro para manter iguais.
 *
 * `alvo` combina "está aberto" e "sobre o quê" num valor. Com dois estados
 * separados existiria o par impossível — aberto sem alvo —, e é justamente ele
 * que produz o modal de edição com os campos em branco.
 *
 * O `key` no formulário força a remontagem quando o alvo troca: sem ele, abrir
 * "Editar" numa mídia depois de outra reaproveitaria os `defaultValue`
 * anteriores, porque o React vê o mesmo `<input>` no mesmo lugar.
 */
export function ModalDeMidia({ alvo, onFechar, acao, onSucesso }: PropsModalDeMidia) {
  const [resultado, enviar, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acao(dados),
    null,
  );

  const midia = alvo?.midia;
  const edicao = midia !== undefined;

  useEffect(() => {
    if (resultado === null || !resultado.ok) return;
    onSucesso(
      edicao
        ? CURADOR_MANUTENCAO.modalMidia.sucessoEdicao
        : CURADOR_MANUTENCAO.modalMidia.sucessoNova,
    );
    onFechar();
  }, [resultado, edicao, onSucesso, onFechar]);

  const falhou = resultado !== null && !resultado.ok;
  const erroDe = (campo: string): string | undefined => {
    if (!falhou) return undefined;
    const motivo = resultado.campos?.[campo];
    return motivo === undefined ? undefined : MOTIVOS[motivo];
  };

  // `NAO_ENCONTRADO` ao editar mídia de outra pessoa e `NAO_AUTORIZADO` vêm
  // sem campo: o modal ficava aberto, intacto, sem dizer o que houve.
  const erroGeral = erroGeralDe(falhou ? resultado : null, [
    erroDe('nome'),
    erroDe('tipo'),
    erroDe('link'),
  ]);

  return (
    <Modal
      aberto={alvo !== null}
      onFechar={onFechar}
      overline={
        edicao
          ? CURADOR_MANUTENCAO.modalMidia.overlineEdicao
          : CURADOR_MANUTENCAO.modalMidia.overlineNova
      }
      titulo={
        edicao
          ? CURADOR_MANUTENCAO.modalMidia.tituloEdicao
          : CURADOR_MANUTENCAO.modalMidia.tituloNova
      }
      descricao={CURADOR_MANUTENCAO.modalMidia.texto}
      largura="estreita"
      persistente
    >
      <form key={midia?.id ?? 'nova'} action={enviar} className={estilos.formulario} noValidate>
        {midia === undefined ? null : <input type="hidden" name="midiaId" value={midia.id} />}

        {erroGeral === undefined ? null : <Aviso tom="erro">{erroGeral}</Aviso>}

        <Campo
          name="nome"
          rotulo={CURADOR_MANUTENCAO.colunaNome}
          placeholder={CURADOR_CADASTRO.placeholderNomeDoCanal}
          defaultValue={midia?.nome ?? ''}
          required
          erro={erroDe('nome')}
        />

        <Selecao
          name="tipo"
          rotulo={CURADOR_MANUTENCAO.colunaTipo}
          defaultValue={midia?.tipo ?? CURADOR_CADASTRO.tiposDeCanal[0].valor}
          opcoes={CURADOR_CADASTRO.tiposDeCanal.map((tipo) => ({
            valor: tipo.valor,
            rotulo: tipo.rotulo,
          }))}
          erro={erroDe('tipo')}
        />

        <Campo
          name="link"
          type="text"
          inputMode="url"
          rotulo={CURADOR_MANUTENCAO.colunaLink}
          placeholder={CURADOR_CADASTRO.placeholderLinkDoCanal}
          defaultValue={midia?.url ?? ''}
          required
          erro={erroDe('link')}
        />

        <div className={estilos.acoes}>
          <Botao type="submit" carregando={pendente}>
            {pendente
              ? CURADOR_MANUTENCAO.modalMidia.enviando
              : CURADOR_MANUTENCAO.modalMidia.enviar}
          </Botao>
          <Botao type="button" variante="neutro" onClick={onFechar} disabled={pendente}>
            {CURADOR_MANUTENCAO.modalMidia.cancelar}
          </Botao>
        </div>
      </form>
    </Modal>
  );
}
