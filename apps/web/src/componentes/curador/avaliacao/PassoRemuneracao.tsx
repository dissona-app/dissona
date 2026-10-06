import { Aviso } from '@dissona/nucleo/componentes/base/Aviso';
import { BotaoLink } from '@dissona/nucleo/componentes/base/BotaoLink';
import { Painel } from '@/componentes/base/Painel';
import { SeloClasse } from '@/componentes/base/SeloClasse';
import type { ResultadoDeAcao } from '@dissona/nucleo/lib/acoes';
import * as dinheiro from '@dissona/nucleo/lib/dinheiro';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import type { TelaDaRemuneracao } from '@/modulos/avaliacao/consultas';
import type { OpcionaisCumpridos } from '@dissona/nucleo/modulos/avaliacao/tipos';
import { opcionaisCumpridos } from '@/modulos/avaliacao/servico';
import { AVALIAR } from '@dissona/nucleo/textos/avaliacao';
import { FILA } from '@dissona/nucleo/textos/prototipo';

import { BotaoConcluir } from './BotaoConcluir';
import estilos from './PassoRemuneracao.module.css';

export type PropsPassoRemuneracao = {
  readonly tela: TelaDaRemuneracao;
  readonly voltarPara: string;
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
};

/** Os quatro opcionais na ordem em que `calcular_remuneracao` os soma. */
const ORDEM: readonly (keyof OpcionaisCumpridos)[] = [
  'onze_criterios',
  'justificativas_250',
  'feedback_150',
  'compartilhou',
];

/**
 * 14.4 · Remuneração e conclusão.
 *
 * ## O número desta tela é o número que vai ser pago
 *
 * A previsão vem de `calcular_remuneracao`, a **mesma** função que
 * `enviar_avaliacao` usa no passo 10 para gravar `ganho_curador`. Não há
 * reimplementação do cálculo em TypeScript — seria a origem clássica de "a tela
 * mostrou um valor e o extrato mostrou outro".
 *
 * Depois de concluída, o que aparece já não é previsão: é `ganho_curador`, que
 * congelou classe, prazo e percentuais do momento da entrega.
 *
 * ## A tabela é a do board
 *
 * Pela resposta do cliente à open-questions #5 (2026-09-16): piso em atraso,
 * piso no prazo e um teto só — Bronze no prazo sem opcionais recebe **38%**.
 * Com um teto só, ele é alcançável nas três classes, e a #5b deixou de existir.
 */
