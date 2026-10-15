import Link from 'next/link';

import type { ResultadoDeAcao } from '@dissona/nucleo/lib/acoes';
import { rotuloDaFonte } from '@/modulos/faixa/servico';
import type { FaixaEmEdicao } from '@/modulos/faixa/tipos';
import type { SelecaoNaUrl } from '@/modulos/selecao/tipos';
import { ENVIAR as TEXTOS, SELECAO } from '@dissona/nucleo/textos/prototipo';

import { CartaoDaFaixa } from './CartaoDaFaixa';
import { ConfirmarEnvio } from './ConfirmarEnvio';
import estilos from './Revisao.module.css';

export type PropsRevisao = {
  readonly faixa: FaixaEmEdicao;
  /** Saldo já formatado — "25 Claves". `null` se a conta não tem carteira. */
  readonly saldo: string | null;
  /** Os curadores escolhidos no passo anterior, já formatados. */
  readonly escolhidos: readonly {
    readonly id: string;
    readonly nome: string;
    readonly servicos: string;
    readonly claves: string;
  }[];
  /** "3 Claves" e "R$ 30,00" — somas de exibição; a RPC é quem cobra. */
  readonly total: string;
  readonly totalEmReais: string;
  readonly selecao: SelecaoNaUrl;
  /** Endereço da seleção com a escolha preservada (o "Alterar" e o "Voltar"). */
  readonly alterar: string;
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
};

/**
 * Passo 4 do envio — revisão (ordem do protótipo aprovado).
 *
 * A faixa, o contexto e os curadores escolhidos; o "Enviar para curadoria" é o
 * que debita as Claves (ver `ConfirmarEnvio`).
 */
export function Revisao({
  faixa,
  saldo,
  escolhidos,
  total,
  totalEmReais,
  selecao,
  alterar,
  acao,
}: PropsRevisao) {
  // A origem aparece para link e preenchimento manual (RF-037). Para arquivo
  // o cartão já diz "Arquivo enviado", e o nome no Storage é um UUID.
  const fonte = rotuloDaFonte(faixa);
  const genero = faixa.genero ?? '—';
  const info =
    fonte === 'arquivo'
      ? genero
      : `${genero} · ${fonte === 'link' ? TEXTOS.resumoFonte.link : TEXTOS.resumoFonte.manual}`;

  return (
    <div className={estilos.base}>
      {/* Protótipo aprovado: o cartão da faixa em destaque e, ao lado, o que
          o artista escreveu para o curador. */}
      <div className={estilos.grade}>
        <div className={estilos.colunaFaixa}>
          <CartaoDaFaixa faixa={faixa} destaque info={info} />
        </div>
        <div className={estilos.colunaLateral}>
          <section className={estilos.cartaoContexto} aria-label={TEXTOS.resumoContexto}>
            <h3 className={estilos.rotuloContexto}>{TEXTOS.resumoContexto}</h3>
            <p className={estilos.contexto}>{faixa.contextoCurador}</p>
          </section>

          {/* Protótipo aprovado: os curadores escolhidos, com "Alterar" e o
              total em Claves e em reais. */}
          <section className={estilos.cartaoCuradores} aria-label={SELECAO.curadoresEscolhidos}>
            <div className={estilos.curadoresTopo}>
              <h3 className={estilos.rotuloContexto}>{SELECAO.curadoresEscolhidos}</h3>
              <Link className={estilos.alterar} href={alterar}>
                {SELECAO.alterar}
              </Link>
            </div>
            <ul className={estilos.escolhidos}>
              {escolhidos.map((curador) => (
                <li key={curador.id} className={estilos.escolhido}>
                  <span className={estilos.avatar} aria-hidden="true">
                    {curador.nome
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((parte) => parte[0]?.toUpperCase() ?? '')
                      .join('')}
                  </span>
                  <span className={estilos.escolhidoTextos}>
                    <span className={estilos.escolhidoNome}>{curador.nome}</span>
                    <span className={estilos.escolhidoServico}>{curador.servicos}</span>
                  </span>
                  <span className={estilos.escolhidoClaves}>{curador.claves}</span>
                </li>
              ))}
            </ul>
            <div className={estilos.totalDosCuradores}>
              <span>{SELECAO.total}</span>
              <span className={estilos.totalValores}>
                <span className={estilos.totalReais}>{totalEmReais}</span>
                <strong className={estilos.totalClaves}>{total}</strong>
              </span>
            </div>
          </section>
        </div>
      </div>

      <ConfirmarEnvio
        faixaId={faixa.id}
        selecao={selecao}
        voltar={alterar}
        nota={saldo === null ? '' : SELECAO.notaDaRevisao(escolhidos.length, total, saldo)}
        acao={acao}
      />
    </div>
  );
}
