import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import * as dinheiro from '@/lib/dinheiro';
import { acompanharPix, comprarClaves } from '@/modulos/claves/acoes';
import { checkoutSimulado } from '@/modulos/claves/pagamento';
import { resumoDoPedido } from '@/modulos/claves/servico';
import { lerValorDaClave, buscarPacote } from '@/modulos/pacote/consultas';
import { formatarDesconto, formatarQuantidade, temDesconto } from '@/modulos/pacote/formato';
import { CHECKOUT as TEXTOS } from '@/textos/prototipo';

import { FormularioDeCheckout } from './FormularioDeCheckout';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

/**
 * 5.2 · Checkout.
 *
 * O resumo do pedido é **derivado aqui e gravado pela RPC**: `resumoDoPedido`
 * transcreve a aritmética de `criar_pedido_clave` para que a tela mostre
 * exatamente o que o banco vai congelar. Quem prende as duas é
 * `modulos/claves/__testes__/pedido.test.ts`.
 *
 * `notFound()` cobre três casos indistinguíveis: id inexistente, pacote
 * desativado e pacote excluído. Nenhum deles é comprável, e distingui-los
 * revelaria a existência de um pacote que saiu de circulação.
 */
export default async function PaginaDoCheckout({
  params,
}: {
  readonly params: Promise<{ readonly pacoteId: string }>;
}) {
  const { pacoteId } = await params;

  const [pacote, valorDaClave] = await Promise.all([buscarPacote(pacoteId), lerValorDaClave()]);
  if (pacote === null) notFound();

  const resumo = resumoDoPedido(pacote.quantidade, pacote.valor, valorDaClave);

  return (
    <FormularioDeCheckout
      pacoteId={pacote.id}
      simulado={checkoutSimulado()}
      acao={comprarClaves}
      acompanhar={acompanharPix}
      resumo={{
        quantidade: TEXTOS.quantidade(formatarQuantidade(resumo.quantidade)),
        bruto: dinheiro.formatar(resumo.bruto),
        desconto: temDesconto(resumo.descontoPercentual)
          ? TEXTOS.descontoValor(
              dinheiro.formatar(resumo.desconto),
              formatarDesconto(resumo.descontoPercentual),
            )
          : null,
        total: dinheiro.formatar(resumo.total),
        porClave: TEXTOS.porClave(dinheiro.formatar(resumo.precoPorClave)),
      }}
    />
  );
}
