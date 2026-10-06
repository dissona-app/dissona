'use client';

import { useFormStatus } from 'react-dom';

import { Botao } from '@dissona/nucleo/componentes/base/Botao';
import { BotaoLink } from '@dissona/nucleo/componentes/base/BotaoLink';
import { AVALIAR } from '@dissona/nucleo/textos/avaliacao';

import estilos from './AcoesDaAvaliacao.module.css';

export type PropsAcoesDaAvaliacao = {
  /** Endereço da etapa anterior, ou `null` quando não há — 14 é a primeira. */
  readonly voltarPara: string | null;
  /** O último "Avançar" muda de nome: o destino é a conta, não outra pergunta. */
  readonly proximoEhRemuneracao: boolean;
};

/**
 * Rodapé das etapas 14 a 14.3: "Voltar" e "Avançar".
 *
 * ## "Voltar" é link, e não submit
 *
 * No wizard do cadastro (12) "Voltar" é um `type="submit"` com `formAction` e
 * `formNoValidate`, porque lá voltar **grava** o passo. Aqui não grava nada: o
 * progresso já foi persistido pela etapa anterior, e a única coisa que voltar
 * faz é mudar de endereço. Um `<a>` é o elemento certo para isso — abre em nova
 * aba, tem menu de contexto, e não é barrado pela validação do campo
 * obrigatório da etapa em que se está.
 *
 * `useFormStatus` desabilita o "Avançar" durante o envio. "Salvar e sair" fica
 * no cabeçalho, fora do formulário, e por isso não é alcançado por ele.
 */
export function AcoesDaAvaliacao({ voltarPara, proximoEhRemuneracao }: PropsAcoesDaAvaliacao) {
  const { pending } = useFormStatus();

  return (
    <div className={estilos.rodape}>
      {voltarPara === null ? (
        <span />
      ) : (
        <BotaoLink href={voltarPara} variante="neutro" tamanho="sm">
          {AVALIAR.voltar}
        </BotaoLink>
      )}

      <Botao type="submit" name="destino" value="avancar" tamanho="denso" carregando={pending}>
        {proximoEhRemuneracao ? AVALIAR.verRemuneracao : AVALIAR.avancar}
      </Botao>
    </div>
  );
}
