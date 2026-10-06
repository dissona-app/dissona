import Link from 'next/link';

import * as claves from '@dissona/nucleo/lib/claves';
import type { Claves } from '@dissona/nucleo/lib/claves';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { CARTEIRA, SALDO_NA_NAVEGACAO } from '@dissona/nucleo/textos/prototipo';

import estilos from '@dissona/nucleo/componentes/shell/Navegacao.module.css';

/**
 * Card de saldo no pé da sidebar do artista.
 *
 * O protótipo o mostra em **todas** as telas do app do artista: "Saldo", o
 * valor em Claves e o atalho "Comprar Claves". As classes já existiam em
 * `Navegacao.module.css` desde a R0 — o card foi desenhado e nunca ligado, e o
 * `Shell` tem a prop `rodapeNavegacao` esperando por ele.
 *
 * Importa o CSS da navegação de propósito: são estilos daquela sidebar, com as
 * cores do tema escuro dela, e duplicá-los criaria dois lugares para acertar a
 * mesma cor.
 */
export function CartaoDeSaldo({ disponivel }: { readonly disponivel: Claves }) {
  return (
    <div className={estilos.cartaoSaldo}>
      <span className={estilos.rotuloSaldo}>{SALDO_NA_NAVEGACAO.rotulo}</span>
      <span className={estilos.valorSaldo}>
        {claves.formatar(disponivel)} {CARTEIRA.saldoUnidade}
      </span>
      <Link className={estilos.comprar} href={ROTA.ARTISTA_PACOTES}>
        {CARTEIRA.comprar}
      </Link>
    </div>
  );
}
