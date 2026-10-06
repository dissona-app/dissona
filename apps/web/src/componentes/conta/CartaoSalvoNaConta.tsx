'use client';

import { useActionState } from 'react';

import { Aviso } from '@dissona/nucleo/componentes/base/Aviso';
import { Botao } from '@dissona/nucleo/componentes/base/Botao';
import type { ResultadoDeAcao } from '@dissona/nucleo/lib/acoes';
import { CodigoErro } from '@dissona/nucleo/lib/erros';
import type { CartaoSalvo } from '@/modulos/claves/consultas';
import { erroGeralDe } from '@dissona/nucleo/textos/erros';
import { CARTAO_SALVO as TEXTOS } from '@dissona/nucleo/textos/prototipo';

import { CartaoDeConta } from './CartaoDeConta';
import estilos from './CartaoSalvoNaConta.module.css';

export type PropsCartaoSalvoNaConta = {
  readonly cartao: CartaoSalvo | null;
  readonly acaoDeRemover: (dados: FormData) => Promise<ResultadoDeAcao>;
};

/**
 * O cartão guardado, em Dados da conta (7.2).
 *
 * **Não está no protótipo**, e existe pela razão mais simples: guardar um meio
 * de pagamento sem oferecer como tirá-lo seria guardar sem consentimento
 * revogável. O bloco aparece mesmo vazio — é onde a pessoa vai procurar, e o
 * texto de vazio conta quando um cartão passa a existir.
 *
 * O que se mostra são quatro dígitos e a bandeira. O token nunca chega aqui: a
 * consulta não o traz, e a tela não teria o que fazer com ele.
 */
export function CartaoSalvoNaConta({ cartao, acaoDeRemover }: PropsCartaoSalvoNaConta) {
  const [resultado, remover, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acaoDeRemover(dados),
    null,
  );

  const falha = resultado !== null && !resultado.ok ? resultado : null;
  const naoEncontrado = falha?.codigo === CodigoErro.NAO_ENCONTRADO;
  const erro = naoEncontrado ? TEXTOS.erroNaoEncontrado : erroGeralDe(falha, []);

  return (
    <CartaoDeConta overline={TEXTOS.tituloEmConta} titulo={TEXTOS.tituloEmConta} nota={TEXTOS.nota}>
      {erro === undefined ? null : <Aviso tom="erro">{erro}</Aviso>}
      {resultado !== null && resultado.ok ? <Aviso tom="sucesso">{TEXTOS.removido}</Aviso> : null}

      {cartao === null ? (
        <p className={estilos.vazio}>{TEXTOS.vazioEmConta}</p>
      ) : (
        <form action={remover} className={estilos.linha}>
          <span className={estilos.identificacao}>
            {TEXTOS.opcao(cartao.bandeira, cartao.ultimosDigitos)}
          </span>
          <input type="hidden" name="cartaoId" value={cartao.id} />
          <Botao type="submit" variante="secundario" tamanho="sm" carregando={pendente}>
            {TEXTOS.remover}
          </Botao>
        </form>
      )}
    </CartaoDeConta>
  );
}
