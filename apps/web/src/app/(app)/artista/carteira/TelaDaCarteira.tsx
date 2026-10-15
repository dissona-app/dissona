import Link from 'next/link';

import { BotaoLink } from '@dissona/nucleo/componentes/base/BotaoLink';
import { EstadoVazio } from '@dissona/nucleo/componentes/base/EstadoVazio';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { CARTEIRA as TEXTOS } from '@dissona/nucleo/textos/prototipo';

import estilos from './TelaDaCarteira.module.css';

/**
 * Uma linha de "Últimas movimentações", **já formatada no servidor**.
 *
 * Só `string` e `boolean`: `bigint` não atravessa a fronteira Server→Client, e
 * entregar o número cru daria ao cliente a chance de formatar dinheiro de um
 * jeito diferente do resto do produto.
 */
export type LinhaDeMovimentacao = {
  readonly id: string;
  readonly data: string;
  readonly origem: string;
  readonly tipo: string;
  readonly quantidade: string;
  readonly entrada: boolean;
};

export type PropsTelaDaCarteira = {
  readonly saldo: string;
  readonly saldoNota: string;
  readonly comprometido: string;
  readonly devolvido: string;
  readonly adquiridas: string;
  readonly usadas: string;
  readonly ultimas: readonly LinhaDeMovimentacao[];
};

/** 5 · Carteira. Server Component: não há interação, só links. */
export function TelaDaCarteira({
  saldo,
  saldoNota,
  comprometido,
  devolvido,
  adquiridas,
  usadas,
  ultimas,
}: PropsTelaDaCarteira) {
  // Layout do protótipo aprovado: o saldo num cartão escuro à esquerda; à
  // direita, os três números do resumo e as últimas movimentações.
  return (
    <div className={estilos.base}>
      <section className={estilos.saldo} aria-label={TEXTOS.saldoTitulo}>
        <span className={estilos.saldoRotulo}>{TEXTOS.saldoTitulo}</span>
        <p className={estilos.saldoLinha}>
          <span className={estilos.numero}>{saldo}</span>{' '}
          <span className={estilos.unidade}>{TEXTOS.saldoUnidade}</span>
        </p>
        <span className={estilos.saldoNota}>{saldoNota}</span>
        <span className={estilos.divisor} aria-hidden="true" />
        <dl className={estilos.paralelos}>
          <div className={estilos.paralelo}>
            <dt>{TEXTOS.comprometidas}</dt>
            <dd>{`${comprometido} ${TEXTOS.saldoUnidade}`}</dd>
          </div>
          <div className={estilos.paralelo}>
            <dt>{TEXTOS.devolvidas}</dt>
            <dd>{`${devolvido} ${TEXTOS.saldoUnidade}`}</dd>
          </div>
        </dl>
        <div className={estilos.acoes}>
          <BotaoLink href={ROTA.ARTISTA_PACOTES} tamanho="denso">
            {TEXTOS.comprar}
          </BotaoLink>
          <Link className={estilos.botaoClaro} href={ROTA.ARTISTA_EXTRATO}>
            {TEXTOS.verExtrato}
          </Link>
        </div>
      </section>

      <div className={estilos.coluna}>
        <dl className={estilos.resumo}>
          {(
            [
              [TEXTOS.resumo.adquiridas, adquiridas, estilos.adquiridas],
              [TEXTOS.resumo.usadas, usadas, undefined],
              [TEXTOS.resumo.devolvidas, devolvido, estilos.devolvidas],
            ] as const
          ).map(([texto, valor, classe]) => (
            <div key={texto.rotulo} className={estilos.cartaoResumo}>
              <dt className={estilos.rotulo}>{texto.rotulo}</dt>
              <dd className={[estilos.numeroMedio, classe].filter(Boolean).join(' ')}>{valor}</dd>
              <p className={estilos.nota}>{texto.descricao}</p>
            </div>
          ))}
        </dl>

        <section className={estilos.ultimas} aria-label={TEXTOS.ultimasTitulo}>
          <div className={estilos.ultimasCabecalho}>
            <span className={estilos.saldoRotulo}>{TEXTOS.ultimasTitulo}</span>
            {ultimas.length > 0 ? (
              <Link className={estilos.verTudo} href={ROTA.ARTISTA_EXTRATO}>
                {TEXTOS.verTudo}
              </Link>
            ) : null}
          </div>
          {ultimas.length === 0 ? (
            <div className={estilos.vazio}>
              <EstadoVazio
                titulo={TEXTOS.vazioTitulo}
                descricao={TEXTOS.vazioDescricao}
                acao={
                  <BotaoLink href={ROTA.ARTISTA_PACOTES} tamanho="sm">
                    {TEXTOS.comprar}
                  </BotaoLink>
                }
              />
            </div>
          ) : (
            <ul className={estilos.movimentacoes}>
              {ultimas.map((linha) => (
                <li key={linha.id} className={estilos.movimentacao}>
                  <span className={estilos.data}>{linha.data}</span>
                  <span className={estilos.origem}>{linha.origem}</span>
                  <span
                    className={[estilos.tipo, linha.entrada ? estilos.tipoEntrada : undefined]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {linha.tipo}
                  </span>
                  <span
                    className={[estilos.quantidade, linha.entrada ? estilos.entrada : undefined]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {linha.quantidade}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
