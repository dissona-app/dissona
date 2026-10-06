'use client';

import { useCallback, useState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Botao } from '@/componentes/base/Botao';
import type { ResultadoDeAcao } from '@/lib/acoes';

import { CartaoDeConta } from './CartaoDeConta';
import { ModalDeCredencial } from './ModalDeCredencial';
import type { TipoDeCredencial } from './ModalDeCredencial';

export type PropsCartaoDeCredencial = {
  readonly tipo: TipoDeCredencial;
  readonly overline: string;
  readonly titulo: string;
  /** Valor em destaque no lugar do título — o e-mail atual da conta. */
  readonly valor?: string;
  readonly nota: string;
  readonly rotuloDaAcao: string;
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
};

/**
 * O card que abre um dos dois modais de credencial e mostra o resultado.
 *
 * O aviso de sucesso vive **aqui**, e não dentro do modal: depois de trocar a
 * senha, o que a pessoa quer ver é a tela de segurança com a confirmação, não
 * um diálogo que ela precisa fechar para ler que deu certo. O modal fecha e
 * entrega a mensagem por `onSucesso`.
 *
 * O aviso não desaparece sozinho. Um `setTimeout` que o apaga rouba a
 * confirmação de quem foi ler outra coisa na tela e voltou — e o que o
 * substitui é a própria navegação: sair da aba e voltar já não o mostra.
 */
export function CartaoDeCredencial({
  tipo,
  overline,
  titulo,
  valor,
  nota,
  rotuloDaAcao,
  acao,
}: PropsCartaoDeCredencial) {
  const [aberto, setAberto] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // `useCallback` porque `ModalDeCredencial` tem estes dois nas dependências do
  // efeito que fecha no sucesso — recriá-los a cada render o dispararia em
  // laço.
  const fechar = useCallback(() => setAberto(false), []);
  const aoConcluir = useCallback((mensagem: string) => setSucesso(mensagem), []);

  return (
    <CartaoDeConta
      overline={overline}
      titulo={titulo}
      valor={valor}
      nota={nota}
      acao={
        <Botao variante="secundario" tamanho="sm" onClick={() => setAberto(true)}>
          {rotuloDaAcao}
        </Botao>
      }
    >
      {sucesso === null ? null : <Aviso tom="sucesso">{sucesso}</Aviso>}

      <ModalDeCredencial
        tipo={tipo}
        aberto={aberto}
        onFechar={fechar}
        acao={acao}
        onSucesso={aoConcluir}
      />
    </CartaoDeConta>
  );
}
