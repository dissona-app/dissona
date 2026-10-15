'use client';

import { Aviso } from '@dissona/nucleo/componentes/base/Aviso';
import { Botao } from '@dissona/nucleo/componentes/base/Botao';
import { BotaoLink } from '@dissona/nucleo/componentes/base/BotaoLink';
import { useAcaoDoFormulario } from '@dissona/nucleo/hooks/useAcaoDoFormulario';
import type { ResultadoDeAcao } from '@dissona/nucleo/lib/acoes';
import { CodigoErro } from '@dissona/nucleo/lib/erros';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import type { SelecaoNaUrl } from '@/modulos/selecao/tipos';
import { ENVIAR, SELECAO } from '@dissona/nucleo/textos/prototipo';

import estilos from './Revisao.module.css';

const MOTIVOS: Readonly<Record<string, string>> = {
  selecao_vazia: SELECAO.erroSelecaoVazia,
  saldo_insuficiente: SELECAO.erroSaldo,
  curador_invalido: SELECAO.erroCuradorInvalido,
  servico_feedback_obrigatorio: SELECAO.erroSemFeedback,
  faixa_situacao_invalida: SELECAO.erroFaixaInvalida,
};

export type PropsConfirmarEnvio = {
  readonly faixaId: string;
  readonly selecao: SelecaoNaUrl;
  /** "Voltar" leva de volta à seleção, com a escolha preservada. */
  readonly voltar: string;
  readonly nota: string;
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
};

/**
 * O rodapé da revisão: a nota do saldo e o "Enviar para curadoria".
 *
 * É aqui que as Claves saem — `confirmar_selecao_curadores` debita o ledger,
 * cria os envios e notifica, numa transação. A escolha chega da seleção pela
 * URL e vai à ação nos mesmos campos de antes (`curador`, `servico:<id>`).
 */
export function ConfirmarEnvio({ faixaId, selecao, voltar, nota, acao }: PropsConfirmarEnvio) {
  const [resultado, enviar, pendente, aoEnviar] = useAcaoDoFormulario<ResultadoDeAcao | null>(
    async (_anterior, dados) => acao(dados),
    null,
  );

  const falha = resultado !== null && !resultado.ok ? resultado : null;
  const motivo = falha?.detalhes?.['motivo'];
  const erro =
    falha === null
      ? null
      : ((typeof motivo === 'string' ? MOTIVOS[motivo] : undefined) ??
        MOTIVOS[falha.codigo] ??
        SELECAO.erroCuradorInvalido);

  return (
    <form action={enviar} onSubmit={aoEnviar} className={estilos.confirmacao} noValidate>
      <input type="hidden" name="faixaId" value={faixaId} />
      {Object.entries(selecao).map(([id, servicos]) => (
        <span key={id} hidden>
          <input type="hidden" name="curador" value={id} />
          {servicos.map((servico) => (
            <input key={servico} type="hidden" name={`servico:${id}`} value={servico} />
          ))}
        </span>
      ))}

      {erro !== null ? (
        <Aviso
          tom="erro"
          acao={
            /* O bloqueio por saldo é o único erro com saída fora da seleção. */
            falha?.codigo === CodigoErro.SALDO_INSUFICIENTE ? (
              <BotaoLink href={ROTA.ARTISTA_PACOTES} variante="secundario" tamanho="sm">
                {SELECAO.erroSaldoAcao}
              </BotaoLink>
            ) : undefined
          }
        >
          {erro}
        </Aviso>
      ) : null}

      {/* Protótipo aprovado: a nota do saldo discreta à esquerda e as ações
          à direita. */}
      <div className={estilos.rodape}>
        <p className={estilos.notaDoSaldo}>{nota}</p>
        <div className={estilos.acoes} data-botoes="caixa-alta">
          <BotaoLink href={voltar} variante="secundario">
            {ENVIAR.voltar}
          </BotaoLink>
          <Botao type="submit" carregando={pendente}>
            {ENVIAR.enviarParaCuradoria}
          </Botao>
        </div>
      </div>
    </form>
  );
}
