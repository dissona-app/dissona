'use client';

import { useState } from 'react';

import { Botao } from '@dissona/nucleo/componentes/base/Botao';
import { BotaoLink } from '@dissona/nucleo/componentes/base/BotaoLink';
import { Checkbox } from '@/componentes/base/Checkbox';
import { EstadoVazio } from '@dissona/nucleo/componentes/base/EstadoVazio';
import { SeloClasse } from '@/componentes/base/SeloClasse';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { SELECAO as TEXTOS } from '@dissona/nucleo/textos/prototipo';

import type { CuradorNaLista, SelecaoNaUrl } from '@/modulos/selecao/tipos';

import estilos from './SelecaoDeCuradores.module.css';

export type { CuradorNaLista } from '@/modulos/selecao/tipos';

export type PropsSelecaoDeCuradores = {
  readonly faixaId: string;
  readonly tituloDaFaixa: string;
  /** Saldo disponível, já formatado ("12 Claves"). `null` quando não há carteira. */
  readonly saldo: string | null;
  readonly curadores: readonly CuradorNaLista[];
  /** A escolha anterior, quando a pessoa volta da revisão para alterar. */
  readonly inicial?: SelecaoNaUrl;
};

const formatoDeClaves = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * 4.3 · Escolher curador — layout do protótipo aprovado: busca no topo, a
 * tabela de curadores com os serviços marcáveis e o total por linha, e o
 * cartão "Seleção desta faixa" à direita.
 *
 * Ordem do protótipo: este passo vem **antes** da revisão. Nada é debitado
 * aqui — o formulário é um `GET` para a revisão, com a escolha na URL, e as
 * Claves só saem no "Enviar para curadoria" de lá. O total é soma de exibição;
 * o valor cobrado é o que a RPC calcula a partir de `servico_curador`.
 *
 * O ranking e a calibração do protótipo não têm dado nesta release, e por isso
 * as colunas não aparecem.
 */
