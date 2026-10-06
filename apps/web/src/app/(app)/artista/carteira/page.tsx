import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import * as claves from '@dissona/nucleo/lib/claves';
import * as dinheiro from '@dissona/nucleo/lib/dinheiro';
import { formatarData } from '@dissona/nucleo/lib/formato';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { lerCarteira } from '@/modulos/claves/consultas';
import { CARTEIRA } from '@dissona/nucleo/textos/prototipo';

import { TelaDaCarteira } from './TelaDaCarteira';

export const metadata: Metadata = {
  title: 'Carteira',
  robots: { index: false, follow: false },
};

/**
 * 5 · Carteira.
 *
 * Formata tudo no servidor e entrega só `string` ao cliente: `bigint` não
 * atravessa a fronteira Server→Client (falha em runtime, não no typecheck), e
 * sem o número cru o cliente não tem como formatar dinheiro errado.
 */
export default async function PaginaDaCarteira() {
  const dados = await lerCarteira();

  // A guarda de rota já exige o papel `artista`; isto cobre a janela entre
  // trocar de papel e a navegação chegar aqui.
  if (dados === null) redirect(ROTA.ARTISTA);

  const { carteira, ultimas, valorDaClave } = dados;
  const emReais = claves.paraCentavos(carteira.disponivel, valorDaClave);

  return (
    <TelaDaCarteira
      saldo={claves.formatar(carteira.disponivel)}
      saldoNota={CARTEIRA.saldoNota(dinheiro.formatar(emReais), dinheiro.formatar(valorDaClave))}
      comprometido={claves.formatar(carteira.comprometido)}
      devolvido={claves.formatar(carteira.devolvido)}
      adquiridas={claves.formatar(carteira.adquiridas)}
      usadas={claves.formatar(carteira.usadas)}
      ultimas={ultimas.map((movimentacao) => ({
        id: String(movimentacao.id),
        data: formatarData(movimentacao.data),
        origem: movimentacao.origem,
        tipo: CARTEIRA.tipos[movimentacao.tipo],
        // O sinal é do dado, não da formatação: consumo aparece com "−".
        quantidade: claves.formatar(movimentacao.quantidade),
        entrada: movimentacao.quantidade > 0n,
      }))}
    />
  );
}
