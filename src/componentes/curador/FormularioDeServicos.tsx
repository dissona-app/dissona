'use client';

import { useActionState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Botao } from '@/componentes/base/Botao';
import type { ResultadoDeAcao } from '@/lib/acoes';
import type { ServicoDoCurador } from '@/modulos/curador/tipos';
import { CURADOR_CADASTRO, CURADOR_MANUTENCAO } from '@/textos/curador';

import { ListaDeServicos } from './ListaDeServicos';
import estilos from './FormularioDeServicos.module.css';

const MOTIVOS: Readonly<Record<string, string>> = {
  preco_feedback: CURADOR_CADASTRO.erroPrecoFeedback,
  preco_servicos: CURADOR_CADASTRO.erroPrecoServicos,
  preco_invalido: CURADOR_CADASTRO.erroPrecoServicos,
};

export type PropsFormularioDeServicos = {
  readonly servicos: readonly ServicoDoCurador[];
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
};

/**
 * Reedição de serviços e preços (12.6).
 *
 * Os campos são os do passo 5 e vivem em `ListaDeServicos`. O que muda é o fim:
 * aqui não há passo seguinte, então a tela salva no lugar e mostra o aviso. A
 * pessoa continua olhando os preços que acabou de mexer, o que é o ponto de uma
 * tela de manutenção.
 */
export function FormularioDeServicos({ servicos, acao }: PropsFormularioDeServicos) {
  const [resultado, enviar, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acao(dados),
    null,
  );

  const falhou = resultado !== null && !resultado.ok;
  const motivo = falhou ? resultado.detalhes?.['motivo'] : undefined;
  const erro = typeof motivo === 'string' ? MOTIVOS[motivo] : undefined;

  return (
    <form action={enviar} className={estilos.base} noValidate>
      <span className={estilos.overline}>{CURADOR_MANUTENCAO.servicosOverline}</span>

      {erro !== undefined ? (
        <Aviso tom="erro" titulo={erro}>
          {CURADOR_CADASTRO.notaClaves}
        </Aviso>
      ) : null}

      {resultado !== null && resultado.ok ? (
        <Aviso tom="sucesso">{CURADOR_MANUTENCAO.servicosSalvos}</Aviso>
      ) : null}

      <ListaDeServicos servicos={servicos} />

      <p className={estilos.nota}>{CURADOR_CADASTRO.notaClaves}</p>

      <div className={estilos.acoes}>
        <Botao type="submit" tamanho="denso" carregando={pendente}>
          {pendente ? CURADOR_MANUTENCAO.salvandoServicos : CURADOR_MANUTENCAO.salvarServicos}
        </Botao>
      </div>
    </form>
  );
}
