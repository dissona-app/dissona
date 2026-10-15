'use client';

import { useActionState, useEffect, useState } from 'react';

import { Aviso } from '@dissona/nucleo/componentes/base/Aviso';
import { Botao } from '@dissona/nucleo/componentes/base/Botao';
import type { ResultadoDeAcao } from '@dissona/nucleo/lib/acoes';
import { CodigoErro } from '@dissona/nucleo/lib/erros';
import type { CartaoSalvo } from '@/modulos/claves/consultas';
import { erroGeralDe } from '@dissona/nucleo/textos/erros';
import { CONTA } from '@dissona/nucleo/textos/conta';
import { CARTAO_SALVO as TEXTOS } from '@dissona/nucleo/textos/prototipo';

import { CartaoDeConta } from './CartaoDeConta';
import estilos from './CartaoSalvoNaConta.module.css';

export type PropsCartaoSalvoNaConta = {
  /** Nome da conta — a linha de baixo do rótulo, como no protótipo. */
  readonly nome: string;
  readonly cartao: CartaoSalvo | null;
  readonly acaoDeRemover: (dados: FormData) => Promise<ResultadoDeAcao>;
};

/**
 * "Dados de cobrança" do artista, com o cartão guardado dentro — protótipo
 * aprovado (Configurações).
 *
 * O protótipo põe "Gerenciar cobrança" no canto; a única gestão que existe é
 * remover o cartão, e é ela que ocupa o lugar. Guardar sem poder tirar seria
 * guardar sem consentimento revogável. O CPF do protótipo não aparece: ele
 * vai para o provedor a cada compra e não fica guardado na conta.
 */
export function CartaoSalvoNaConta({ nome, cartao, acaoDeRemover }: PropsCartaoSalvoNaConta) {
  const [resultado, remover, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => {
      const r = await acaoDeRemover(dados);
      // A revalidação da rota pode remontar esta parte da tela, e o estado da
      // ação iria junto; a marca na sessão do navegador sobrevive ao remount.
      if (r.ok) guardarRemovido();
      return r;
    },
    null,
  );
  const [removidoAgora, setRemovidoAgora] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (consumirRemovido()) setRemovidoAgora(true);
  }, [cartao]);

  const falha = resultado !== null && !resultado.ok ? resultado : null;
  const naoEncontrado = falha?.codigo === CodigoErro.NAO_ENCONTRADO;
  const erro = naoEncontrado ? TEXTOS.erroNaoEncontrado : erroGeralDe(falha, []);

  return (
    <CartaoDeConta
      overline={CONTA.financeiroPendente.artista.titulo}
      titulo={CONTA.financeiroPendente.artista.titulo}
      valor={nome}
      leve
      acao={
        cartao === null ? undefined : (
          <form action={remover}>
            <input type="hidden" name="cartaoId" value={cartao.id} />
            <Botao type="submit" variante="secundario" tamanho="sm" carregando={pendente}>
              {TEXTOS.remover}
            </Botao>
          </form>
        )
      }
    >
      {erro === undefined ? null : <Aviso tom="erro">{erro}</Aviso>}
      {(resultado !== null && resultado.ok) || removidoAgora ? (
        <Aviso tom="sucesso">{TEXTOS.removido}</Aviso>
      ) : null}

      {cartao === null ? (
        <p className={estilos.vazio}>{TEXTOS.vazioEmConta}</p>
      ) : (
        <div className={estilos.linha}>
          <span className={estilos.bandeira} aria-hidden="true">
            {cartao.bandeira ?? ''}
          </span>
          <span className={estilos.textos}>
            <span className={estilos.numero}>{TEXTOS.mascarado(cartao.ultimosDigitos)}</span>
            <span className={estilos.detalhe}>{cartao.bandeira ?? TEXTOS.tituloEmConta}</span>
          </span>
          <span className={estilos.padrao}>{TEXTOS.padrao}</span>
        </div>
      )}
    </CartaoDeConta>
  );
}

const CHAVE_REMOVIDO = 'dsn-cartao-removido';

function guardarRemovido(): void {
  try {
    window.sessionStorage.setItem(CHAVE_REMOVIDO, '1');
  } catch {
    // Sem storage, o aviso fica só no estado da ação.
  }
}

function consumirRemovido(): boolean {
  try {
    const havia = window.sessionStorage.getItem(CHAVE_REMOVIDO) === '1';
    if (havia) window.sessionStorage.removeItem(CHAVE_REMOVIDO);
    return havia;
  } catch {
    return false;
  }
}
