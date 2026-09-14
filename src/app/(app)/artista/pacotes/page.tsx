import type { Metadata } from 'next';

import * as dinheiro from '@/lib/dinheiro';
import { checkoutSimulado } from '@/modulos/claves/pagamento';
import { formatarDesconto, formatarQuantidade, temDesconto } from '@/modulos/pacote/formato';
import { lerVitrine } from '@/modulos/pacote/consultas';
import { PACOTES as TEXTOS } from '@/textos/prototipo';

import { TelaDePacotes } from './TelaDePacotes';

export const metadata: Metadata = {
  title: 'Comprar Claves',
  robots: { index: false, follow: false },
};

/**
 * 5.1 · Pacotes de Claves.
 *
 * Server Component: a tela inteira é leitura e links. O estado que o protótipo
 * guarda aqui — qual card está selecionado — não existe, porque "Escolher"
 * **navega** para o checkout em vez de trocar de `caView`. Seleção que não
 * sobrevive a um F5 não merece estado.
 *
 * Tudo desce formatado: `bigint` não atravessa a fronteira Server→Client, e
 * nenhum número de dinheiro deste produto é formatado fora de `lib/dinheiro`.
 */
export default async function PaginaDePacotes() {
  const { pacotes } = await lerVitrine();

  return (
    <TelaDePacotes
      simulado={checkoutSimulado()}
      pacotes={pacotes.map((pacote) => ({
        id: pacote.id,
        nome: pacote.nome,
        quantidade: formatarQuantidade(pacote.quantidade),
        preco: dinheiro.formatar(pacote.valor),
        // O desconto é o **derivado do valor**, e não a coluna: é o que o
        // artista vai pagar, e é o único dos dois com consequência.
        chamada: temDesconto(pacote.descontoDerivado)
          ? TEXTOS.comDesconto(formatarDesconto(pacote.descontoDerivado))
          : TEXTOS.semDesconto,
        porClave: temDesconto(pacote.descontoDerivado)
          ? TEXTOS.porClaveComEconomia(
              dinheiro.formatar(pacote.precoPorClave),
              dinheiro.formatar(pacote.economia),
            )
          : TEXTOS.porClave(dinheiro.formatar(pacote.precoPorClave)),
      }))}
    />
  );
}
