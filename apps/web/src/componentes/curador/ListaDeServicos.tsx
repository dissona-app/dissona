'use client';

import { useState } from 'react';

import type { ServicoDoCurador } from '@/modulos/curador/tipos';
import { CURADOR_CADASTRO } from '@/textos/curador';

import estilos from './passos/Passos.module.css';

export type PropsListaDeServicos = {
  readonly servicos: readonly ServicoDoCurador[];
};

/**
 * A lista de serviços com preço — os campos, sem o formulário em volta.
 *
 * Extraída porque duas telas a usam com rodapés diferentes: o passo 5 do
 * wizard (com Voltar / Avançar) e a manutenção de 12.6 (com Salvar). O que é
 * comum é a lista e as duas regras que ela carrega, e é isso que fica aqui.
 *
 * `feedback` é fixo: a caixa não desmarca e o preço é obrigatório. Não é
 * enfeite — `confirmar_selecao_curadores` (0010) exige um `servico_envio` de
 * feedback, e o trigger `proibir_remover_servico_feedback` recusa apagá-lo. Um
 * curador sem ele seria contratável e imediatamente inutilizável.
 *
 * Os opcionais alternam, e o preço deles fica `readOnly` em vez de `disabled`
 * quando desligados: campo desabilitado **não vai** no `FormData`, e o servidor
 * precisa receber o valor para preservá-lo quando a pessoa religar o serviço.
 */
export function ListaDeServicos({ servicos }: PropsListaDeServicos) {
  const precoSalvo = (tipo: string): string => {
    const servico = servicos.find((cada) => cada.tipo === tipo);
    return servico === undefined ? '' : String(servico.precoClaves);
  };

  const ativoSalvo = (tipo: string): boolean =>
    servicos.find((cada) => cada.tipo === tipo)?.ativo ?? false;

  const [ativos, setAtivos] = useState<Readonly<Record<string, boolean>>>(() =>
    Object.fromEntries(
      CURADOR_CADASTRO.servicos.map((servico) => [
        servico.valor,
        servico.obrigatorio || ativoSalvo(servico.valor),
      ]),
    ),
  );

  return (
    <ul className={estilos.cartoes}>
      {CURADOR_CADASTRO.servicos.map((servico) => {
        const ligado = servico.obrigatorio || ativos[servico.valor] === true;

        return (
          <li key={servico.valor} className={ligado ? estilos.cartaoAtivo : estilos.cartao}>
            <label className={estilos.cartaoRotulo}>
              <input
                type="checkbox"
                name={`servico_${servico.valor}`}
                className={estilos.caixaEscondida}
                defaultChecked={ligado}
                // O feedback é obrigatório: `readOnly` mantém a caixa marcada e
                // enviada, sem oferecer o clique que não teria efeito.
                readOnly={servico.obrigatorio}
                onChange={
                  servico.obrigatorio
                    ? undefined
                    : (evento) =>
                        setAtivos((atuais) => ({
                          ...atuais,
                          [servico.valor]: evento.target.checked,
                        }))
                }
              />
              <span className={estilos.caixa} aria-hidden="true">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  focusable="false"
                >
                  <path d="m5 13 4.5 4.5L19 7" />
                </svg>
              </span>
              <span className={estilos.cartaoTextos}>
                <span className={estilos.cartaoTitulo}>{servico.rotulo}</span>
                <span className={estilos.cartaoDescricao}>{servico.descricao}</span>
              </span>
            </label>

            <span className={estilos.preco}>
              <input
                type="text"
                inputMode="numeric"
                name={`preco_${servico.valor}`}
                className={estilos.precoEntrada}
                defaultValue={precoSalvo(servico.valor)}
                placeholder={ligado ? '0' : '—'}
                maxLength={3}
                readOnly={!ligado}
                aria-label={`Preço de ${servico.rotulo} em Claves`}
              />
              <span className={estilos.precoUnidade}>{CURADOR_CADASTRO.unidadeClaves}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