export function SelecaoDeCuradores({
  faixaId,
  tituloDaFaixa,
  saldo,
  curadores,
  inicial = {},
}: PropsSelecaoDeCuradores) {
  const [marcados, setMarcados] = useState<readonly string[]>(() =>
    curadores.filter((curador) => inicial[curador.id] !== undefined).map((curador) => curador.id),
  );
  const [extras, setExtras] = useState<Readonly<Record<string, readonly string[]>>>(() => inicial);
  const [busca, setBusca] = useState('');

  const voltar = `${ROTA.ARTISTA_ENVIAR}/${faixaId}/contexto`;

  if (curadores.length === 0) {
    return (
      <EstadoVazio
        titulo={TEXTOS.vazioTitulo}
        descricao={TEXTOS.vazioDescricao}
        acao={
          <BotaoLink href={voltar} variante="secundario">
            {TEXTOS.voltarAoContexto}
          </BotaoLink>
        }
      />
    );
  }

  const totalDe = (curador: CuradorNaLista): number => {
    if (!marcados.includes(curador.id)) return 0;
    const escolhidos = extras[curador.id] ?? [];
    return (
      curador.precoBaseClaves +
      curador.opcionais
        .filter((opcional) => escolhidos.includes(opcional.tipo))
        .reduce((soma, opcional) => soma + opcional.precoClaves, 0)
    );
  };
  const total = curadores.reduce((soma, curador) => soma + totalDe(curador), 0);

  const alternarCurador = (id: string, ligado: boolean) => {
    setMarcados((atuais) => (ligado ? [...atuais, id] : atuais.filter((outro) => outro !== id)));
    if (!ligado) setExtras((atuais) => ({ ...atuais, [id]: [] }));
  };

  const alternarExtra = (id: string, tipo: string, ligado: boolean) => {
    setExtras((atuais) => {
      const lista = atuais[id] ?? [];
      return {
        ...atuais,
        [id]: ligado ? [...lista, tipo] : lista.filter((outro) => outro !== tipo),
      };
    });
    // Somar um serviço a um curador já o escolhe — o feedback vem junto.
    if (ligado && !marcados.includes(id)) alternarCurador(id, true);
  };

  const termo = busca.trim().toLocaleLowerCase('pt-BR');
  const visiveis = curadores.filter((curador) =>
    termo === '' ? true : curador.nome.toLocaleLowerCase('pt-BR').includes(termo),
  );

  return (
    <form
      action={`${ROTA.ARTISTA_ENVIAR}/${faixaId}/revisao`}
      method="get"
      className={estilos.base}
    >
      <div className={estilos.principal}>
        <h2 className="dsn-apenas-leitor">{TEXTOS.titulo}</h2>

        <label className={estilos.busca}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="dsn-apenas-leitor">{TEXTOS.buscar}</span>
          <input
            type="search"
            placeholder={TEXTOS.buscar}
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
          />
        </label>
        <p className={estilos.contagem}>{TEXTOS.disponiveis(visiveis.length)}</p>

        <div className={estilos.colunas} aria-hidden="true">
          <span>Curador</span>
          <span>Serviços oferecidos</span>
          <span className={estilos.centro}>Claves</span>
          <span className={estilos.centro}>Total</span>
        </div>
        <ul className={estilos.lista}>
          {curadores.map((curador) => {
            const marcado = marcados.includes(curador.id);
            const escolhidos = extras[curador.id] ?? [];
            const totalDaLinha = totalDe(curador);
            // Fora da busca a linha só se esconde: um curador já marcado
            // continua no formulário.
            const oculto = !visiveis.includes(curador);
            return (
              <li
                key={curador.id}
                hidden={oculto}
                className={[estilos.item, marcado ? estilos.itemMarcado : undefined]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className={estilos.identidade}>
                  <span className={estilos.avatar} aria-hidden="true">
                    {iniciais(curador.nome)}
                  </span>
                  <span className={estilos.nomeEClasse}>
                    <span className={estilos.nome}>{curador.nome}</span>
                    <SeloClasse classe={curador.classe} />
                  </span>
                </div>

                <div className={estilos.servicos}>
                  <Checkbox
                    name="curador"
                    value={curador.id}
                    checked={marcado}
                    onChange={(e) => alternarCurador(curador.id, e.target.checked)}
                  >
                    <span className={estilos.servicoNome}>Feedback</span>{' '}
                    <span className={estilos.servicoNota}>(padrão, sempre incluso)</span>
                    <span className="dsn-apenas-leitor"> — {curador.nome}</span>
                  </Checkbox>
                  {curador.opcionais.map((opcional) => (
                    <Checkbox
                      key={opcional.tipo}
                      name={`servico:${curador.id}`}
                      value={opcional.tipo}
                      checked={escolhidos.includes(opcional.tipo)}
                      onChange={(e) => alternarExtra(curador.id, opcional.tipo, e.target.checked)}
                    >
                      <span className={estilos.servicoNome}>{opcional.rotulo}</span>
                      <span className="dsn-apenas-leitor"> — {curador.nome}</span>
                    </Checkbox>
                  ))}
                </div>

                <div className={estilos.precos} aria-hidden="true">
                  <span>{formatoDeClaves.format(curador.precoBaseClaves)}</span>
                  {curador.opcionais.map((opcional) => (
                    <span key={opcional.tipo}>{formatoDeClaves.format(opcional.precoClaves)}</span>
                  ))}
                </div>

                <div
                  className={[estilos.totalDaLinha, marcado ? estilos.totalAceso : undefined]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {formatoDeClaves.format(totalDaLinha)}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <aside className={estilos.resumo} aria-label={TEXTOS.selecaoDestaFaixa}>
        <div className={estilos.resumoTopo}>
          <span className={estilos.resumoRotulo}>{TEXTOS.selecaoDestaFaixa}</span>
          <span className={estilos.resumoFaixa}>{tituloDaFaixa}</span>
        </div>
        <div className={estilos.resumoCorpo}>
          {marcados.length === 0 ? (
            <p className={estilos.resumoDica}>{TEXTOS.dicaDaSelecao}</p>
          ) : (
            <ul className={estilos.escolhidos}>
              {curadores
                .filter((curador) => marcados.includes(curador.id))
                .map((curador) => (
                  <li key={curador.id}>
                    <span>{curador.nome}</span>
                    <span>{formatoDeClaves.format(totalDe(curador))}</span>
                  </li>
                ))}
            </ul>
          )}

          <div className={estilos.resumoTotal}>
            <span>{TEXTOS.total}</span>
            <strong>
              {formatoDeClaves.format(total)} {total === 1 ? 'Clave' : 'Claves'}
            </strong>
          </div>
          {saldo !== null ? (
            <div className={estilos.resumoLinha}>
              <span>{TEXTOS.saldoDisponivel}</span>
              <span>{saldo}</span>
            </div>
          ) : null}
          <p className={estilos.cotacao}>{TEXTOS.cotacao}</p>

          <div className={estilos.resumoAcoes}>
            <Botao type="submit" disabled={marcados.length === 0} blocoInteiro>
              {TEXTOS.continuarParaRevisao}
            </Botao>
            <BotaoLink href={voltar} variante="secundario" blocoInteiro>
              ‹ {TEXTOS.voltarAoContexto}
            </BotaoLink>
          </div>
        </div>
      </aside>
    </form>
  );
}
