'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { Aviso } from '@dissona/nucleo/componentes/base/Aviso';
import { Botao } from '@dissona/nucleo/componentes/base/Botao';
import { BotaoLink } from '@dissona/nucleo/componentes/base/BotaoLink';
import { EstadoVazio } from '@dissona/nucleo/componentes/base/EstadoVazio';
import { Etiqueta } from '@dissona/nucleo/componentes/base/Etiqueta';
import { Modal } from '@dissona/nucleo/componentes/base/Modal';
import { Tabela } from '@dissona/nucleo/componentes/base/Tabela';
import type { ColunaTabela } from '@dissona/nucleo/componentes/base/Tabela';
import { useHrefDoAdmin } from '@dissona/nucleo/componentes/shell/BaseDoAdmin';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { alternarAtivo, excluirPacote } from '@/modulos/pacote/acoes';
import { ADMIN_PACOTE_EXCLUIR, ADMIN_PACOTES } from '@dissona/nucleo/textos/prototipo';

import estilos from './ListaDePacotes.module.css';

/**
 * A linha, **já formatada no servidor**.
 *
 * Dois motivos, e o primeiro é duro: `bigint` não atravessa a fronteira Server
 * → Client Component. O Next serializa por um superset de JSON que não o
 * suporta, e a falha aparece em runtime ("BigInt não pode ser serializado"),
 * não no `typecheck`.
 *
 * O segundo é melhor: com só strings aqui, o cliente **não tem como** formatar
 * dinheiro errado, porque não tem o número. Toda formatação passa por
 * `lib/dinheiro` e `lib/claves` no servidor, que é a regra do §8.
 */
export type LinhaDePacote = {
  readonly id: string;
  readonly nome: string;
  /** "30" — usado no rótulo do diálogo de exclusão. */
  readonly claves: string;
  readonly valor: string;
  readonly desconto: string;
  readonly temDesconto: boolean;
  readonly precoPorClave: string;
  readonly ativo: boolean;
};

export type PropsLista = {
  readonly linhas: readonly LinhaDePacote[];
  /** Confirmação vinda de `?salvo=`, depois de criar ou editar. */
  readonly confirmacaoInicial?: string | null;
  readonly resumo: string;
  readonly baseDaClave: string;
  /** `tem_permissao('pacotes', true)`. Sem ela, a tela é só leitura. */
  readonly podeEscrever: boolean;
};

