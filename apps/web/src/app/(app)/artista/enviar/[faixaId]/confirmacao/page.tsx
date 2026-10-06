import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BotaoLink } from '@dissona/nucleo/componentes/base/BotaoLink';
import { Painel } from '@/componentes/base/Painel';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { buscar } from '@/modulos/faixa/repositorio';
import { ENVIAR } from '@dissona/nucleo/textos/prototipo';

import estilos from './pagina.module.css';

export const metadata: Metadata = {
  title: 'Envio concluído',
  robots: { index: false, follow: false },
};

/**
 * Confirmação do envio (3).
 *
 * ⚠️ **"Seu envio chegou"**, e não "Sua submissão chegou".
 *
 * É a única divergência em que o protótipo não vence: a terminologia decidida
 * é "Envios", nunca "Submissões" (PRD §9, arquitetura §8), e o guia de testes
 * manda corrigir. O protótipo erra em dois lugares — esta frase e o título do
 * cabeçalho (`enTitulos.ok = 'Submissão enviada'`) —, e os dois foram
 * corrigidos: o título desta rota é "Envio concluído".
 */
export default async function PaginaDaConfirmacao({
  params,
}: {
  readonly params: Promise<{ readonly faixaId: string }>;
}) {
  const { faixaId } = await params;

  const faixa = await buscar(faixaId);
  if (faixa === null) notFound();

  return (
    <div className={estilos.base}>
      <Painel titulo={ENVIAR.confirmacaoTitulo} sublegenda={ENVIAR.confirmacaoTexto}>
        <p className={estilos.faixa}>{faixa.titulo}</p>

        <div className={estilos.acoes}>
          <BotaoLink href={`${ROTA.ARTISTA_ENVIAR}/${faixaId}/status`}>
            {ENVIAR.acompanharStatus}
          </BotaoLink>
          <BotaoLink href={ROTA.ARTISTA_ENVIAR} variante="secundario">
            {ENVIAR.enviarOutra}
          </BotaoLink>
          <BotaoLink href={ROTA.ARTISTA} variante="ghost">
            {ENVIAR.voltarParaInicio}
          </BotaoLink>
        </div>
      </Painel>
    </div>
  );
}
