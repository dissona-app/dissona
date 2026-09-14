import { BotaoLink } from '@/componentes/base/BotaoLink';
import { Cartao } from '@/componentes/base/Cartao';
import { EstadoVazio } from '@/componentes/base/EstadoVazio';
import { Painel } from '@/componentes/base/Painel';
import { ROTA } from '@/lib/guarda-rota';
import { CARTEIRA as TEXTOS } from '@/textos/prototipo';

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
  return (
    <div className={estilos.base}>
      <Cartao variante="kpi">
        <div className={estilos.saldo}>
          <div>
            <p className={estilos.rotulo}>{TEXTOS.saldoTitulo}</p>
            <p className={estilos.numero}>
              {saldo} <span className={estilos.unidade}>{TEXTOS.saldoUnidade}</span>
            </p>
            <p className={estilos.nota}>{saldoNota}</p>
          </div>

          <div className={estilos.acoes}>
            <BotaoLink href={ROTA.ARTISTA_PACOTES}>{TEXTOS.comprar}</BotaoLink>
            <BotaoLink href={ROTA.ARTISTA_EXTRATO} variante="secundario">
              {TEXTOS.verExtrato}
            </BotaoLink>
          </div>
        </div>

        <dl className={estilos.paralelos}>
          <div>
            <dt className={estilos.rotulo}>{TEXTOS.comprometidas}</dt>
            <dd className={estilos.paralelo}>{comprometido}</dd>
          </div>
          <div>
            <dt className={estilos.rotulo}>{TEXTOS.devolvidas}</dt>
            <dd className={estilos.paralelo}>{devolvido}</dd>
          </div>
        </dl>
      </Cartao>

      <dl className={estilos.resumo}>
        {(
          [
            [TEXTOS.resumo.adquiridas, adquiridas, estilos.adquiridas],
            [TEXTOS.resumo.usadas, usadas, undefined],
            // O mesmo número do bloco de cima: "Devolvidas por falta de
            // resposta" e o card de resumo são a mesma soma, e o protótipo os
            // mostra nos dois lugares.
            [TEXTOS.resumo.devolvidas, devolvido, estilos.devolvidas],
          ] as const
        ).map(([texto, valor, classe]) => (
          <Cartao key={texto.rotulo} variante="compacto">
            <dt className={estilos.rotulo}>{texto.rotulo}</dt>
            <dd className={[estilos.numeroMedio, classe].filter(Boolean).join(' ')}>{valor}</dd>
            <p className={estilos.nota}>{texto.descricao}</p>
          </Cartao>
        ))}
      </dl>

      <Painel
        titulo={TEXTOS.ultimasTitulo}
        acao={
          ultimas.length > 0 ? (
            <BotaoLink href={ROTA.ARTISTA_EXTRATO} variante="ghost" tamanho="sm">
              {TEXTOS.verTudo}
            </BotaoLink>
          ) : undefined
        }
      >
        {ultimas.length === 0 ? (
          <EstadoVazio
            titulo={TEXTOS.vazioTitulo}
            descricao={TEXTOS.vazioDescricao}
            acao={
              <BotaoLink href={ROTA.ARTISTA_PACOTES} tamanho="sm">
                {TEXTOS.comprar}
              </BotaoLink>
            }
          />
        ) : (
          <ul className={estilos.movimentacoes}>
            {ultimas.map((linha) => (
              <li key={linha.id} className={estilos.movimentacao}>
                <div>
                  <p className={estilos.origem}>{linha.origem}</p>
                  <p className={estilos.nota}>
                    {linha.data} · {linha.tipo}
                  </p>
                </div>
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
      </Painel>
    </div>
  );
}
