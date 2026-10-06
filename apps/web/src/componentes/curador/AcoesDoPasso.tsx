'use client';

import { useFormStatus } from 'react-dom';

import { Botao } from '@dissona/nucleo/componentes/base/Botao';
import { CURADOR_CADASTRO } from '@dissona/nucleo/textos/curador';

import estilos from './AcoesDoPasso.module.css';

export type PropsAcoesDoPasso = {
  readonly passo: number;
  readonly ultimo: boolean;
  readonly podePular: boolean;
  readonly acaoDeVoltar: (dados: FormData) => void | Promise<void>;
  readonly acaoDePular: (dados: FormData) => void | Promise<void>;
  /**
   * Trava os três por algo que **não** é o envio do formulário.
   *
   * Hoje é o upload direto ao Storage, que acontece na escolha do arquivo:
   * `useFormStatus` não o enxerga, e sem isto dá para clicar em "Continuar" com
   * o upload no meio — o caminho ainda não está no campo escondido e o arquivo
   * já saiu, então o anexo se perderia em silêncio.
   */
  readonly ocupado?: boolean;
};

/**
 * Rodapé do wizard: "Voltar", "Pular" e "Continuar".
 *
 * ## Um formulário, três botões
 *
 * Os três são `type="submit"` do **mesmo** `<form>` — o do passo. "Voltar" e
 * "Pular" trocam o destino com `formAction`, que é o atributo que o HTML tem
 * exatamente para isto. A alternativa óbvia — um `<form>` por botão — é HTML
 * inválido dentro de outro `<form>`, e o navegador desfaz o aninhamento de um
 * jeito que ninguém escreveu.
 *
 * `formNoValidate` em "Voltar" e "Pular": sem ele, a validação nativa do
 * navegador barraria a saída de um passo com campo obrigatório vazio — e
 * "pular" existe justamente para sair sem preencher.
 *
 * `useFormStatus` em vez de `useActionState`: aqui só interessa "está
 * enviando?", para desabilitar os três juntos. Sem isso, um clique em "Pular"
 * durante o envio do "Continuar" gravaria e pularia o mesmo passo.
 */
export function AcoesDoPasso({
  passo,
  ultimo,
  podePular,
  acaoDeVoltar,
  acaoDePular,
  ocupado = false,
}: PropsAcoesDoPasso) {
  const { pending } = useFormStatus();
  const travado = pending || ocupado;

  return (
    <div className={estilos.rodape}>
      {/* O `passo` viaja num campo escondido porque "Voltar" e "Pular" são a
          mesma ação para os oito passos, e é ele que diz de onde saímos. */}
      <input type="hidden" name="passo" value={passo} />

      {/* `neutro`, e não `ghost`: no protótipo "Voltar" é cinza, e não roxo —
          ele desfaz, e desfazer não é convite. */}
      <Botao
        type="submit"
        variante="neutro"
        tamanho="sm"
        formAction={acaoDeVoltar}
        formNoValidate
        disabled={travado}
      >
        {passo <= 1 ? CURADOR_CADASTRO.voltarAoLogin : CURADOR_CADASTRO.voltar}
      </Botao>

      <div className={estilos.direita}>
        {/* "Pular" é o mesmo botão neutro de "Voltar" no protótipo, e não um
            secundário de 16 px com contorno roxo. */}
        {podePular ? (
          <Botao
            type="submit"
            variante="neutro"
            tamanho="sm"
            formAction={acaoDePular}
            formNoValidate
            disabled={travado}
          >
            {CURADOR_CADASTRO.pular}
          </Botao>
        ) : null}

        <Botao type="submit" tamanho="denso" carregando={travado}>
          {ultimo ? CURADOR_CADASTRO.enviarCadastro : CURADOR_CADASTRO.continuar}
        </Botao>
      </div>
    </div>
  );
}
