import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { capaDoEnvio } from '@/componentes/curador/capas';
import { BotaoLink } from '@dissona/nucleo/componentes/base/BotaoLink';
import { EstadoVazio } from '@dissona/nucleo/componentes/base/EstadoVazio';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { lerMinhasFaixas, type FaixaNaLista } from '@/modulos/artista/consultas';
import { SITUACOES_DA_LISTA, type SituacaoNaLista } from '@/modulos/artista/servico';

import estilos from './pagina.module.css';

export const metadata: Metadata = {
  title: 'Minhas faixas',
  robots: { index: false, follow: false },
};

const ROTULO: Readonly<Record<SituacaoNaLista, string>> = {
  na_fila: 'Na fila',
  em_avaliacao: 'Em avaliação',
  atrasada: 'Atrasada',
  concluida: 'Concluída',
  devolvida: 'Devolvida',
};

const ABERTAS: ReadonlySet<SituacaoNaLista> = new Set(['na_fila', 'em_avaliacao', 'atrasada']);

/** A frase sob as barras do "Em andamento" — literais do protótipo aprovado. */
function fraseDaLeitura(faixa: FaixaNaLista): string {
  if (faixa.situacao === 'atrasada') return 'Um curador passou das 72h. Seguimos acompanhando.';
  if (faixa.etapa >= 2) return 'O curador ouviu e está avaliando';
  return 'Na fila do curador, aguardando a escuta';
}

const formatoDaMedia = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** 3.4 · Minhas faixas — protótipo aprovado. */
export default async function PaginaMinhasFaixas({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly status?: string }>;
}) {
  const [faixas, busca] = await Promise.all([lerMinhasFaixas(), searchParams]);
  if (faixas === null) redirect(ROTA.ARTISTA_ENTRAR);

  if (faixas.length === 0) {
    return (
      <EstadoVazio
        titulo="Nenhuma faixa enviada ainda"
        descricao="Quando você enviar uma faixa para curadoria, ela aparece aqui com a situação de cada leitura e as notas."
        acao={<BotaoLink href={ROTA.ARTISTA_ENVIAR}>Enviar faixa</BotaoLink>}
      />
    );
  }

  const filtro = (SITUACOES_DA_LISTA as readonly string[]).includes(busca.status ?? '')
    ? (busca.status as SituacaoNaLista)
    : null;
  const abertas = faixas.filter((faixa) => ABERTAS.has(faixa.situacao));
  const visiveis = filtro === null ? faixas : faixas.filter((faixa) => faixa.situacao === filtro);
  const contagem = (situacao: SituacaoNaLista) =>
    faixas.filter((faixa) => faixa.situacao === situacao).length;

  return (
    <div className={estilos.base}>
      {abertas.length > 0 ? (
        <section className={estilos.andamento} aria-labelledby="em-andamento">
          <div className={estilos.andamentoTopo}>
            <h2 id="em-andamento" className={estilos.sobretitulo}>
              Em andamento
            </h2>
            <span className={estilos.andamentoResumo}>
              {abertas.length} {abertas.length === 1 ? 'música' : 'músicas'} com leitura aberta
            </span>
          </div>
          <ul className={estilos.andamentoLista}>
            {abertas.map((faixa) => (
              <li key={faixa.id} className={estilos.andamentoLinha}>
                <span
                  className={estilos.miniCapa}
                  style={{ backgroundImage: `url('${capaDoEnvio(faixa.id)}')` }}
                  aria-hidden="true"
                />
                <span className={estilos.andamentoTextos}>
                  <span className={estilos.andamentoTitulo}>{faixa.titulo}</span>
                  <span className={estilos.andamentoApoio}>
                    {faixa.prontos} de {faixa.curadores}{' '}
                    {faixa.curadores === 1 ? 'curador' : 'curadores'} com feedback pronto
                  </span>
                </span>
                <span className={estilos.progresso}>
                  <span className={estilos.barras} aria-hidden="true">
                    {[1, 2, 3, 4].map((etapa) => (
                      <span
                        key={etapa}
                        className={etapa <= faixa.etapa ? estilos.barraAcesa : estilos.barra}
                        data-etapa={etapa}
                      />
                    ))}
                  </span>
                  <span
                    className={
                      faixa.situacao === 'atrasada' ? estilos.fraseAtrasada : estilos.frase
                    }
                  >
                    {fraseDaLeitura(faixa)}
                  </span>
                </span>
                <Link
                  className={estilos.acompanhar}
                  href={`${ROTA.ARTISTA_ENVIAR}/${faixa.id}/status`}
                >
                  Acompanhar status
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M9 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <nav className={estilos.abas} aria-label="Filtrar por situação">
        <Link
          href={ROTA.ARTISTA_FAIXAS}
          className={filtro === null ? estilos.abaAtiva : estilos.aba}
          aria-current={filtro === null ? 'page' : undefined}
        >
          Todas · {faixas.length}
        </Link>
        {SITUACOES_DA_LISTA.map((situacao) => (
          <Link
            key={situacao}
            href={`${ROTA.ARTISTA_FAIXAS}?status=${situacao}`}
            className={filtro === situacao ? estilos.abaAtiva : estilos.aba}
            aria-current={filtro === situacao ? 'page' : undefined}
          >
            {ROTULO[situacao]} · {contagem(situacao)}
          </Link>
        ))}
      </nav>

      {visiveis.length === 0 ? (
        <p className={estilos.vazio}>Nenhuma faixa nesta situação.</p>
      ) : (
        <ul className={estilos.grade}>
          {visiveis.map((faixa) => (
            <li key={faixa.id}>
              <Link className={estilos.cartao} href={`${ROTA.ARTISTA_ENVIAR}/${faixa.id}/status`}>
                <span className={estilos.palco}>
                  <span className={estilos.selo} data-situacao={faixa.situacao}>
                    {ROTULO[faixa.situacao]}
                  </span>
                  {faixa.situacao === 'concluida' && faixa.media !== null ? (
                    <span className={estilos.media} data-tom={faixa.media >= 8 ? 'alta' : 'baixa'}>
                      <strong>{formatoDaMedia.format(faixa.media)}</strong>
                      <span>Média NF</span>
                    </span>
                  ) : null}
                  <span className={estilos.disco} aria-hidden="true" />
                  <span
                    className={estilos.capa}
                    style={{ backgroundImage: `url('${capaDoEnvio(faixa.id)}')` }}
                    aria-hidden="true"
                  >
                    <span className={estilos.play}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </span>
                </span>
                <span className={estilos.textos}>
                  <span className={estilos.titulo}>{faixa.titulo}</span>
                  <span className={estilos.genero}>{faixa.genero ?? '—'}</span>
                  <span className={estilos.curadores}>
                    {faixa.curadores} {faixa.curadores === 1 ? 'curador' : 'curadores'}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className={estilos.nota}>Sem resposta no prazo, a Clave volta para a sua carteira.</p>
    </div>
  );
}
