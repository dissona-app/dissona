import type { Metadata } from 'next';

import { TabelaDaFila } from '@/componentes/curador/TabelaDaFila';
import type { LinhaDaFila } from '@/componentes/curador/TabelaDaFila';
import { Abas } from '@/componentes/base/Abas';
import { EstadoVazio } from '@/componentes/base/EstadoVazio';
import { Painel } from '@/componentes/base/Painel';
import { ROTA } from '@/lib/guarda-rota';
import { lerFila } from '@/modulos/fila/consultas';
import { horasRestantes, statusNaTela } from '@/modulos/fila/servico';
import {
  STATUS_DA_FILA,
  ehOrdemDaFila,
  ehStatusDaFila,
  type ItemDaFila,
} from '@/modulos/fila/tipos';
import { FILA as TEXTOS } from '@/textos/prototipo';

import estilos from './pagina.module.css';
import { FiltroDeGenero } from './FiltroDeGenero';

export const metadata: Metadata = {
  title: 'Fila de avaliações',
  robots: { index: false, follow: false },
};

/**
 * Formato do prazo, literal de `filaPrazo` do protótipo.
 *
 * O texto muda de forma em três faixas — vencido, menos de um dia, e o resto —
 * e não é um "tempo relativo" genérico. Vive aqui e não em `lib/formato`
 * porque é copy desta tela.
 */
function formatarPrazo(item: ItemDaFila, agora: Date): string {
  const horas = horasRestantes(item, agora);

  if (horas < 0) {
    const vencidasHoras = Math.floor(-horas);
    const vencidasDias = Math.floor(vencidasHoras / 24);
    return vencidasDias >= 1
      ? TEXTOS.prazoVencidoDias(vencidasDias)
      : TEXTOS.prazoVencidoHoras(vencidasHoras);
  }

  if (horas < 24) return TEXTOS.prazoHoras(Math.floor(horas));

  return TEXTOS.prazoDias(Math.floor(horas / 24), Math.floor(horas % 24));
}

/** 13 · Fila de avaliações. */
export default async function PaginaDaFila({
  searchParams,
}: {
  readonly searchParams: Promise<{
    readonly status?: string;
    readonly genero?: string;
    readonly ordem?: string;
    readonly dir?: string;
  }>;
}) {
  const busca = await searchParams;

  const status = ehStatusDaFila(busca.status) ? busca.status : 'todas';
  const ordem = ehOrdemDaFila(busca.ordem) ? busca.ordem : 'prazo';
  const direcao = busca.dir === 'desc' ? 'desc' : 'asc';
  const genero = busca.genero !== undefined && busca.genero !== '' ? busca.genero : null;

  const { itens, totalNaFila, comPrazoCurto, generos, vazioPorFiltro, agora } = await lerFila(
    status,
    genero,
    ordem,
    direcao,
  );

  const linhas: readonly LinhaDaFila[] = itens.map((item) => ({
    envioId: item.envioId,
    titulo: item.titulo,
    artista: item.artista,
    genero: item.genero ?? '—',
    // A fila mostra o serviço-base; o detalhe (13.1) lista todos com o total.
    servico: TEXTOS.servicos.feedback,
    prazo: formatarPrazo(item, agora),
    status: statusNaTela(item, agora),
    urgente: horasRestantes(item, agora) < 24,
  }));

  return (
    <div className={estilos.base}>
      <div className={estilos.controles}>
        <Abas
          abas={STATUS_DA_FILA.map((chave) => ({ chave, rotulo: TEXTOS.filtros[chave] }))}
          ativa={status}
          caminho={ROTA.CURADOR_FILA}
          parametro="status"
          rotulo={TEXTOS.filtrosRotulo}
        />
        {generos.length > 0 ? <FiltroDeGenero generos={generos} atual={genero} /> : null}
      </div>

      <Painel titulo={TEXTOS.titulo} sublegenda={TEXTOS.resumo(totalNaFila, comPrazoCurto)}>
        <TabelaDaFila
          linhas={linhas}
          ordenadaPor={ordem}
          direcao={direcao}
          vazio={
            <EstadoVazio
              titulo={vazioPorFiltro ? TEXTOS.vazioTitulo : TEXTOS.vazioFilaTitulo}
              descricao={vazioPorFiltro ? TEXTOS.vazioDescricao : TEXTOS.vazioFilaDescricao}
            />
          }
        />
        <p className={estilos.nota}>{TEXTOS.nota}</p>
      </Painel>
    </div>
  );
}
