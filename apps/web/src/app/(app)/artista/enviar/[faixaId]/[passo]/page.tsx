import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { FormularioDaFaixa } from '@/componentes/artista/FormularioDaFaixa';
import { FormularioDoContexto } from '@/componentes/artista/FormularioDoContexto';
import { MolduraDoEnvio } from '@/componentes/artista/MolduraDoEnvio';
import { Revisao } from '@/componentes/artista/Revisao';
import { Aviso } from '@dissona/nucleo/componentes/base/Aviso';
import * as claves from '@dissona/nucleo/lib/claves';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { lerCarteira } from '@/modulos/claves/consultas';
import { detectarFaixa, salvarContexto, salvarFaixa } from '@/modulos/faixa/acoes';
import { lerFaixaDoPasso, lerLimitesDeUpload } from '@/modulos/faixa/consultas';
import { ehPassoDoEnvio } from '@/modulos/faixa/tipos';
import { CARTEIRA, ENVIAR } from '@dissona/nucleo/textos/prototipo';

export const metadata: Metadata = {
  title: 'Enviar música',
  robots: { index: false, follow: false },
};

/**
 * 3 · Envio de música, passos 2 e 3.
 *
 * Uma rota, duas faces — o mesmo desenho do wizard do curador. O passo 1 mora
 * na raiz (`/artista/enviar`), porque lá ainda não há faixa; aqui ele existe
 * como destino do "Voltar" da revisão, e é por isso que `faixa` também é um
 * passo válido nesta rota.
 */
export default async function PaginaDoPasso({
  params,
}: {
  readonly params: Promise<{ readonly faixaId: string; readonly passo: string }>;
}) {
  const { faixaId, passo: bruto } = await params;

  // Passo inventado é 404, e não redirecionamento silencioso: a URL está
  // errada, e esconder isso dificultaria descobrir o erro.
  if (!ehPassoDoEnvio(bruto)) notFound();

  const estado = await lerFaixaDoPasso(faixaId, bruto);

  if (estado.estado === 'inexistente') notFound();

  // Já foi para curadoria: o trigger `faixa_conteudo_congelado_em_curadoria`
  // recusaria a escrita de qualquer forma. Melhor dizer por quê do que deixar
  // a pessoa preencher e levar um erro de banco no fim.
  if (estado.estado === 'em_curadoria') {
    return (
      <MolduraDoEnvio passo="revisao">
        <Aviso tom="alerta" estatico>
          {ENVIAR.erroFaixaEmCuradoria}
        </Aviso>
      </MolduraDoEnvio>
    );
  }

  // Adiantou-se no wizard — volta para onde ele de fato está.
  if (estado.estado === 'adiantado') {
    redirect(
      estado.ate === 'faixa'
        ? ROTA.ARTISTA_ENVIAR
        : `${ROTA.ARTISTA_ENVIAR}/${faixaId}/${estado.ate}`,
    );
  }

  const { faixa } = estado;

  if (bruto === 'faixa') {
    const limites = await lerLimitesDeUpload();
    return (
      <MolduraDoEnvio passo="faixa">
        <FormularioDaFaixa
          faixa={faixa}
          limites={limites}
          acao={salvarFaixa}
          detectar={detectarFaixa}
        />
      </MolduraDoEnvio>
    );
  }

  if (bruto === 'contexto') {
    return (
      <MolduraDoEnvio passo="contexto">
        <FormularioDoContexto faixa={faixa} acao={salvarContexto} />
      </MolduraDoEnvio>
    );
  }

  // O saldo entra no aviso da revisão — "o teto é o seu saldo, hoje X".
  // Formatado aqui, no servidor: `bigint` não atravessa a fronteira.
  const carteira = await lerCarteira();
  const saldo =
    carteira === null
      ? null
      : `${claves.formatar(carteira.carteira.disponivel)} ${CARTEIRA.saldoUnidade}`;

  return (
    <MolduraDoEnvio passo="revisao">
      <Revisao faixa={faixa} saldo={saldo} />
    </MolduraDoEnvio>
  );
}
