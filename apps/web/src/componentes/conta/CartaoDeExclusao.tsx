'use client';

import { useState } from 'react';

import { Botao } from '@dissona/nucleo/componentes/base/Botao';
import type { ResultadoDeAcao } from '@dissona/nucleo/lib/acoes';
import { CONTA } from '@dissona/nucleo/textos/prototipo';

import { CartaoDeConta } from './CartaoDeConta';
import { ExclusaoDeConta } from './ExclusaoDeConta';
import type { ArquivoDeExportacao } from './ExclusaoDeConta';

export type PropsCartaoDeExclusao = {
  readonly acaoDeExportar: () => Promise<ResultadoDeAcao<ArquivoDeExportacao>>;
  readonly acaoDeExcluir: (dados: FormData) => Promise<ResultadoDeAcao>;
};

/**
 * "Encerrar conta" — o card em moldura de erro que abre a exclusão em dois
 * passos.
 *
 * Sem aviso de sucesso: quando a exclusão dá certo, a ação encerra a sessão e
 * redireciona para a home. Não há tela de trás para avisar.
 */
export function CartaoDeExclusao({ acaoDeExportar, acaoDeExcluir }: PropsCartaoDeExclusao) {
  const [aberto, setAberto] = useState(false);

  return (
    <CartaoDeConta
      variante="perigo"
      overline={CONTA.encerrarContaTitulo}
      titulo={CONTA.excluirConta}
      nota={CONTA.excluirContaNota}
      acao={
        <Botao variante="perigoContorno" tamanho="denso" onClick={() => setAberto(true)}>
          {CONTA.excluirConta}
        </Botao>
      }
    >
      <ExclusaoDeConta
        aberto={aberto}
        onFechar={() => setAberto(false)}
        acaoDeExportar={acaoDeExportar}
        acaoDeExcluir={acaoDeExcluir}
      />
    </CartaoDeConta>
  );
}