export function PassoRemuneracao({ tela, voltarPara, acao }: PropsPassoRemuneracao) {
  const { item, avaliacao, criterios, regras, remuneracao, classe } = tela;

  if (remuneracao === null) {
    return (
      <Aviso tom="alerta" estatico>
        {AVALIAR.erroInesperado}
      </Aviso>
    );
  }

  const cumpridos = opcionaisCumpridos(avaliacao, criterios, regras);
  const percentualPorChave = new Map(remuneracao.acrescimos.map((a) => [a.chave, a.percentual]));

  const rotuloDaClasse = AVALIAR.classes[classe];
  const escritos = (avaliacao.feedback ?? '').trim().length;

  return (
    <div className={estilos.base}>
      <Painel
        titulo={AVALIAR.tituloRemuneracao}
        nivel={3}
        acao={
          <span className={estilos.classe}>
            <span className={estilos.classeRotulo}>{AVALIAR.suaClasse}</span>
            <SeloClasse classe={classe} />
          </span>
        }
      >
        <div className={estilos.linha}>
          <span className={estilos.linhaTexto}>
            <span className={estilos.linhaRotulo}>
              {remuneracao.penalidadePrazo ? AVALIAR.pisoAtrasado : AVALIAR.pisoNoPrazo}
            </span>
            <span className={estilos.linhaApoio}>
              {remuneracao.penalidadePrazo
                ? AVALIAR.pisoNotaAtrasado(tela.tetoAtrasoPercentual)
                : AVALIAR.pisoNotaNoPrazo}
            </span>
          </span>
          <span className={estilos.percentual}>{remuneracao.pisoPercentual}%</span>
        </div>

        <ul className={estilos.acrescimos}>
          {ORDEM.map((chave) => {
            const cumprido = cumpridos[chave];
            const percentual = percentualPorChave.get(chave);

            return (
              <li key={chave} className={cumprido ? estilos.acrescimoAtivo : estilos.acrescimo}>
                <span className={estilos.marca} aria-hidden="true">
                  {cumprido ? '✓' : ''}
                </span>
                <span className={estilos.linhaTexto}>
                  <span className={estilos.linhaRotulo}>{rotuloDoAcrescimo(chave, tela)}</span>
                  <span className={estilos.linhaApoio}>
                    {detalheDoAcrescimo(chave, tela, escritos)}
                  </span>
                </span>
                <span className={estilos.percentual}>
                  {cumprido && percentual !== undefined
                    ? AVALIAR.acrescimoPercentual(percentual)
                    : AVALIAR.acrescimoAusente}
                </span>
              </li>
            );
          })}
        </ul>

        <p className={estilos.notaTeto}>
          {AVALIAR.tetoNota(rotuloDaClasse, remuneracao.tetoPercentual)}
        </p>
      </Painel>

      <Painel titulo={AVALIAR.voceRecebe} nivel={3}>
        <p className={estilos.valor}>{dinheiro.formatar(remuneracao.valorCentavos)}</p>
        <p className={estilos.valorNota}>
          {AVALIAR.valorNota(
            remuneracao.percentualAplicado,
            dinheiro.formatar(remuneracao.baseCentavos),
          )}
        </p>

        <dl className={estilos.resumo}>
          <div className={estilos.item}>
            <dt className={estilos.itemRotulo}>{AVALIAR.rotuloFaixa}</dt>
            <dd className={estilos.itemValor}>{item.titulo}</dd>
          </div>
          <div className={estilos.item}>
            <dt className={estilos.itemRotulo}>{AVALIAR.rotuloServico}</dt>
            <dd className={estilos.itemValor}>
              {tela.servicos.map((servico) => FILA.servicos[servico.tipo]).join(' + ') || '—'}
            </dd>
          </div>
          <div className={estilos.item}>
            <dt className={estilos.itemRotulo}>{AVALIAR.rotuloCompartilhamento}</dt>
            <dd className={estilos.itemValor}>{resumoDoCompartilhamento(tela)}</dd>
          </div>
        </dl>

        {avaliacao.concluida ? (
          <div className={estilos.concluida}>
            <Aviso tom="sucesso" titulo={AVALIAR.concluidaTitulo} estatico>
              {AVALIAR.concluidaNota(dinheiro.formatar(remuneracao.valorCentavos))}
            </Aviso>
            <BotaoLink href={ROTA.CURADOR_FILA} variante="secundario">
              {AVALIAR.voltarParaFila}
            </BotaoLink>
          </div>
        ) : (
          <BotaoConcluir
            envioId={item.envioId}
            escutaMinima={regras.escutaMinimaPercentual}
            escutaMedida={avaliacao.escutaPercentual}
            acao={acao}
          />
        )}
      </Painel>

      {/* O rodapé desta etapa só tem "Voltar": avançar **é** concluir, e
          concluir é o botão do painel acima. Dois caminhos para o mesmo ato
          dariam à etapa um "Avançar" que libera crédito sem dizer isso.
          Concluída, nem o "Voltar" faz sentido — as etapas anteriores estão
          fechadas pelo trigger `avaliacao_concluida_e_final`. */}
      {avaliacao.concluida ? null : (
        <div className={estilos.rodape}>
          <BotaoLink href={voltarPara} variante="neutro" tamanho="sm">
            {AVALIAR.voltar}
          </BotaoLink>
        </div>
      )}
    </div>
  );
}

function rotuloDoAcrescimo(chave: keyof OpcionaisCumpridos, tela: TelaDaRemuneracao): string {
  if (chave === 'onze_criterios') return AVALIAR.acrescimos.onze_criterios(tela.criterios.length);
  if (chave === 'justificativas_250') {
    return AVALIAR.acrescimos.justificativas_250(tela.regras.justificativaMinCaracteres);
  }
  if (chave === 'feedback_150') {
    return AVALIAR.acrescimos.feedback_150(tela.regras.feedbackMinCaracteres);
  }
  return AVALIAR.acrescimos.compartilhou;
}

function detalheDoAcrescimo(
  chave: keyof OpcionaisCumpridos,
  tela: TelaDaRemuneracao,
  feedbackEscritos: number,
): string {
  if (chave === 'onze_criterios') {
    return AVALIAR.detalheCriterios(tela.avaliacao.notas.length, tela.criterios.length);
  }
  if (chave === 'justificativas_250') {
    return AVALIAR.detalheJustificativas(tela.justificativasLongas);
  }
  if (chave === 'feedback_150') return AVALIAR.detalheFeedback(feedbackEscritos);

  const modalidade = tela.avaliacao.compartilhamento?.modalidade;
  if (modalidade === undefined || modalidade === 'nao_compartilhou') {
    return AVALIAR.detalheSemCompartilhamento;
  }
  return AVALIAR.modalidades[modalidade].rotulo;
}

function resumoDoCompartilhamento(tela: TelaDaRemuneracao): string {
  const modalidade = tela.avaliacao.compartilhamento?.modalidade;
  if (modalidade === undefined) return AVALIAR.compartilhamentoSemEscolha;
  if (modalidade === 'nao_compartilhou') return AVALIAR.compartilhamentoRecusado;
  if (modalidade === 'outros') {
    return tela.avaliacao.compartilhamento?.descricao ?? AVALIAR.modalidades.outros.rotulo;
  }
  return AVALIAR.modalidades[modalidade].rotulo;
}
