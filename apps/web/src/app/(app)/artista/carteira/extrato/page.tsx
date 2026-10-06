import type { Metadata } from 'next';

import { Abas } from '@dissona/nucleo/componentes/base/Abas';
import { BotaoLink } from '@dissona/nucleo/componentes/base/BotaoLink';
import { EstadoVazio } from '@dissona/nucleo/componentes/base/EstadoVazio';
import { Painel } from '@/componentes/base/Painel';
import * as claves from '@dissona/nucleo/lib/claves';
import { formatarData } from '@dissona/nucleo/lib/formato';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { lerExtrato } from '@/modulos/claves/consultas';
import { FILTROS_DO_EXTRATO, ehFiltroDoExtrato } from '@/modulos/claves/tipos';
import { CARTEIRA as TEXTOS } from '@dissona/nucleo/textos/prototipo';

import estilos from './pagina.module.css';

export const metadata: Metadata = {
  title: 'Extrato',
  robots: { index: false, follow: false },
};

/**
 * 5.3 · Extrato.
 *
 * O filtro viaja em `?tipo=`, e não em estado local, pela mesma razão que a
 * aba de Conta viaja na URL: dá endereço ao recorte, funciona sem JavaScript e
 * sobrevive ao recarregar.
 */
export default async function PaginaDoExtrato({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  const filtro = ehFiltroDoExtrato(tipo) ? tipo : 'todas';

  const { linhas, vazioPorFiltro } = await lerExtrato(filtro);

  return (
    <div className={estilos.base}>
      <Abas
        abas={FILTROS_DO_EXTRATO.map((cada) => ({ chave: cada, rotulo: TEXTOS.filtros[cada] }))}
        ativa={filtro}
        caminho={ROTA.ARTISTA_EXTRATO}
        parametro="tipo"
        rotulo={TEXTOS.filtrosRotulo}
      />

      <Painel
        titulo={TEXTOS.extratoTitulo}
        acao={
          <BotaoLink href={ROTA.ARTISTA_CARTEIRA} variante="ghost" tamanho="sm">
            {TEXTOS.voltarParaCarteira}
          </BotaoLink>
        }
      >
        {linhas.length === 0 ? (
          <EstadoVazio
            titulo={vazioPorFiltro ? TEXTOS.vazioPorFiltroTitulo : TEXTOS.vazioTitulo}
            descricao={vazioPorFiltro ? TEXTOS.vazioPorFiltroDescricao : TEXTOS.vazioDescricao}
          />
        ) : (
          <table className={estilos.tabela}>
            <caption className="dsn-apenas-leitor">{TEXTOS.extratoTitulo}</caption>
            <thead>
              <tr>
                <th scope="col">{TEXTOS.colunas.data}</th>
                <th scope="col">{TEXTOS.colunas.origem}</th>
                <th scope="col">{TEXTOS.colunas.tipo}</th>
                <th scope="col" className={estilos.numerica}>
                  {TEXTOS.colunas.claves}
                </th>
                <th scope="col" className={estilos.numerica}>
                  {TEXTOS.colunas.saldo}
                </th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr key={linha.id}>
                  <td>{formatarData(linha.data)}</td>
                  <th scope="row" className={estilos.origem}>
                    {linha.origem}
                  </th>
                  <td>{TEXTOS.tipos[linha.tipo]}</td>
                  <td
                    className={[
                      estilos.numerica,
                      linha.quantidade > 0n ? estilos.entrada : undefined,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {claves.formatar(linha.quantidade)}
                  </td>
                  <td className={estilos.numerica}>{claves.formatar(linha.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className={estilos.nota}>{TEXTOS.notaDevolucao}</p>
      </Painel>
    </div>
  );
}
