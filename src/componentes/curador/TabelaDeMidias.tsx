'use client';

import { useActionState, useCallback, useState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Botao } from '@/componentes/base/Botao';
import { Etiqueta } from '@/componentes/base/Etiqueta';
import { Modal } from '@/componentes/base/Modal';
import type { ResultadoDeAcao } from '@/lib/acoes';
import type { CanalDoCurador } from '@/modulos/curador/tipos';
import { CURADOR_CADASTRO, CURADOR_MANUTENCAO } from '@/textos/curador';
import { mensagemDaFalha } from '@/textos/erros';

import { ModalDeMidia } from './ModalDeMidia';
import estilos from './TabelaDeMidias.module.css';

const ROTULO_DO_TIPO: Readonly<Record<string, string>> = Object.fromEntries(
  CURADOR_CADASTRO.tiposDeCanal.map((tipo) => [tipo.valor, tipo.rotulo]),
);

export type PropsTabelaDeMidias = {
  readonly midias: readonly CanalDoCurador[];
  readonly acaoDeSalvar: (dados: FormData) => Promise<ResultadoDeAcao>;
  readonly acaoDeExcluir: (dados: FormData) => Promise<ResultadoDeAcao>;
};

/**
 * Tabela de mídias com inserir, editar e excluir (12.6).
 *
 * ## Por que não é `Tabela`
 *
 * O `Tabela` base ordena e pagina uma listagem de leitura. Aqui há três a seis
 * linhas com dois botões cada, e o que a tela precisa é da linha inteira ser
 * um alvo confortável — ordenar seis playlists por nome não é um problema que
 * alguém tenha. O Design System §2.4.3 registra que o R2 não usa `<table>`:
 * cada linha é um grid com as colunas do cabeçalho, e é isso que está aqui.
 *
 * ## Uma confirmação, não um `confirm()`
 *
 * O PRD pede "Excluir (com confirmação)". O diálogo é `persistente` e nomeia a
 * mídia — "'Playlist Indie BR' sai da sua lista" —, porque uma confirmação que
 * não diz sobre o que é serve só para ser clicada no automático.
 */
export function TabelaDeMidias({ midias, acaoDeSalvar, acaoDeExcluir }: PropsTabelaDeMidias) {
  const [aEditar, setAEditar] = useState<{ readonly midia: CanalDoCurador | undefined } | null>(
    null,
  );
  const [aExcluir, setAExcluir] = useState<CanalDoCurador | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // O fechamento e o aviso da exclusão acontecem **dentro** da ação, e não num
  // efeito que observa o resultado: aqui isto é o tratamento de um evento (o
  // envio do formulário), e um efeito que chama `setState` encadeia renders
  // sem precisar — é o que `react-hooks/set-state-in-effect` recusa.
  const [, excluir, excluindo] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => {
      setErro(null);
      const resultado = await acaoDeExcluir(dados);
      if (resultado.ok) {
        setAviso(CURADOR_MANUTENCAO.modalExcluir.sucesso);
        setAExcluir(null);
      } else {
        // A recusa **tem** de aparecer. Sem isto o modal ficava aberto e nada
        // dizia por quê — "falha sem mensagem é bug", e aqui ela era literal:
        // o resultado do `useActionState` era descartado.
        setErro(mensagemDaFalha(resultado));
      }
      return resultado;
    },
    null,
  );

  const fecharEdicao = useCallback(() => setAEditar(null), []);
  const anunciar = useCallback((mensagem: string) => setAviso(mensagem), []);

  return (
    <section className={estilos.base} aria-label={CURADOR_MANUTENCAO.midiasOverline}>
      <div className={estilos.cabecalho}>
        <span className={estilos.overline}>{CURADOR_MANUTENCAO.midiasOverline}</span>
        <Botao
          variante="secundario"
          tamanho="denso"
          onClick={() => setAEditar({ midia: undefined })}
        >
          {CURADOR_MANUTENCAO.inserirMidia}
        </Botao>
      </div>

      {erro === null ? null : <Aviso tom="erro">{erro}</Aviso>}
      {aviso === null ? null : <Aviso tom="sucesso">{aviso}</Aviso>}

      {midias.length === 0 ? (
        <div className={estilos.vazio}>
          <span className={estilos.vazioTitulo}>{CURADOR_MANUTENCAO.midiasVazias}</span>
          <span className={estilos.vazioNota}>{CURADOR_MANUTENCAO.midiasVaziasNota}</span>
        </div>
      ) : (
        <div className={estilos.lista}>
          <div className={estilos.linhaDeTitulo} aria-hidden="true">
            <span>{CURADOR_MANUTENCAO.colunaNome}</span>
            <span>{CURADOR_MANUTENCAO.colunaTipo}</span>
            <span>{CURADOR_MANUTENCAO.colunaLink}</span>
            <span />
          </div>

          <ul className={estilos.linhas}>
            {midias.map((midia) => (
              <li key={midia.id} className={estilos.linha}>
                <span className={estilos.nome}>{midia.nome}</span>

                <span className={estilos.tipo}>
                  <Etiqueta>{ROTULO_DO_TIPO[midia.tipo] ?? midia.tipo}</Etiqueta>
                </span>

                <a
                  className={estilos.link}
                  href={midia.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={CURADOR_MANUTENCAO.abrirEmNovaAba(midia.nome)}
                >
                  {midia.url}
                </a>

                <span className={estilos.acoesDaLinha}>
                  <Botao variante="ghost" onClick={() => setAEditar({ midia })}>
                    {CURADOR_MANUTENCAO.editarMidia}
                  </Botao>
                  <Botao variante="destrutivo" onClick={() => setAExcluir(midia)}>
                    {CURADOR_MANUTENCAO.excluirMidia}
                  </Botao>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ModalDeMidia
        alvo={aEditar}
        onFechar={fecharEdicao}
        acao={acaoDeSalvar}
        onSucesso={anunciar}
      />

      <Modal
        aberto={aExcluir !== null}
        onFechar={() => setAExcluir(null)}
        overline={CURADOR_MANUTENCAO.modalExcluir.overline}
        tomDoOverline="perigo"
        titulo={CURADOR_MANUTENCAO.modalExcluir.titulo}
        descricao={
          aExcluir === null ? undefined : CURADOR_MANUTENCAO.modalExcluir.alvo(aExcluir.nome)
        }
        largura="estreita"
        persistente
      >
        <form action={excluir} className={estilos.formularioDeExclusao}>
          {aExcluir === null ? null : <input type="hidden" name="midiaId" value={aExcluir.id} />}

          <p className={estilos.textoDeExclusao}>{CURADOR_MANUTENCAO.modalExcluir.texto}</p>

          <div className={estilos.acoesDoModal}>
            <Botao type="submit" variante="perigo" carregando={excluindo}>
              {excluindo
                ? CURADOR_MANUTENCAO.modalExcluir.enviando
                : CURADOR_MANUTENCAO.modalExcluir.enviar}
            </Botao>
            <Botao
              type="button"
              variante="neutro"
              onClick={() => setAExcluir(null)}
              disabled={excluindo}
            >
              {CURADOR_MANUTENCAO.modalExcluir.cancelar}
            </Botao>
          </div>
        </form>
      </Modal>
    </section>
  );
}
