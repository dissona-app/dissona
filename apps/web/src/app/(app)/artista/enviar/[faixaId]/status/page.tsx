import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BarraProgresso } from '@/componentes/base/BarraProgresso';
import { EstadoVazio } from '@/componentes/base/EstadoVazio';
import { Etiqueta } from '@/componentes/base/Etiqueta';
import { Painel } from '@/componentes/base/Painel';
import { prazoRestante } from '@/lib/formato';
import { buscar } from '@/modulos/faixa/repositorio';
import { lerEnviosDaFaixa } from '@/modulos/selecao/consultas';
import { STATUS_DO_ENVIO as TEXTOS } from '@/textos/prototipo';

import estilos from './pagina.module.css';

export const metadata: Metadata = {
  title: 'Status do envio',
  robots: { index: false, follow: false },
};

/** Quanto da jornada `Recebeu → Ouviu → Avaliando → Pronto` já andou. */
const AVANCO: Readonly<Record<string, number>> = {
  recebeu: 25,
  ouviu: 50,
  avaliando: 75,
  pronto: 100,
  devolvido: 100,
  cancelado: 100,
};

/**
 * 3.3 · Status de envio — **versão mínima** da R2.
 *
 * O módulo inteiro é da R3. Aqui há o suficiente para o cenário B7: a tabela
 * por curador com andamento, prazo e etapa, lida de `envio.situacao`. Sem
 * barras animadas e sem detalhe do curador, que é o que a R3 acrescenta.
 */
export default async function PaginaDoStatus({
  params,
}: {
  readonly params: Promise<{ readonly faixaId: string }>;
}) {
  const { faixaId } = await params;

  const faixa = await buscar(faixaId);
  if (faixa === null) notFound();

  const envios = await lerEnviosDaFaixa(faixaId);
  const agora = new Date();

  return (
    <div className={estilos.base}>
      <Painel titulo={TEXTOS.titulo} sublegenda={faixa.titulo}>
        {envios.length === 0 ? (
          <EstadoVazio titulo={TEXTOS.vazioTitulo} descricao={TEXTOS.vazioDescricao} />
        ) : (
          <table className={estilos.tabela}>
            <caption className="dsn-apenas-leitor">{TEXTOS.titulo}</caption>
            <thead>
              <tr>
                <th scope="col">{TEXTOS.colunas.curador}</th>
                <th scope="col">{TEXTOS.colunas.andamento}</th>
                <th scope="col">{TEXTOS.colunas.prazo}</th>
                <th scope="col">{TEXTOS.colunas.etapa}</th>
              </tr>
            </thead>
            <tbody>
              {envios.map((envio) => {
                const prazo = prazoRestante(envio.prazoEm, agora);
                return (
                  <tr key={envio.id}>
                    <th scope="row" className={estilos.curador}>
                      {envio.curador}
                    </th>
                    <td className={estilos.andamento}>
                      <BarraProgresso
                        percentual={AVANCO[envio.situacao] ?? 0}
                        rotulo={`${envio.curador}: ${TEXTOS.etapas[envio.situacao]}`}
                        rotuloOculto
                        tom={envio.situacao === 'pronto' ? 'sucesso' : 'marca'}
                      />
                    </td>
                    <td>
                      {prazo.vencido
                        ? '—'
                        : prazo.dias > 0
                          ? `${prazo.dias}d ${prazo.horas}h`
                          : `${prazo.horas}h`}
                    </td>
                    <td>
                      <Etiqueta tom={envio.situacao === 'pronto' ? 'sucesso' : 'neutro'}>
                        {TEXTOS.etapas[envio.situacao]}
                      </Etiqueta>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <p className={estilos.nota}>{TEXTOS.nota}</p>
      </Painel>
    </div>
  );
}