export function ListaDePacotes({
  linhas,
  confirmacaoInicial = null,
  resumo,
  baseDaClave,
  podeEscrever,
}: PropsLista) {
  const hrefDoAdmin = useHrefDoAdmin();
  const [pendente, iniciar] = useTransition();
  const [aExcluir, setAExcluir] = useState<LinhaDePacote | null>(null);

  /**
   * O `flash` do protótipo — a confirmação no pé da tabela.
   *
   * Lá ela expira em 2,6 s (`setTimeout`). Aqui **não** expira: uma
   * confirmação que desaparece sozinha é inútil para quem lê devagar, e o
   * `role="status"` do `Aviso` já a anuncia ao leitor de tela sem interromper.
   * Ela sai quando a próxima ação começa.
   */
  const [confirmacao, setConfirmacao] = useState<string | null>(confirmacaoInicial);
  const [erro, setErro] = useState<string | null>(null);

  function executar(acao: () => Promise<{ readonly ok: boolean }>, aoDarCerto: string) {
    setErro(null);
    setConfirmacao(null);
    iniciar(async () => {
      const resultado = await acao();
      if (resultado.ok) {
        setConfirmacao(aoDarCerto);
      } else {
        // A ação devolve `CodigoErro`, e aqui só existe um caminho de falha
        // realista: permissão. A RLS nega `update` afetando zero linhas, sem
        // erro — o repositório é que transforma isso em `NAO_AUTORIZADO`, e é
        // por isso que esta mensagem pode ser específica em vez de "algo deu
        // errado".
        setErro('Não foi possível concluir a ação. Confira suas permissões e tente de novo.');
      }
    });
  }

  const colunas: readonly ColunaTabela<LinhaDePacote>[] = [
    {
      chave: 'nome',
      titulo: ADMIN_PACOTES.colunas.nome,
      celula: (linha) => (
        <span className={estilos.nomeCelula}>
          <span className={estilos.nome}>{linha.nome}</span>
          <span className={estilos.sub}>
            {linha.ativo ? ADMIN_PACOTES.subNaCarteira : ADMIN_PACOTES.subForaDaCarteira}
          </span>
        </span>
      ),
    },
    {
      chave: 'claves',
      titulo: ADMIN_PACOTES.colunas.claves,
      numerica: true,
      celula: (linha) => linha.claves,
    },
    {
      chave: 'valor',
      titulo: ADMIN_PACOTES.colunas.valor,
      numerica: true,
      celula: (linha) => <strong>{linha.valor}</strong>,
    },
    {
      chave: 'desconto',
      titulo: ADMIN_PACOTES.colunas.desconto,
      numerica: true,
      celula: (linha) => (
        <span className={linha.temDesconto ? estilos.comDesconto : estilos.semDesconto}>
          {linha.desconto}
        </span>
      ),
    },
    {
      chave: 'porClave',
      titulo: ADMIN_PACOTES.colunas.porClave,
      numerica: true,
      celula: (linha) => <span className={estilos.porClave}>{linha.precoPorClave}</span>,
    },
    {
      chave: 'status',
      titulo: ADMIN_PACOTES.colunas.status,
      numerica: true,
      celula: (linha) =>
        linha.ativo ? (
          <Etiqueta tom="sucesso" dot="sucesso">
            {ADMIN_PACOTES.statusAtivo}
          </Etiqueta>
        ) : (
          <Etiqueta tom="neutro" dot="desativado">
            {ADMIN_PACOTES.statusInativo}
          </Etiqueta>
        ),
    },
    {
      chave: 'acoes',
      titulo: ADMIN_PACOTES.colunas.acoes,
      numerica: true,
      celula: (linha) => (
        <span className={estilos.acoes}>
          {/*
            "Editar" navega, então é `<a>`: preserva Ctrl+clique e "abrir em
            nova aba", que numa tela de gestão são gestos usados de verdade.
          */}
          <Link className={estilos.acao} href={hrefDoAdmin(`${ROTA.ADMIN_PACOTES}/${linha.id}`)}>
            {ADMIN_PACOTES.editar}
          </Link>

          <button
            type="button"
            className={[estilos.acao, linha.ativo ? estilos.acaoDesativar : undefined]
              .filter(Boolean)
              .join(' ')}
            disabled={!podeEscrever || pendente}
            onClick={() =>
              executar(
                () => alternarAtivo({ pacoteId: linha.id, ativo: !linha.ativo }),
                linha.ativo
                  ? ADMIN_PACOTES.flashDesativado(linha.nome)
                  : ADMIN_PACOTES.flashAtivado(linha.nome),
              )
            }
          >
            {linha.ativo ? ADMIN_PACOTES.desativar : ADMIN_PACOTES.ativar}
          </button>

          <button
            type="button"
            className={estilos.acaoExcluir}
            disabled={!podeEscrever || pendente}
            onClick={() => setAExcluir(linha)}
            // O ícone é a única marca visual, então o nome acessível vem do
            // rótulo — e nomear o pacote evita quatro "Excluir pacote"
            // idênticos na árvore de acessibilidade.
            aria-label={`${ADMIN_PACOTES.excluir}: ${linha.nome}`}
            title={ADMIN_PACOTES.excluir}
          >
            <IconeLixeira />
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className={estilos.tela}>
      <div className={estilos.topo}>
        <div className={estilos.contexto}>
          {/*
            "Base de 1 Clave por R$ 10, com desconto progressivo por volume." O
            valor vem de `configuracao.clave_valor_centavos`, não da copy: se a
            Clave mudar de preço, esta linha muda com ela (RNF-011).
          */}
          <span className={estilos.base}>{baseDaClave}</span>
          <span className={estilos.resumo}>
            <span className={estilos.pontoAtivo} aria-hidden="true" />
            {resumo}
          </span>
        </div>

        {podeEscrever ? (
          <BotaoLink href={hrefDoAdmin(ROTA.ADMIN_PACOTES_NOVO)} tamanho="denso">
            {ADMIN_PACOTES.novo}
          </BotaoLink>
        ) : null}
      </div>

      {erro !== null ? <Aviso tom="erro">{erro}</Aviso> : null}

      <div className={estilos.moldura}>
        <Tabela
          legenda={ADMIN_PACOTES.titulo}
          legendaOculta
          colunas={colunas}
          linhas={linhas}
          chaveDaLinha={(linha) => linha.id}
          vazio={
            <EstadoVazio
              titulo={ADMIN_PACOTES.vazioTitulo}
              descricao={ADMIN_PACOTES.vazioDescricao}
              acao={
                podeEscrever ? (
                  <BotaoLink href={hrefDoAdmin(ROTA.ADMIN_PACOTES_NOVO)} tamanho="denso">
                    {ADMIN_PACOTES.novo}
                  </BotaoLink>
                ) : undefined
              }
            />
          }
        />

        <div className={estilos.rodapeDaTabela}>
          <span className={estilos.nota}>{ADMIN_PACOTES.nota}</span>
          {confirmacao !== null ? <Aviso tom="sucesso">{confirmacao}</Aviso> : null}
        </div>
      </div>

      <Modal
        aberto={aExcluir !== null}
        onFechar={() => setAExcluir(null)}
        overline={ADMIN_PACOTE_EXCLUIR.overline}
        tomDoOverline="marca"
        titulo={aExcluir === null ? '' : ADMIN_PACOTE_EXCLUIR.alvo(aExcluir.nome, aExcluir.claves)}
        largura="estreita"
        // Confirmação destrutiva: fechar sem querer, por ESC ou clique fora,
        // não deveria ser possível num diálogo cuja outra saída apaga algo.
        persistente
        rodape={
          <>
            <Botao
              variante="destrutivo"
              carregando={pendente}
              onClick={() => {
                const alvo = aExcluir;
                if (alvo === null) return;
                setAExcluir(null);
                executar(
                  () => excluirPacote({ pacoteId: alvo.id }),
                  ADMIN_PACOTES.flashExcluido(alvo.nome),
                );
              }}
            >
              {ADMIN_PACOTE_EXCLUIR.confirmar}
            </Botao>
            <Botao variante="secundario" onClick={() => setAExcluir(null)}>
              {ADMIN_PACOTE_EXCLUIR.cancelar}
            </Botao>
          </>
        }
      >
        <div className={estilos.corpoModal}>
          <p className={estilos.textoModal}>{ADMIN_PACOTE_EXCLUIR.texto}</p>
        </div>
      </Modal>
    </div>
  );
}

function IconeLixeira() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4.5 6.5h15" />
      <path d="M9.5 6.5V4.6h5v1.9" />
      <path d="M6.6 6.5 7.5 20h9l.9-13.5" />
      <path d="M10.4 10v6" />
      <path d="M13.6 10v6" />
    </svg>
  );
}
