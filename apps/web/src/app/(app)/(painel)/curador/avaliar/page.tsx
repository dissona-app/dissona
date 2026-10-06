import type { Metadata } from 'next';

import { BotaoLink } from '@dissona/nucleo/componentes/base/BotaoLink';
import { EstadoVazio } from '@dissona/nucleo/componentes/base/EstadoVazio';
import { Painel } from '@/componentes/base/Painel';
import { TabelaDoHistorico } from '@/componentes/curador/TabelaDoHistorico';
import type { LinhaDoHistorico } from '@/componentes/curador/TabelaDoHistorico';
import * as dinheiro from '@dissona/nucleo/lib/dinheiro';
import { formatarData, formatarNumero } from '@dissona/nucleo/lib/formato';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { lerHistorico } from '@/modulos/avaliacao/consultas';
import { PASSO_NO_INDICADOR, passoDoNumero } from '@dissona/nucleo/modulos/avaliacao/tipos';
import type { ItemDoHistorico } from '@dissona/nucleo/modulos/avaliacao/tipos';
import { AVALIAR, HISTORICO as TEXTOS } from '@dissona/nucleo/textos/avaliacao';

import estilos from './pagina.module.css';

export const metadata: Metadata = {
  title: 'Notas e feedback',
  robots: { index: false, follow: false },
};

/** A etapa do rascunho pelo nome da marca do indicador — o mesmo que o wizard mostra. */
function etapaDe(item: ItemDoHistorico): string {
  return AVALIAR.passos[PASSO_NO_INDICADOR[passoDoNumero(item.passoAtual)]] ?? '—';
}

function linha(item: ItemDoHistorico): LinhaDoHistorico {
  return {
    envioId: item.envioId,
    titulo: item.titulo,
    artista: item.artista,
    quando: item.concluida
      ? item.concluidaEm === null
        ? TEXTOS.semValor
        : formatarData(item.concluidaEm)
      : etapaDe(item),
    nota: item.notaSubjetiva === null ? TEXTOS.semValor : formatarNumero(item.notaSubjetiva),
    noPrazo: item.noPrazo,
    valor: item.valorCentavos === null ? TEXTOS.semValor : dinheiro.formatar(item.valorCentavos),
  };
}

/**
 * Notas e feedback — o histórico das avaliações do curador.
 *
 * A avaliação em si continua em `/curador/avaliar/<envio>`, aberta a partir da
 * fila; esta é a entrada que faltava para voltar a ela depois.
 */
export default async function PaginaDoHistorico() {
  const { emAndamento, entregues } = await lerHistorico();

  if (emAndamento.length === 0 && entregues.length === 0) {
    return (
      <Painel titulo={TEXTOS.titulo} sublegenda={TEXTOS.subtitulo}>
        <EstadoVazio
          titulo={TEXTOS.vazioTitulo}
          descricao={TEXTOS.vazioDescricao}
          acao={
            <BotaoLink href={ROTA.CURADOR_FILA} variante="secundario">
              {TEXTOS.irParaFila}
            </BotaoLink>
          }
        />
      </Painel>
    );
  }

  return (
    <div className={estilos.base}>
      <Painel
        titulo={TEXTOS.emAndamentoTitulo}
        sublegenda={TEXTOS.emAndamentoResumo(emAndamento.length)}
      >
        <TabelaDoHistorico
          tipo="em_andamento"
          linhas={emAndamento.map(linha)}
          vazio={<EstadoVazio titulo={TEXTOS.vazioEmAndamento} />}
        />
      </Painel>

      <Painel titulo={TEXTOS.entreguesTitulo} sublegenda={TEXTOS.entreguesResumo(entregues.length)}>
        <TabelaDoHistorico
          tipo="entregues"
          linhas={entregues.map(linha)}
          vazio={<EstadoVazio titulo={TEXTOS.vazioEntregues} />}
        />
      </Painel>
    </div>
  );
}
