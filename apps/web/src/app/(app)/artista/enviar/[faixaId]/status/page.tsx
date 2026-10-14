import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EstadoVazio } from '@dissona/nucleo/componentes/base/EstadoVazio';
import { prazoRestante } from '@dissona/nucleo/lib/formato';
import { buscar } from '@/modulos/faixa/repositorio';
import { lerEnviosDaFaixa } from '@/modulos/selecao/consultas';
import { STATUS_DO_ENVIO as TEXTOS } from '@dissona/nucleo/textos/prototipo';

import estilos from './pagina.module.css';

export const metadata: Metadata = {
  title: 'Status do envio',
  robots: { index: false, follow: false },
};

/** Quanto da jornada `Recebeu → Ouviu → Avaliando → Pronto` já andou. */
/**
 * As quatro etapas do andamento — `enEtapasMeta` do protótipo aprovado: cada
 * barra acende na cor da sua etapa até a atual.
 */
const ETAPAS = [
  { chave: 'recebeu', cor: '#B780E7', legenda: 'Curador recebeu sua música' },
  { chave: 'ouviu', cor: '#7F47DD', legenda: 'O curador ouviu e está avaliando' },
  { chave: 'avaliando', cor: '#140D1A', legenda: 'Falta pouco, estamos ansiosos junto com você!' },
  { chave: 'pronto', cor: '#2FA565', legenda: 'Parabéns! Seu feedback está prontinho' },
] as const;

function indiceDaEtapa(situacao: string): number {
  const i = ETAPAS.findIndex((etapa) => etapa.chave === situacao);
  return i === -1 ? ETAPAS.length - 1 : i;
}

function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');
}

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
      <div className={estilos.faixa}>
        <span className={estilos.capa} aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M9 18V5l12-2v13" stroke="#140D1A" strokeWidth="1.8" />
            <circle cx="6" cy="18" r="3" stroke="#140D1A" strokeWidth="1.8" />
            <circle cx="18" cy="16" r="3" stroke="#140D1A" strokeWidth="1.8" />
          </svg>
        </span>
        <span className={estilos.faixaTextos}>
          <span className={estilos.faixaTitulo}>{faixa.titulo}</span>
          <span className={estilos.faixaInfo}>{TEXTOS.titulo}</span>
        </span>
      </div>

      {envios.length === 0 ? (
        <EstadoVazio titulo={TEXTOS.vazioTitulo} descricao={TEXTOS.vazioDescricao} />
      ) : (
        <div className={estilos.moldura}>
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
                const atual = indiceDaEtapa(envio.situacao);
                const pronto = envio.situacao === 'pronto';
                return (
                  <tr key={envio.id}>
                    <th scope="row" className={estilos.curador}>
                      <span className={estilos.avatar} aria-hidden="true">
                        {iniciais(envio.curador)}
                      </span>
                      <span className={estilos.curadorNome}>{envio.curador}</span>
                    </th>
                    <td>
                      <span className={estilos.barras}>
                        {ETAPAS.map((etapa, i) => (
                          <span
                            key={etapa.chave}
                            className={estilos.barra}
                            style={{ background: i <= atual ? etapa.cor : '#EDE8F2' }}
                          />
                        ))}
                      </span>
                      <span className={estilos.legendas}>
                        {ETAPAS.map((etapa, i) => (
                          <span
                            key={etapa.chave}
                            className={
                              i === atual
                                ? estilos.legendaAtual
                                : i < atual
                                  ? estilos.legendaFeita
                                  : estilos.legenda
                            }
                          >
                            {etapa.legenda}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td
                      className={[
                        estilos.prazo,
                        pronto ? estilos.prazoEntregue : undefined,
                        !pronto && !prazo.vencido && prazo.dias === 0
                          ? estilos.prazoCurto
                          : undefined,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {pronto
                        ? 'Entregue'
                        : prazo.vencido
                          ? '—'
                          : prazo.dias > 0
                            ? `${prazo.dias}d ${prazo.horas}h`
                            : `${prazo.horas}h`}
                    </td>
                    <td>
                      <span className={pronto ? estilos.etapaPronta : estilos.etapa}>
                        {TEXTOS.etapas[envio.situacao]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className={estilos.nota}>{TEXTOS.nota}</p>
    </div>
  );
}
