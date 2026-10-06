import { BotaoLink } from '@/componentes/base/BotaoLink';
import { Etiqueta } from '@/componentes/base/Etiqueta';
import { SeloClasse } from '@/componentes/base/SeloClasse';
import { ROTA } from '@/lib/guarda-rota';
import { SituacaoCurador } from '@/lib/papeis';
import type { ClasseCurador, SituacaoCurador as Situacao } from '@/modulos/curador/tipos';
import { CURADOR_MANUTENCAO } from '@/textos/curador';

import estilos from './CartaoDaClasse.module.css';

export type PropsCartaoDaClasse = {
  readonly classe: ClasseCurador;
  readonly situacao: Situacao;
};

/**
 * A classe, **somente leitura** (12.6).
 *
 * O PRD grifa duas coisas que este card existe para comunicar: a classe aparece
 * só em leitura, e alterar mídia não a altera. Sem dizer isso na tela, a pessoa
 * que acaba de mexer nas mídias fica sem saber se mexeu na classe — e a única
 * resposta disponível seria testar.
 *
 * Sem botão que prometa mudança: promover é decisão do admin (20.3), e a única
 * escrita possível é a RPC de conclusão do cadastro, que já rodou. O que há é
 * um link para a tela de classificação, que explica de onde a classe veio.
 */
export function CartaoDaClasse({ classe, situacao }: PropsCartaoDaClasse) {
  return (
    <section className={estilos.base} aria-label={CURADOR_MANUTENCAO.classeOverline}>
      <div className={estilos.textos}>
        <span className={estilos.overline}>{CURADOR_MANUTENCAO.classeOverline}</span>

        <div className={estilos.selos}>
          <SeloClasse classe={classe} />
          <Etiqueta
            tom={situacao === SituacaoCurador.PRATA_EM_ANALISE ? 'alerta' : 'sucesso'}
            dot={situacao === SituacaoCurador.PRATA_EM_ANALISE ? 'pendente' : 'sucesso'}
          >
            {CURADOR_MANUTENCAO.situacaoRotulo[situacao]}
          </Etiqueta>
        </div>

        <span className={estilos.nota}>{CURADOR_MANUTENCAO.classeNota}</span>
      </div>

      <BotaoLink href={ROTA.CURADOR_CADASTRO_CLASSIFICACAO} variante="secundario" tamanho="denso">
        {CURADOR_MANUTENCAO.verClassificacao}
      </BotaoLink>
    </section>
  );
}
